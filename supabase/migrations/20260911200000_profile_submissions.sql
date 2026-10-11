-- Private intake ledger: uploaded sources survive an AI/search failure.
create table if not exists public.profile_submissions (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  candidate_profile_id uuid references public.candidate_profiles(id) on delete cascade,
  claim_token_hash text not null,
  linkedin_url text,
  manual_text text,
  request_context jsonb not null default '{}',
  preserved_evidence jsonb not null default '[]',
  locale text not null default 'en',
  raw_cv_bucket text,
  raw_cv_path text,
  raw_cv_filename text,
  raw_cv_mime_type text,
  raw_cv_size_bytes bigint,
  consent_version text not null,
  status text not null default 'received' check (status in ('received','processing','complete','failed')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retention_until timestamptz not null
);
create index if not exists profile_submissions_owner on public.profile_submissions(user_id, created_at desc);
alter table public.profile_submissions enable row level security;
revoke all on public.profile_submissions from anon, authenticated;
grant all on public.profile_submissions to service_role;
comment on table public.profile_submissions is 'Private, consented source inputs. id is the analysis id. Service-role access only; server checks account or claim-token ownership.';
