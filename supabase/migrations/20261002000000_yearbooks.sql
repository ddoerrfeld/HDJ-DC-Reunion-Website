-- =============================================================================
-- Phase 5: yearbooks, classmate roster, "See Me in ’77".
--
-- Owner decision (2026-09-30): instead of a bot check (Turnstile) and a separate
-- yearbook passcode, an RSVP is matched against the senior-class roster read
-- from the yearbooks. A match is confirmed instantly; no match is saved as
-- "pending" and the organizer approves it with one click. Matched/approved
-- classmates (and anyone who passes the same name check on /yearbooks) can open
-- the yearbooks once the Stage B section gate is on.
-- =============================================================================

-- ------------------------------------------------------------- roster -------
create table public.classmates (
  id uuid primary key default gen_random_uuid(),
  school public.yearbook_school not null,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  -- Letters only, lower case: "O'Brien" / "O Brien" / "OBrien" all match.
  last_key text generated always as (lower(regexp_replace(last_name, '[^[:alpha:]]', '', 'g'))) stored,
  yearbook_page_id uuid references public.yearbook_pages (id) on delete set null,
  source text not null default 'ocr' check (source in ('ocr', 'manual')),
  created_at timestamptz not null default now(),
  unique (school, first_name, last_name)
);
create index classmates_last_key_idx on public.classmates (last_key);

alter table public.classmates enable row level security;
-- Names are read only by the server (service role); admins manage them in /admin.
revoke all on public.classmates from anon;
create policy "admins manage classmates" on public.classmates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------- attendee verification ----
create type public.classmate_status as enum ('matched', 'pending', 'approved');

alter table public.attendees
  add column classmate_status public.classmate_status not null default 'pending',
  add column classmate_id uuid references public.classmates (id) on delete set null;

-- Everyone who RSVP'd before the roster existed is treated as approved.
update public.attendees set classmate_status = 'approved';

-- Server-only setters (service role), like the other rsvp_* functions.
create or replace function public.rsvp_set_classmate(p_attendee_id uuid, p_status public.classmate_status, p_classmate_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.attendees
    set classmate_status = case
          -- A manual approval is never downgraded by a later edit.
          when classmate_status = 'approved' and p_status = 'pending' then classmate_status
          else p_status
        end,
        classmate_id = coalesce(p_classmate_id, classmate_id),
        updated_at = now()
    where id = p_attendee_id;
$$;

-- "See Me in ’77": page + normalized crop + rendered 512 px image path (or all null to clear).
create or replace function public.rsvp_set_yearbook_photo(p_attendee_id uuid, p_page_id uuid, p_crop jsonb, p_then_path text)
returns text  -- the previous then_photo_path, so the caller can delete the old file
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous text;
begin
  select then_photo_path into previous from public.attendees where id = p_attendee_id for update;
  update public.attendees
    set yearbook_page_id = p_page_id, yearbook_crop = p_crop, then_photo_path = p_then_path, updated_at = now()
    where id = p_attendee_id;
  return previous;
end;
$$;

revoke all on function public.rsvp_set_classmate(uuid, public.classmate_status, uuid) from public, anon, authenticated;
grant execute on function public.rsvp_set_classmate(uuid, public.classmate_status, uuid) to service_role;
revoke all on function public.rsvp_set_yearbook_photo(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.rsvp_set_yearbook_photo(uuid, uuid, jsonb, text) to service_role;
