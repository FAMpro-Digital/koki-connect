-- Disposable database only; test rows rolled back.
begin;
select set_config('koki.test_user',gen_random_uuid()::text,true),set_config('koki.test_other',gen_random_uuid()::text,true),set_config('koki.test_content',gen_random_uuid()::text,true);
insert into auth.users(id,is_anonymous) values(current_setting('koki.test_user')::uuid,false),(current_setting('koki.test_other')::uuid,false);
insert into public.koki_contents(id,type,titre,resume,texte,statut,publication) values(current_setting('koki.test_content')::uuid,'Actualités','TEST rollback','Test','Test','publié',now());
insert into koki_social_private.comments(content_id,user_id,body) values(current_setting('koki.test_content')::uuid,current_setting('koki.test_other')::uuid,'Commentaire A'),(current_setting('koki.test_content')::uuid,current_setting('koki.test_other')::uuid,'Commentaire B');
select set_config('koki.test_comment',(select id::text from koki_social_private.comments where content_id=current_setting('koki.test_content')::uuid limit 1),true);
set local role anon;
do $$begin
 begin perform public.koki_content_social(current_setting('koki.test_content')::uuid,'block',null,current_setting('koki.test_comment')::uuid);raise exception 'anonymous block allowed';exception when insufficient_privilege then null;end;
 begin perform * from koki_social_private.blocks;raise exception 'private blocks exposed';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('koki.test_user'),true);
set local role authenticated;
do $$declare r jsonb; c uuid:=current_setting('koki.test_content')::uuid;begin
 r:=public.koki_content_social(c,'block',null,current_setting('koki.test_comment')::uuid);
 if (r->>'total')::int<>0 or jsonb_array_length(r->'comments')<>0 or (r->>'blocked_count')::int<>1 then raise exception 'block filtering failed';end if;
 r:=public.koki_content_social(c,'block',null,current_setting('koki.test_comment')::uuid);
 if (r->>'blocked_count')::int<>1 then raise exception 'duplicate blocking';end if;
 perform set_config('request.jwt.claim.sub',current_setting('koki.test_other'),true);
 r:=public.koki_content_social(c);
 if (r->>'total')::int<>2 or (r->>'blocked_count')::int<>0 then raise exception 'other account affected';end if;
 perform public.koki_content_social(c,'unblock_all');
 perform set_config('request.jwt.claim.sub',current_setting('koki.test_user'),true);
 r:=public.koki_content_social(c);
 if (r->>'total')::int<>0 then raise exception 'other account unblocked my list';end if;
 r:=public.koki_content_social(c,'unblock_all');
 if (r->>'total')::int<>2 or (r->>'blocked_count')::int<>0 then raise exception 'unblock failed';end if;
 if (r->'comments'->0) ? 'user_id' then raise exception 'author id exposed';end if;
end$$;
rollback;
