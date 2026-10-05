-- =============================================================================
-- Phase 8: error monitoring. Server and browser errors are recorded here by the
-- site (service role) and summarized for the organizer in /admin. No personal
-- data: message, page path, route and a short stack only.
-- =============================================================================

create table public.error_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('server', 'client')),
  message text not null,
  digest text,
  path text,
  route text,
  detail text
);
create index error_log_created_idx on public.error_log (created_at desc);
alter table public.error_log enable row level security;
revoke all on public.error_log from anon, authenticated;
