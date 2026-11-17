-- Notifications sur iPhone (Apple Push Notification service, APNs) — à appliquer en production uniquement avec accord,
-- et seulement quand l'application iPhone sera prête (compte développeur Apple, clé APNs dans Vercel).
-- Garde : s'arrête sans rien modifier si koki_notification_claim a changé depuis le 17/11/2026.
--  1. public.koki_apns_devices : un jeton par iPhone (5 appareils par compte au plus), effacé avec le compte.
--     Aucun accès direct ; la table koki_push_subscriptions (notifications du site) n'est pas modifiée.
--  2. koki_apns_register / koki_apns_unregister : appelées par l'application pour le compte connecté.
--  3. koki_notification_claim : même fonction, plus une ligne qui prépare aussi les envois vers les iPhone
--     (canal « push », destination « apns:<id> »). Rien d'autre ne change.
-- Retour arrière : en fin de fichier.
begin;
do $g$ begin
 if (select md5(prosrc) from pg_proc where oid='public.koki_notification_claim(boolean,boolean)'::regprocedure)<>'4fdd5d443a35e18ce5e9f6a436697be7' then
  raise exception 'koki_notification_claim a changé : ne rien appliquer, prévenir Claude'; end if;
 if to_regclass('public.koki_apns_devices') is not null then raise exception 'Notifications iPhone déjà installées : rien à faire'; end if;
end $g$;

create table public.koki_apns_devices(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (token ~ '^[0-9a-f]{64,200}$'),
  created_at timestamptz not null default now()
);
create index koki_apns_devices_user on public.koki_apns_devices(user_id);
alter table public.koki_apns_devices enable row level security;
revoke all on public.koki_apns_devices from public, anon, authenticated;

create function public.koki_apns_register(p_token text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare actor uuid := (select auth.uid()); jeton text := lower(btrim(coalesce(p_token,'')));
begin
  if actor is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Connexion requise' using errcode='42501'; end if;
  if jeton !~ '^[0-9a-f]{64,200}$' then raise exception 'Jeton de notification invalide'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  -- Un iPhone passe à un autre compte : l'ancien compte ne reçoit plus rien sur cet appareil.
  delete from public.koki_apns_devices where token = jeton and user_id <> actor;
  if (select count(*) from public.koki_apns_devices where user_id = actor) >= 5
     and not exists(select 1 from public.koki_apns_devices where token = jeton) then raise exception 'Cinq appareils maximum.'; end if;
  insert into public.koki_apns_devices(user_id, token) values (actor, jeton) on conflict (token) do nothing;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.koki_apns_register(text) from public, anon;
grant execute on function public.koki_apns_register(text) to authenticated;

create function public.koki_apns_unregister(p_token text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null then raise exception 'Connexion requise' using errcode='42501'; end if;
  delete from public.koki_apns_devices where user_id = actor and token = lower(btrim(coalesce(p_token,'')));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.koki_apns_unregister(text) from public, anon;
grant execute on function public.koki_apns_unregister(text) to authenticated;

create or replace function public.koki_notification_claim(p_push boolean, p_sms boolean)
 returns setof public.koki_notification_deliveries
 language plpgsql security definer set search_path to ''
as $function$
begin
 -- Une invocation globale à la fois, y compris le calcul du plafond SMS.
 perform pg_advisory_xact_lock(hashtextextended('koki_notification_claim',0));
 update public.koki_notification_deliveries set state='failed',failure_code='delivery_unknown',completed_at=now() where state='processing' and processing_started_at<now()-interval '10 minutes';
 update public.koki_notification_deliveries set state='skipped',failure_code='expired',completed_at=now() where state='pending' and created_at<=now()-interval '1 day';
 if p_push then
  insert into public.koki_notification_deliveries(notification_id,channel,destination)
  select n.id,'push',s.id::text from public.koki_notifications n join public.koki_push_subscriptions s on s.user_id=n.recipient_id
  where n.created_at>now()-interval '1 day' and s.created_at<=n.created_at
  on conflict do nothing;
  -- iPhone (application) : même règle, destination préfixée « apns: ».
  insert into public.koki_notification_deliveries(notification_id,channel,destination)
  select n.id,'push','apns:'||d.id::text from public.koki_notifications n join public.koki_apns_devices d on d.user_id=n.recipient_id
  where n.created_at>now()-interval '1 day' and d.created_at<=n.created_at
  on conflict do nothing;
 end if;
 if p_sms then
  insert into public.koki_notification_deliveries(notification_id,channel,destination)
  select n.id,'sms',n.recipient_id::text from public.koki_notifications n join public.koki_notification_preferences p on p.user_id=n.recipient_id
  join auth.users u on u.id=n.recipient_id
  where n.created_at>now()-interval '1 day' and n.content_id is null and p.sms and p.updated_at<=n.created_at and u.phone_confirmed_at is not null and u.phone is not null
  on conflict do nothing;
 end if;
 -- Maximum 5 SMS/jour/compte. Les erreurs et résultats incertains comptent dans ce plafond.
 update public.koki_notification_deliveries d set state='skipped',completed_at=now()
 where d.id in (select id from (select id,row_number() over(partition by destination order by created_at,id) rank
 from public.koki_notification_deliveries where channel='sms' and created_at>=date_trunc('day',now())) x where rank>5) and d.state='pending';
 return query with batch as (
  select id from public.koki_notification_deliveries where state='pending' and created_at>now()-interval '1 day'
   and ((channel='push' and p_push) or (channel='sms' and p_sms)) order by created_at limit 20 for update skip locked
 ) update public.koki_notification_deliveries d set state='processing',processing_started_at=now() from batch where d.id=batch.id returning d.*;
end $function$;
commit;
-- Retour arrière (dans cet ordre) : recréer koki_notification_claim sans le bloc « iPhone » (copie ci-dessus, lignes
-- « iPhone (application) » retirées), puis :
-- drop function public.koki_apns_unregister(text);
-- drop function public.koki_apns_register(text);
-- drop table public.koki_apns_devices;
