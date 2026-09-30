-- =============================================================================
-- Owner decision (after Phase 3): no online payment processor. SPEC §8 and
-- Phase 4 are cancelled. Paid events are still flagged (requires_payment,
-- price_cents) so the site can show cost, but a registration is simply
-- 'confirmed' (or 'waitlist' when full). How to pay is communicated by the
-- organizers ("Payment details coming soon" placeholder on the site).
-- The payments / refund_flags tables remain, unused, in case that changes.
-- =============================================================================

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
      update public.registrations
        set guest_count = wanted,
            halftime_walk = item.halftime_eligible and coalesce((sel ->> 'halftime')::boolean, false)
        where id = existing.id;
      reg_id := existing.id;
    else
      select coalesce(sum(1 + guest_count), 0) into taken from public.registrations
        where event_item_id = item.id and status in ('confirmed', 'pending_payment', 'pending_offline');
      new_status := (case
        when item.capacity is not null and taken + 1 + wanted > item.capacity then 'waitlist'
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

  -- Removed selections are simply dropped (nothing was charged online).
  delete from public.registrations r
  where r.attendee_id = p_attendee_id and not (r.id = any (keep_ids));
end;
$$;

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
  delete from public.attendees where id = target.id;
  return jsonb_build_object('status', 'deleted', 'photoPath', target.photo_path, 'thenPhotoPath', target.then_photo_path);
end;
$$;

revoke all on function public.rsvp_apply_selections(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.rsvp_apply_selections(uuid, jsonb) to service_role;
revoke all on function public.rsvp_delete(text) from public, anon, authenticated;
grant execute on function public.rsvp_delete(text) to service_role;

-- Any registration left in a payment state becomes a normal confirmation.
update public.registrations set status = 'confirmed' where status in ('pending_payment', 'pending_offline');

-- Payment settings no longer apply.
delete from public.settings where key in ('fee_handling', 'pay_offline_enabled');
