-- Disposable database only; test rows rolled back. À lancer après livres-autorisation-ecrite.sql.
begin;
do $$
declare
  f_ok text := 'aaaaaaaa-0000-4000-8000-000000000001/bbbbbbbb-0000-4000-8000-000000000001.pdf';
  f_ko text := 'aaaaaaaa-0000-4000-8000-000000000001/bbbbbbbb-0000-4000-8000-000000000002.pdf';
  id_ok uuid := gen_random_uuid();
  id_ko uuid := gen_random_uuid();
  auto jsonb := '{"type":"ecrite","detail":"Lettre de l''éditeur du 12/11/2026, réf. TEST-01","date":"2026-11-12"}';
begin
  -- 1. Contrat d'autorisation
  if koki_private.livre_autorise('{"schema":"koki.education.book"}') then raise exception 'sans autorisation accepté'; end if;
  if koki_private.livre_autorise('{"autorisation":{"type":"ecrite","detail":"Lettre éditeur OK","date":""}}') then raise exception 'écrite sans date acceptée'; end if;
  if koki_private.livre_autorise('{"autorisation":{"type":"oral","detail":"accord verbal donné","date":"2026-11-12"}}') then raise exception 'type inconnu accepté'; end if;
  if koki_private.livre_autorise('{"autorisation":{"type":"domaine_public","detail":"court"}}') then raise exception 'détail trop court accepté'; end if;
  if koki_private.livre_autorise('pas du json') then raise exception 'texte invalide accepté'; end if;
  if not koki_private.livre_autorise(jsonb_build_object('autorisation',auto)::text) then raise exception 'autorisation écrite refusée'; end if;
  if not koki_private.livre_autorise('{"autorisation":{"type":"domaine_public","detail":"Auteur décédé en 1900, œuvre libre"}}') then raise exception 'domaine public refusé'; end if;

  -- 2. Brouillon sans autorisation : enregistrable, fichier non public
  insert into public.koki_contents(id,type,titre,categorie,statut,publication,texte)
  values(id_ko,'Informations utiles','TEST sans autorisation','Éducation','brouillon',now()-interval '1 day',
    jsonb_build_object('schema','koki.education.book','acces','Gratuit','fichier',f_ko,'archive',false)::text);
  if koki_private.livre_gratuit_publie(f_ko) then raise exception 'brouillon public'; end if;

  -- 3. Publication sans autorisation : refusée
  begin
    update public.koki_contents set statut='publié' where id=id_ko;
    raise exception 'publication sans autorisation acceptée';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.koki_contents(id,type,titre,categorie,statut,publication,texte)
    values(gen_random_uuid(),'Informations utiles','TEST direct','Éducation','publié',now(),
      jsonb_build_object('schema','koki.education.book','acces','Gratuit','fichier',f_ko)::text);
    raise exception 'insertion publiée sans autorisation acceptée';
  exception when insufficient_privilege then null;
  end;

  -- 4. Publication avec autorisation écrite : acceptée et fichier public
  insert into public.koki_contents(id,type,titre,categorie,statut,publication,texte)
  values(id_ok,'Informations utiles','TEST autorisé','Éducation','publié',now()-interval '1 day',
    jsonb_build_object('schema','koki.education.book','acces','Gratuit','fichier',f_ok,'archive',false,'autorisation',auto)::text);
  if not koki_private.livre_gratuit_publie(f_ok) then raise exception 'livre autorisé non public'; end if;

  -- 5. Retirer l'autorisation d'un livre publié : refusé ; repasser en brouillon : accepté
  begin
    update public.koki_contents set texte=(texte::jsonb - 'autorisation')::text where id=id_ok;
    raise exception 'retrait d''autorisation sur livre publié accepté';
  exception when insufficient_privilege then null;
  end;
  update public.koki_contents set statut='brouillon' where id=id_ok;
  if koki_private.livre_gratuit_publie(f_ok) then raise exception 'brouillon encore public'; end if;

  -- 6. Livre payant ou papier sans fichier, et publications ordinaires : non concernés
  insert into public.koki_contents(id,type,titre,categorie,statut,publication,texte)
  values(gen_random_uuid(),'Informations utiles','TEST papier','Éducation','publié',now(),
    '{"schema":"koki.education.book","acces":"Payant","format":"Livre papier","fichier":""}');
  insert into public.koki_contents(id,type,titre,categorie,statut,publication,texte)
  values(gen_random_uuid(),'Actualités','TEST actualité','Éducation','publié',now(),'Texte libre { non JSON');
  raise notice 'livres-autorisation-ecrite : tous les contrôles réussis';
end$$;
rollback;
