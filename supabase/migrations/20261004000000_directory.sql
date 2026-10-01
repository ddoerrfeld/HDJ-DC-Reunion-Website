-- =============================================================================
-- Phase 6: Who's Coming (SPEC §9).
--
-- SPEC §9.1 asks for a `public_directory` view. A view over attendees would have
-- to bypass RLS (Supabase flags such views as a security error), so the same
-- contract is a SECURITY DEFINER function, like event_availability(): anon can
-- call it, and it returns ONLY the public columns. anon still has no access to
-- attendees, registrations or guests.
--
-- Listed: active RSVPs that opted in (show_in_directory) and whose classmate
-- status isn't pending the organizer's approval. Never returned: email, phone,
-- city/state, halftime walk, guests, payment, edit tokens, exact RSVP time.
-- =============================================================================

create or replace function public.directory_entries()
returns table (
  id uuid,
  first_name text,
  hs_last_name text,
  current_last_name text,
  nickname text,
  grad_school public.grad_school,
  photo_path text,
  then_photo_path text,
  yearbook_school public.yearbook_school,
  yearbook_page_number integer,
  yearbook_crop jsonb,
  activities jsonb,
  -- 1 = most recent RSVP; an ordering, not a timestamp.
  recent_rank integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.first_name,
    a.hs_last_name,
    a.current_last_name,
    a.nickname,
    a.grad_school,
    case when a.photo_hidden then null else a.photo_path end,
    case when p.id is null then null else a.then_photo_path end,
    p.school,
    -- Reader page numbers count visible pages only (cover = 1).
    case when p.id is null then null else (
      select count(*)::integer from public.yearbook_pages v
      where v.school = p.school and not v.hidden and v.seq <= p.seq
    ) end,
    case when p.id is null then null else a.yearbook_crop end,
    coalesce((
      select jsonb_agg(jsonb_build_object('slug', e.slug, 'title', e.title, 'day', e.day) order by e.sort)
      from public.registrations r
      join public.event_items e on e.id = r.event_item_id
      where r.attendee_id = a.id and r.status = 'confirmed' and e.visible
    ), '[]'::jsonb),
    (row_number() over (order by a.created_at desc))::integer
  from public.attendees a
  left join public.yearbook_pages p on p.id = a.yearbook_page_id and not p.hidden
  where a.status = 'active'
    and a.show_in_directory
    and a.classmate_status <> 'pending';
$$;

-- How many coming classmates are not listed (opted out, or awaiting approval). A count only.
create or replace function public.directory_unlisted_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.attendees a
  where a.status = 'active' and (not a.show_in_directory or a.classmate_status = 'pending');
$$;

revoke all on function public.directory_entries() from public;
grant execute on function public.directory_entries() to anon, authenticated, service_role;
revoke all on function public.directory_unlisted_count() from public;
grant execute on function public.directory_unlisted_count() to anon, authenticated, service_role;
