create table public.account_application_clicks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null,
  created_at timestamptz not null default now()
);
create index account_application_clicks_owner on public.account_application_clicks(user_id);
alter table public.account_application_clicks enable row level security;
revoke all on public.account_application_clicks from public, anon, authenticated;
grant all on public.account_application_clicks to service_role;

create function public.consume_application_click(p_user uuid, p_id uuid, p_match uuid) returns text
language plpgsql security definer set search_path=public as $$
declare previous account_application_clicks;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select * into previous from account_application_clicks where id=p_id;
  if found then
    if previous.user_id=p_user and previous.match_id=p_match then return 'allowed'; end if;
    return 'forbidden';
  end if;
  if (select count(*) from account_application_clicks where user_id=p_user)>=2
     and not account_has_subscription(p_user) then return 'payment_required'; end if;
  insert into account_application_clicks(id,user_id,match_id) values(p_id,p_user,p_match);
  return 'allowed';
end $$;
revoke all on function public.consume_application_click(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.consume_application_click(uuid,uuid,uuid) to service_role;
