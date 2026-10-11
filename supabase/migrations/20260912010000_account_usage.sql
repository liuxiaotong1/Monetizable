-- Account-wide, transactional usage. Browser state never grants entitlement.
create table public.account_usage_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('analysis','direction')),
  status text not null check (status in ('reserved','complete','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.account_usage_events enable row level security;
revoke all on public.account_usage_events from anon, authenticated;
grant all on public.account_usage_events to service_role;
create index account_usage_owner on public.account_usage_events(user_id,kind,status);
create table public.account_direction_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 capabilities text[] not null,
 updated_at timestamptz not null default now()
);
alter table public.account_direction_state enable row level security;
revoke all on public.account_direction_state from anon, authenticated;
grant all on public.account_direction_state to service_role;
insert into public.account_direction_state(user_id,capabilities)
select user_id,intent_capabilities from public.agent_onboarding where cardinality(intent_capabilities)>0;
insert into public.account_usage_events(id,user_id,kind,status)
select s.analysis_id,p.user_id,'analysis','complete' from public.candidate_scans s
join public.candidate_profiles p on p.id=s.candidate_profile_id
where p.user_id is not null on conflict do nothing;

create function public.account_has_subscription(p_user uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from agent_subscriptions where user_id=p_user
 and status in ('active','trialing') and stripe_subscription_id like 'sub_%'
 and (current_period_end is null or current_period_end>now()));
$$;

create function public.reserve_analysis(p_user uuid,p_id uuid) returns text
language plpgsql security definer set search_path=public as $$
declare e account_usage_events; n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into e from account_usage_events where id=p_id;
 if found and e.user_id<>p_user then return 'forbidden'; end if;
 if e.status='complete' then return 'complete'; end if;
 if e.status='reserved' and e.updated_at>now()-interval '10 minutes' then return 'processing'; end if;
 select count(*) into n from account_usage_events where user_id=p_user and kind='analysis'
 and (status='complete' or (status='reserved' and updated_at>now()-interval '10 minutes'));
 if n>=2 and not account_has_subscription(p_user) then return 'payment_required'; end if;
 insert into account_usage_events(id,user_id,kind,status) values(p_id,p_user,'analysis','reserved')
 on conflict(id) do update set status='reserved',updated_at=now();
 return 'reserved';
end $$;

create or replace function public.save_account_direction(p_user uuid,p_candidate uuid,p_index integer,p_capabilities text[]) returns jsonb
language plpgsql security definer set search_path=public as $$
declare old agent_onboarding; saved agent_onboarding; normalized text[]; previous text[]; n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if not exists(select 1 from candidate_profiles where id=p_candidate and user_id=p_user) then
 return jsonb_build_object('error','forbidden'); end if;
 select * into old from agent_onboarding where user_id=p_user;
 select array_agg(distinct lower(trim(x)) order by lower(trim(x))) into normalized from unnest(p_capabilities) x;
 select array_agg(distinct lower(trim(x)) order by lower(trim(x))) into previous
 from account_direction_state s cross join unnest(s.capabilities) x where s.user_id=p_user;
 if normalized is null then return jsonb_build_object('error','invalid_direction'); end if;
 if previous=normalized and old.candidate_profile_id=p_candidate
 and old.intent_capabilities @> p_capabilities and p_capabilities @> old.intent_capabilities
 then return jsonb_build_object('onboarding',to_jsonb(old)); end if;
 if previous is not null and previous is distinct from normalized then
   select count(*) into n from account_usage_events where user_id=p_user and kind='direction' and status='complete';
   if n>=2 and not account_has_subscription(p_user) then return jsonb_build_object('error','payment_required'); end if;
   insert into account_usage_events(id,user_id,kind,status) values(gen_random_uuid(),p_user,'direction','complete');
 end if;
 insert into account_direction_state(user_id,capabilities) values(p_user,normalized)
 on conflict(user_id) do update set capabilities=normalized,updated_at=now();
 update agent_jobs set status='skipped',error_code='agent_direction_updated',updated_at=now()
 where user_id=p_user and status in ('queued','running','awaiting_user_answer');
 update opportunity_matches set status='dismissed',analysis_cache_key='direction-reset:'||now()::text,updated_at=now()
 where user_id=p_user and status<>'dismissed';
 delete from market_topic_profiles where candidate_profile_id=p_candidate;
 insert into agent_onboarding(user_id,candidate_profile_id,intent_combination_index,intent_label,intent_capabilities,updated_at)
 values(p_user,p_candidate,p_index,array_to_string(p_capabilities,' × '),p_capabilities,now())
 on conflict(user_id) do update set candidate_profile_id=p_candidate,intent_combination_index=p_index,
 intent_label=excluded.intent_label,intent_capabilities=p_capabilities,cv_confirmed_at=null,completed_at=null,updated_at=now()
 returning * into saved;
 return jsonb_build_object('onboarding',to_jsonb(saved));
end $$;
revoke all on function public.account_has_subscription(uuid), public.reserve_analysis(uuid,uuid), public.save_account_direction(uuid,uuid,integer,text[]) from public,anon,authenticated;
grant execute on function public.account_has_subscription(uuid), public.reserve_analysis(uuid,uuid), public.save_account_direction(uuid,uuid,integer,text[]) to service_role;
