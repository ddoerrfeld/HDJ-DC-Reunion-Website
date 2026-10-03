-- =============================================================================
-- Phase 7: organizer admin (SPEC §11).
--
-- Sign-in is a one-time emailed link sent through the site's own email (Resend),
-- for addresses on the admin_users allowlist. The admin pages talk to the
-- database with the service role after checking the admin session on the
-- server; nothing here is reachable with the anon key.
-- =============================================================================

create table public.admin_login_tokens (
  token_hash text primary key,
  email extensions.citext not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.admin_login_tokens enable row level security;
revoke all on public.admin_login_tokens from anon, authenticated;

-- No payment processor (owner decision): organizers collect money themselves and
-- tick “paid” here. Drives the dashboard and the payment report.
alter table public.registrations add column paid_at timestamptz;

-- In Memoriam: optional years line (e.g. “1959–2019”).
alter table public.memoriam add column years text;

-- Public bucket for In Memoriam photos (written by the server after the admin check).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memoriam', 'memoriam', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

