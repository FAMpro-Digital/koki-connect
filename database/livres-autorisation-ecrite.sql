-- Bibliothèque : aucun livre téléchargeable sans droit de diffusion enregistré (règles Google Play et Apple sur la propriété intellectuelle).
-- À appliquer en production uniquement avec l'accord écrit du propriétaire. Ne supprime aucune donnée.
--  1. koki_private.livre_autorise(texte) : vrai seulement si la fiche livre (contrat koki.education.book) porte un champ
--     "autorisation" valide :
--       {"type": "ecrite" | "domaine_public" | "licence_libre",
--        "detail": "au moins 10 caractères (ex. : Lettre de l'éditeur X du 12/11/2026, réf. 2026-04)",
--        "date": "AAAA-MM-JJ" (obligatoire pour "ecrite")}
--  2. koki_private.livre_gratuit_publie(path) : reprend la fonction actuelle et exige en plus livre_autorise.
--     Sans autorisation enregistrée, le fichier du bucket privé koki-livres n'est plus lisible par le public.
--  3. Déclencheur koki_contents_livre_autorisation : refuse d'enregistrer au statut « publié » une fiche livre qui a un
--     fichier sans autorisation valide (message clair pour l'Admin). Les fiches sans fichier (payant, papier) et les
--     autres publications ne sont pas concernées. Les brouillons restent enregistrables.
-- Effet attendu à l'application (18 nov. 2026) : les deux livres existants sont en brouillon, aucun n'est bloqué.
-- Conséquence : tant que le formulaire Koki Connect Admin ne propose pas le champ « autorisation », aucun livre avec
-- fichier ne peut être publié. C'est voulu (blocage par défaut).
-- Retour arrière : en fin de fichier.

create or replace function koki_private.livre_autorise(p_texte text)
returns boolean
language plpgsql
immutable
set search_path to ''
as $function$
declare v jsonb; a jsonb;
begin
  begin v := p_texte::jsonb; exception when others then return false; end;
  if jsonb_typeof(v) <> 'object' then return false; end if;
  a := v->'autorisation';
  if a is null or jsonb_typeof(a) <> 'object' then return false; end if;
  if coalesce(a->>'type','') not in ('ecrite','domaine_public','licence_libre') then return false; end if;
  if char_length(btrim(coalesce(a->>'detail',''))) < 10 then return false; end if;
  if a->>'type' = 'ecrite' and coalesce(a->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  return true;
end
$function$;

create or replace function koki_private.livre_gratuit_publie(path text)
returns boolean
language plpgsql
stable security definer
set search_path to ''
as $function$
declare r record;v jsonb;
begin
 if path is null or path !~ '^[a-f0-9-]+/[a-f0-9-]+\.(pdf|epub|mp3|m4a)$' then return false;end if;
 for r in select c.texte from public.koki_contents c
   where c.type='Informations utiles' and c.categorie='Éducation' and c.statut='publié' and c.publication<=now() and strpos(c.texte,path)>0
 loop
  begin v:=r.texte::jsonb;exception when others then continue;end;
  if v->>'schema'='koki.education.book' and v->>'acces'='Gratuit' and coalesce(v->>'archive','false')='false' and v->>'fichier'=path
     and koki_private.livre_autorise(r.texte) then return true;end if;
 end loop;
 return false;
end $function$;

create or replace function koki_private.livre_publication_controle()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare v jsonb;
begin
  if new.statut is distinct from 'publié' or new.texte is null or left(btrim(new.texte),1) <> '{' then return new; end if;
  begin v := new.texte::jsonb; exception when others then return new; end;
  if jsonb_typeof(v) <> 'object' or v->>'schema' is distinct from 'koki.education.book' then return new; end if;
  if char_length(btrim(coalesce(v->>'fichier',''))) = 0 then return new; end if;
  if not koki_private.livre_autorise(new.texte) then
    raise exception 'Livre non publiable : enregistrez d’abord l’autorisation de diffusion (autorisation écrite de l’éditeur ou de l’auteur, domaine public ou licence libre). La fiche peut rester en brouillon.'
      using errcode = '42501';
  end if;
  return new;
end
$function$;

revoke all on function koki_private.livre_publication_controle() from public, anon, authenticated;

drop trigger if exists koki_contents_livre_autorisation on public.koki_contents;
create trigger koki_contents_livre_autorisation
  before insert or update on public.koki_contents
  for each row execute function koki_private.livre_publication_controle();

-- Contrôle après application (lecture seule) : doit renvoyer 0 ligne.
-- select titre from public.koki_contents
--  where statut='publié' and texte like '{%' and texte::jsonb->>'schema'='koki.education.book'
--    and coalesce(texte::jsonb->>'fichier','')<>'' and not koki_private.livre_autorise(texte);

-- Retour arrière (rétablit exactement l'état du 18 nov. 2026) :
-- drop trigger if exists koki_contents_livre_autorisation on public.koki_contents;
-- drop function if exists koki_private.livre_publication_controle();
-- create or replace function koki_private.livre_gratuit_publie(path text) returns boolean language plpgsql stable security definer set search_path to '' as $f$
-- declare r record;v jsonb;
-- begin
--  if path is null or path !~ '^[a-f0-9-]+/[a-f0-9-]+\.(pdf|epub|mp3|m4a)$' then return false;end if;
--  for r in select c.texte from public.koki_contents c
--    where c.type='Informations utiles' and c.categorie='Éducation' and c.statut='publié' and c.publication<=now() and strpos(c.texte,path)>0
--  loop
--   begin v:=r.texte::jsonb;exception when others then continue;end;
--   if v->>'schema'='koki.education.book' and v->>'acces'='Gratuit' and coalesce(v->>'archive','false')='false' and v->>'fichier'=path then return true;end if;
--  end loop;
--  return false;
-- end $f$;
-- drop function if exists koki_private.livre_autorise(text);
