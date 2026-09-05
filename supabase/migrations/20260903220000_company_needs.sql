create table if not exists public.company_needs (
  id uuid primary key default gen_random_uuid(),
  need text not null,
  success_outcome text not null,
  expertise text[] not null default '{}',
  expertise_other text,
  engagement_type text not null check (engagement_type in ('One-off project','Freelance / ongoing','Consulting','Fractional','Full-time','I''m not sure')),
  budget_range text not null,
  location_timezone text not null,
  work_email text not null,
  status text not null default 'open' check (status in ('open','closed')),
  matched_candidate_count integer not null default 0 check (matched_candidate_count >= 0),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_needs enable row level security;
create index if not exists company_needs_open_notification_idx on public.company_needs (status, notified_at) where status = 'open';
create index if not exists company_needs_created_at_idx on public.company_needs (created_at desc);
comment on table public.company_needs is 'B2B capability requests submitted through the public For Companies form. Server-only service-role access.';
