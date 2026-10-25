-- Vérifications transactionnelles : toutes les données fictives sont annulées.
begin;
select set_config('koki.test_user',gen_random_uuid()::text,true),set_config('koki.test_other',gen_random_uuid()::text,true),set_config('koki.test_content',gen_random_uuid()::text,true),set_config('koki.test_draft',gen_random_uuid()::text,true);
insert into auth.users(id,is_anonymous) values(current_setting('koki.test_user')::uuid,false),(current_setting('koki.test_other')::uuid,false);
insert into public.koki_contents(id,type,titre,resume,texte,statut,publication) values(current_setting('koki.test_content')::uuid,'Actualités','TEST transaction annulée','TEST','Texte complet','publié',now()),(current_setting('koki.test_draft')::uuid,'Actualités','TEST brouillon','TEST','','brouillon',now());
set local role anon;
do $$ begin
 if (public.koki_content_social(current_setting('koki.test_content')::uuid)->>'likes')::int<>0 then raise exception 'initial count'; end if;
 begin perform public.koki_content_social(current_setting('koki.test_content')::uuid,'like',null,null,true);raise exception 'anonymous write allowed';exception when insufficient_privilege then null;end;
 begin perform * from koki_social_private.comments;raise exception 'private data readable';exception when insufficient_privilege then null;end;
 begin perform public.koki_content_social(current_setting('koki.test_draft')::uuid);raise exception 'draft readable';exception when raise_exception then if sqlerrm<>'Publication indisponible' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('koki.test_user'),true);
set local role authenticated;
do $$ declare c uuid:=current_setting('koki.test_content')::uuid; r jsonb; begin
 perform public.koki_content_social(c,'like',null,null,true);r:=public.koki_content_social(c,'like',null,null,true);
 if (r->>'likes')::int<>1 or not (r->>'liked')::boolean then raise exception 'duplicate like';end if;
 r:=public.koki_content_social(c,'comment','<img src=x onerror=alert(1)>');
 if not (r->'comments'->0->>'mine')::boolean or (r->'comments'->0 ? 'user_id') then raise exception 'ownership or privacy';end if;
 perform set_config('koki.test_comment',r->'comments'->0->>'id',true);
 begin perform public.koki_content_social(c,'comment',' ');raise exception 'empty comment accepted';exception when raise_exception then if sqlerrm not like 'Commentaire requis%' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('koki.test_other'),true);
set local role authenticated;
do $$ declare r jsonb;begin
 r:=public.koki_content_social(current_setting('koki.test_content')::uuid,'delete',null,current_setting('koki.test_comment')::uuid);
 if (r->>'total')::int<>1 or (r->'comments'->0->>'mine')::boolean then raise exception 'other user deletion';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('koki.test_user'),true);
set local role authenticated;
do $$ declare c uuid:=current_setting('koki.test_content')::uuid;r jsonb;begin
 for i in 1..4 loop perform public.koki_content_social(c,'comment','Test '||i);end loop;
 begin perform public.koki_content_social(c,'comment','Too many');raise exception 'limit absent';exception when raise_exception then if sqlerrm not like 'Trop de commentaires%' then raise;end if;end;
 r:=public.koki_content_social(c,'delete',null,current_setting('koki.test_comment')::uuid);
 if (r->>'total')::int<>4 then raise exception 'own deletion failed';end if;
 r:=public.koki_content_social(c,'like',null,null,false);
 if (r->>'likes')::int<>0 then raise exception 'unlike failed';end if;
end $$;
reset role;
rollback;
select 'Permissions, confidentialité, unicité, suppression et limites vérifiées ; données fictives annulées.' as result;
