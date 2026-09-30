-- =============================================================================
-- Class of '77 reunion — initial schema (SPEC §16)
--
-- Security model (SPEC §12.2):
--   * Row Level Security is enabled on EVERY table.
--   * anon may read only public content: visible event items, visible lodging,
--     settings flagged is_public, and in-memoriam rows. Nothing personal.
--   * Personal data (attendees, registrations, guests, payments, refund flags)
--     has NO anon or authenticated policy except for admins; RSVPs are written
--     only by server code using the service role (Phase 3).
--   * Admins are authenticated Supabase users whose email is in admin_users.
--   * public_directory (the only anon window onto attendees) arrives in Phase 6.
-- =============================================================================

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------- enums ------
create type public.grad_school as enum ('crown', 'jacobs', 'other');
create type public.attendee_status as enum ('active', 'cancelled');
create type public.registration_status as enum (
  'confirmed', 'pending_payment', 'pending_offline', 'waitlist', 'cancelled'
);
create type public.payment_status as enum ('pending', 'paid', 'expired', 'refunded', 'offline');
create type public.yearbook_school as enum ('crown', 'jacobs');

-- -------------------------------------------------------------- helpers ------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------- settings ------
create table public.settings (
  key text primary key,
  value jsonb not null,
  -- Only public settings (deadline, flags, contact email, FAQ…) are readable by anon.
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------- admin_users ------
create table public.admin_users (
  email extensions.citext primary key,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so policies can consult admin_users without granting reads on it.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where email = (auth.jwt() ->> 'email')::extensions.citext
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------- event_items ------
create table public.event_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  day date not null,
  starts_at timestamptz,               -- null = time TBD (renders designed placeholder)
  ends_at timestamptz,
  title text not null,
  description_md text not null default '',
  location_name text,                  -- null = place TBD
  address text,
  address_confirmed boolean not null default false,
  choice_group text,                   -- items sharing a group are mutually exclusive
  requires_payment boolean not null default false,
  price_cents integer check (price_cents is null or price_cents >= 0),
  allows_guests boolean not null default true,
  capacity integer check (capacity is null or capacity > 0),
  confirmed boolean not null default false,
  -- Shown instead of the generic "To be confirmed" tag while confirmed = false.
  unconfirmed_note text,
  halftime_eligible boolean not null default false,
  visible boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index event_items_day_sort_idx on public.event_items (day, sort);

-- ------------------------------------------------------- yearbook books ------
create table public.yearbook_books (
  school public.yearbook_school primary key,
  title text not null,
  seniors_start_seq integer,
  seniors_end_seq integer,
  check (seniors_end_seq is null or seniors_start_seq is null or seniors_end_seq >= seniors_start_seq)
);

create table public.yearbook_pages (
  id uuid primary key default gen_random_uuid(),
  school public.yearbook_school not null references public.yearbook_books (school),
  seq integer not null check (seq > 0),
  page_label text,
  thumb_url text not null,
  display_url text not null,
  display_jpg_url text not null,
  zoom_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  hidden boolean not null default false,
  ocr_text text,
  ocr_tsv tsvector generated always as (to_tsvector('english', coalesce(ocr_text, ''))) stored,
  unique (school, seq)
);
create index yearbook_pages_ocr_idx on public.yearbook_pages using gin (ocr_tsv);

-- ------------------------------------------------------------ attendees ------
create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) > 0),
  hs_last_name text not null check (length(trim(hs_last_name)) > 0),
  current_last_name text,
  nickname text,
  email extensions.citext not null unique,
  phone text,
  city text,
  state text,
  grad_school public.grad_school not null,
  photo_path text,
  photo_hidden boolean not null default false,
  show_in_directory boolean not null default true,
  yearbook_page_id uuid references public.yearbook_pages (id) on delete set null,
  yearbook_crop jsonb,                 -- {x,y,w,h}, each 0–1
  then_photo_path text,
  edit_token_hash text not null unique,
  status public.attendee_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    yearbook_crop is null or (
      jsonb_typeof(yearbook_crop -> 'x') = 'number' and jsonb_typeof(yearbook_crop -> 'y') = 'number'
      and jsonb_typeof(yearbook_crop -> 'w') = 'number' and jsonb_typeof(yearbook_crop -> 'h') = 'number'
    )
  )
);

-- -------------------------------------------------------- registrations ------
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid not null references public.attendees (id) on delete cascade,
  event_item_id uuid not null references public.event_items (id) on delete restrict,
  guest_count integer not null default 0 check (guest_count between 0 and 4),
  halftime_walk boolean not null default false,
  status public.registration_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attendee_id, event_item_id)
);
create index registrations_event_item_idx on public.registrations (event_item_id, status);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  first_name text not null,
  last_name text not null
);
create index guests_registration_idx on public.guests (registration_id);

-- ------------------------------------------------------------- payments ------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  -- Kept (attendee_id nulled) when an attendee deletes their RSVP: accounting record (SPEC §12.2).
  attendee_id uuid references public.attendees (id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  amount_cents integer not null check (amount_cents >= 0),
  fee_cents integer not null default 0 check (fee_cents >= 0),
  status public.payment_status not null default 'pending',
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_attendee_idx on public.payments (attendee_id);

create table public.refund_flags (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid references public.attendees (id) on delete set null,
  registration_id uuid references public.registrations (id) on delete set null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- memoriam ------
create table public.memoriam (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grad_school public.grad_school not null,
  photo_path text,
  note text,
  sort integer not null default 0
);

-- -------------------------------------------------------------- lodging ------
create table public.lodging (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  phone text,
  is_official_block boolean not null default false,
  group_code text,
  booking_url text check (booking_url is null or booking_url ~* '^https?://'),
  rate_text text,
  cutoff_date date,
  drive_times_md text,
  photo_path text,
  notes_md text,
  visible boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------ updated_at hooks -----
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
create trigger event_items_updated_at before update on public.event_items
  for each row execute function public.set_updated_at();
create trigger attendees_updated_at before update on public.attendees
  for each row execute function public.set_updated_at();
create trigger registrations_updated_at before update on public.registrations
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger lodging_updated_at before update on public.lodging
  for each row execute function public.set_updated_at();

-- ================================================================ RLS ========
alter table public.settings        enable row level security;
alter table public.admin_users     enable row level security;
alter table public.event_items     enable row level security;
alter table public.yearbook_books  enable row level security;
alter table public.yearbook_pages  enable row level security;
alter table public.attendees       enable row level security;
alter table public.registrations   enable row level security;
alter table public.guests          enable row level security;
alter table public.payments        enable row level security;
alter table public.refund_flags    enable row level security;
alter table public.memoriam        enable row level security;
alter table public.lodging         enable row level security;

-- Belt and braces: anon has no table privileges at all on personal data.
revoke all on public.attendees, public.registrations, public.guests, public.payments,
  public.refund_flags, public.admin_users from anon;

-- Public content ------------------------------------------------------------
create policy "public reads visible event items" on public.event_items
  for select to anon, authenticated using (visible);
create policy "public reads visible lodging" on public.lodging
  for select to anon, authenticated using (visible);
create policy "public reads public settings" on public.settings
  for select to anon, authenticated using (is_public);
create policy "public reads memoriam" on public.memoriam
  for select to anon, authenticated using (true);
-- Yearbooks are read server-side behind the section gate (SPEC §12.1): no anon policy.

-- Admin: full access everywhere ---------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'settings', 'event_items', 'yearbook_books', 'yearbook_pages', 'attendees', 'registrations',
    'guests', 'payments', 'refund_flags', 'memoriam', 'lodging'
  ] loop
    execute format(
      'create policy "admins manage %1$s" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end
$$;
create policy "admins read admin list" on public.admin_users
  for select to authenticated using (public.is_admin());

-- ======================================================== keep-alive ========
-- Hit daily by /api/cron/keepalive so a free-tier project never pauses (SPEC §3).
create or replace function public.keepalive()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now(); $$;
grant execute on function public.keepalive() to anon, authenticated;
