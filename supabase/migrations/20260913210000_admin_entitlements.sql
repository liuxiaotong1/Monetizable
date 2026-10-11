-- Privileged app metadata is writable only through trusted administration.
create or replace function public.account_is_admin(p_user uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from auth.users where id=p_user
   and raw_app_meta_data->>'app_role'='admin' and email_confirmed_at is not null
   and deleted_at is null and (banned_until is null or banned_until<now()));
$$;
revoke all on function public.account_is_admin(uuid) from public,anon,authenticated;
grant execute on function public.account_is_admin(uuid) to service_role;

-- Entitlement only: do not fabricate or modify Stripe subscriptions.
create or replace function public.account_has_subscription(p_user uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select public.account_is_admin(p_user) or exists(select 1 from agent_subscriptions where user_id=p_user
 and status in ('active','trialing') and stripe_subscription_id like 'sub_%'
 and (current_period_end is null or current_period_end>now()));
$$;
