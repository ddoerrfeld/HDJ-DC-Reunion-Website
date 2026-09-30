-- =============================================================================
-- Phase 3: RSVP (SPEC §7, §12.2, §13)
--
-- All RSVP writes go through the SECURITY DEFINER functions below, callable
-- only by the service role (server code). Each runs in one transaction, locks
-- the event rows it touches (capacity is race-safe), and never trusts the
-- client for statuses or prices.
-- =============================================================================

-- ------------------------------------------------------------ storage -------
-- Originals land here via signed upload URLs (bypassing the 4.5 MB serverless
-- body limit), are verified by content, then deleted after processing.
insert into storage.buckets (id, name, public, file_size_limit)
values ('photo-uploads', 'photo-uploads', false, 20971520)
on conflict (id) do nothing;

-- Processed, EXIF-free attendee photos under unguessable random paths.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attendee-photos', 'attendee-photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- ------------------------------------------------------- rate limiting ------
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);
alter table public.rate_limits enable row level security; -- no policies: service role only

-- Returns true when the call is ALLOWED (and counts it); false when over the limit.
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into current_count;
  return current_count <= p_max;
end;
$$;

-- ----------------------------------------------------------- email log ------
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid references public.attendees (id) on delete set null,
  to_email extensions.citext not null,
  template text not null,
  subject text not null,
  transport text not null check (transport in ('resend', 'log')),
  provider_id text,
  -- Body is kept ONLY for the non-production 'log' transport (tests / previews
  -- without a mail provider). Real emails contain edit links and are not stored.
  body_text text,
  created_at timestamptz not null default now()
);
alter table public.email_log enable row level security;
create policy "admins read email log" on public.email_log
  for select to authenticated using (public.is_admin());

-- -------------------------------------------------- availability (public) ---
-- Head counts only (attendees + guests); no personal data. Used to show "Full".
create or replace function public.event_availability()
returns table (slug text, capacity integer, taken integer)
language sql
stable
security definer
set search_path = ''
as $$
  select e.slug, e.capacity,
    coalesce(sum(1 + r.guest_count) filter (
      where r.status in ('confirmed', 'pending_payment', 'pending_offline')), 0)::integer
  from public.event_items e
  left join public.registrations r on r.event_item_id = e.id
  where e.visible
  group by e.id;
$$;
grant execute on function public.event_availability() to anon, authenticated;

-- ----------------------------------------------------- shared internals -----
-- Applies a selection list to an attendee. p_selections: [{slug, guests, halftime, guestNames:[{first,last}]}]
-- Returns nothing; raises on invalid input.
create or replace function public.rsvp_apply_selections(p_attendee_id uuid, p_selections jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  sel jsonb;
  item public.event_items%rowtype;
  existing public.registrations%rowtype;
  taken integer;
  wanted integer;
  new_status public.registration_status;
  reg_id uuid;
  guest jsonb;
  seen_groups text[] := '{}'::text[];
  keep_ids uuid[] := '{}'::uuid[];
begin
  if jsonb_typeof(p_selections) <> 'array' then
    raise exception 'selections must be an array' using errcode = '22023';
  end if;

  for sel in select * from jsonb_array_elements(p_selections) loop
    select * into item from public.event_items
      where slug = sel ->> 'slug' and visible
      for update;
    if not found then
      raise exception 'unknown event %', sel ->> 'slug' using errcode = '22023';
    end if;
    if item.choice_group is not null then
      if item.choice_group = any (seen_groups) then
        raise exception 'only one choice allowed in %', item.choice_group using errcode = '22023';
      end if;
      seen_groups := seen_groups || item.choice_group;
    end if;

    wanted := case when item.allows_guests then least(greatest(coalesce((sel ->> 'guests')::integer, 0), 0), 4) else 0 end;

    select * into existing from public.registrations
      where attendee_id = p_attendee_id and event_item_id = item.id;

    if found and existing.status <> 'cancelled' then
      -- Kept selection: update counts; status is unchanged (payments settle differences in Phase 4).
      update public.registrations
        set guest_count = wanted,
            halftime_walk = item.halftime_eligible and coalesce((sel ->> 'halftime')::boolean, false)
        where id = existing.id;
      reg_id := existing.id;
    else
      -- New selection: capacity check under the row lock taken above.
      select coalesce(sum(1 + guest_count), 0) into taken from public.registrations
        where event_item_id = item.id and status in ('confirmed', 'pending_payment', 'pending_offline');
      new_status := (case
        when item.capacity is not null and taken + 1 + wanted > item.capacity then 'waitlist'
        when item.requires_payment then 'pending_payment'
        else 'confirmed'
      end)::public.registration_status;
      insert into public.registrations (attendee_id, event_item_id, guest_count, halftime_walk, status)
      values (p_attendee_id, item.id, wanted,
              item.halftime_eligible and coalesce((sel ->> 'halftime')::boolean, false), new_status)
      on conflict (attendee_id, event_item_id) do update
        set guest_count = excluded.guest_count, halftime_walk = excluded.halftime_walk, status = excluded.status
      returning id into reg_id;
    end if;

    keep_ids := keep_ids || reg_id;

    delete from public.guests where registration_id = reg_id;
    if wanted > 0 and jsonb_typeof(sel -> 'guestNames') = 'array' then
      for guest in select * from jsonb_array_elements(sel -> 'guestNames') limit wanted loop
        if length(trim(coalesce(guest ->> 'first', ''))) > 0 then
          insert into public.guests (registration_id, first_name, last_name)
          values (reg_id, trim(guest ->> 'first'), trim(coalesce(guest ->> 'last', '')));
        end if;
      end loop;
    end if;
  end loop;

  -- Removed selections: a confirmed PAID registration is never silently dropped —
  -- it is cancelled and flagged for the organizer to arrange any refund (SPEC §7.3).
  insert into public.refund_flags (attendee_id, registration_id, reason)
  select r.attendee_id, r.id, 'Attendee removed a paid event: ' || e.title
  from public.registrations r join public.event_items e on e.id = r.event_item_id
  where r.attendee_id = p_attendee_id and not (r.id = any (keep_ids))
    and r.status = 'confirmed' and e.requires_payment;

  update public.registrations r set status = 'cancelled'
  from public.event_items e
  where e.id = r.event_item_id and r.attendee_id = p_attendee_id and not (r.id = any (keep_ids))
    and r.status = 'confirmed' and e.requires_payment;

  delete from public.registrations r
  where r.attendee_id = p_attendee_id and not (r.id = any (keep_ids)) and r.status <> 'cancelled';
end;
$$;

-- -------------------------------------------------------------- create -------
-- p: {person:{...}, photoPath, showInDirectory, selections:[...]}, p_token_hash: sha256 of edit token.
-- Returns {status:'created', attendeeId} or {status:'duplicate', attendeeId} (email already has an RSVP).
create or replace function public.rsvp_create(p jsonb, p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  person jsonb := p -> 'person';
  existing_id uuid;
  new_id uuid;
begin
  -- lower() on both sides: with search_path = '' the citext operator isn't resolved,
  -- so a bare "=" would silently fall back to case-sensitive text comparison.
  select id into existing_id from public.attendees
    where lower(email::text) = lower(trim(person ->> 'email')) and status = 'active';
  if found then
    return jsonb_build_object('status', 'duplicate', 'attendeeId', existing_id);
  end if;

  -- A cancelled (deleted) RSVP for this email is replaced by the new one.
  delete from public.attendees where lower(email::text) = lower(trim(person ->> 'email')) and status = 'cancelled';

  insert into public.attendees (
    first_name, hs_last_name, current_last_name, nickname, email, phone, city, state,
    grad_school, photo_path, show_in_directory, edit_token_hash
  ) values (
    trim(person ->> 'firstName'), trim(person ->> 'hsLastName'),
    nullif(trim(coalesce(person ->> 'currentLastName', '')), ''),
    nullif(trim(coalesce(person ->> 'nickname', '')), ''),
    trim(person ->> 'email'),
    nullif(trim(coalesce(person ->> 'phone', '')), ''),
    nullif(trim(coalesce(person ->> 'city', '')), ''),
    nullif(trim(coalesce(person ->> 'state', '')), ''),
    (person ->> 'gradSchool')::public.grad_school,
    nullif(p ->> 'photoPath', ''),
    coalesce((p ->> 'showInDirectory')::boolean, true),
    p_token_hash
  ) returning id into new_id;

  perform public.rsvp_apply_selections(new_id, p -> 'selections');
  return jsonb_build_object('status', 'created', 'attendeeId', new_id);
end;
$$;

-- -------------------------------------------------------------- update -------
create or replace function public.rsvp_update(p_token_hash text, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  person jsonb := p -> 'person';
  target public.attendees%rowtype;
begin
  select * into target from public.attendees
    where edit_token_hash = p_token_hash and status = 'active' for update;
  if not found then
    raise exception 'invalid edit link' using errcode = '28000';
  end if;

  update public.attendees set
    first_name = trim(person ->> 'firstName'),
    hs_last_name = trim(person ->> 'hsLastName'),
    current_last_name = nullif(trim(coalesce(person ->> 'currentLastName', '')), ''),
    nickname = nullif(trim(coalesce(person ->> 'nickname', '')), ''),
    -- Email changes are allowed but must stay unique (constraint enforces it).
    email = trim(person ->> 'email'),
    phone = nullif(trim(coalesce(person ->> 'phone', '')), ''),
    city = nullif(trim(coalesce(person ->> 'city', '')), ''),
    state = nullif(trim(coalesce(person ->> 'state', '')), ''),
    grad_school = (person ->> 'gradSchool')::public.grad_school,
    photo_path = case when p ? 'photoPath' then nullif(p ->> 'photoPath', '') else photo_path end,
    show_in_directory = coalesce((p ->> 'showInDirectory')::boolean, show_in_directory)
  where id = target.id;

  if p ? 'selections' then
    perform public.rsvp_apply_selections(target.id, p -> 'selections');
  end if;
  return jsonb_build_object('status', 'updated', 'attendeeId', target.id, 'previousPhotoPath', target.photo_path);
end;
$$;

-- -------------------------------------------------------------- delete -------
-- "Delete my RSVP" (SPEC §12.2): removes personal data; payment rows survive
-- with attendee_id nulled (FK on delete set null) for accounting.
create or replace function public.rsvp_delete(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.attendees%rowtype;
begin
  select * into target from public.attendees where edit_token_hash = p_token_hash for update;
  if not found then
    raise exception 'invalid edit link' using errcode = '28000';
  end if;
  insert into public.refund_flags (attendee_id, registration_id, reason)
  select null, null, 'Deleted RSVP had a paid event: ' || e.title
  from public.registrations r join public.event_items e on e.id = r.event_item_id
  where r.attendee_id = target.id and r.status = 'confirmed' and e.requires_payment;
  delete from public.attendees where id = target.id;
  return jsonb_build_object('status', 'deleted', 'photoPath', target.photo_path, 'thenPhotoPath', target.then_photo_path);
end;
$$;

-- ------------------------------------------------------- rotate token -------
-- Issues a new edit link (only a hash is stored, so the old link can't be resent).
-- Used by "Lost your link?" and by duplicate submissions. Returns null if no RSVP.
create or replace function public.rsvp_rotate_token(p_email text, p_new_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.attendees%rowtype;
begin
  update public.attendees set edit_token_hash = p_new_hash
    where lower(email::text) = lower(trim(p_email)) and status = 'active'
    returning * into target;
  if not found then
    return null;
  end if;
  return jsonb_build_object('attendeeId', target.id, 'firstName', target.first_name, 'email', target.email::text);
end;
$$;

-- is_admin(): same citext/search_path pitfall as above — compare lower-cased text.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where lower(email::text) = lower(auth.jwt() ->> 'email')
  );
$$;

-- Lock every RSVP function down to the service role.
do $$
declare f text;
begin
  foreach f in array array[
    'public.rate_limit_hit(text, integer, integer)',
    'public.rsvp_apply_selections(uuid, jsonb)',
    'public.rsvp_create(jsonb, text)',
    'public.rsvp_update(text, jsonb)',
    'public.rsvp_delete(text)',
    'public.rsvp_rotate_token(text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end
$$;
