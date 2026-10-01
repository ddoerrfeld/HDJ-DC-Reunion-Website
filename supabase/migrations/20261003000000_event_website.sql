-- Owner request: link venues so out-of-town classmates can see what they offer.
-- Organizer-editable like every other event field (admin, Phase 7).
alter table public.event_items
  add column website_url text check (website_url is null or website_url ~* '^https?://');

-- Backfill the two venue sites on databases seeded before this column existed.
update public.event_items set website_url = 'https://randalloaksgc.com/'
  where slug = 'sat-golf' and website_url is null;
update public.event_items set website_url = 'https://picklehaus.com/'
  where slug = 'sat-pickleball' and website_url is null;
