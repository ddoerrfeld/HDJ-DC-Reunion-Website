-- Public bucket for hotel photos (SPEC §6.1). Anyone may view; only admins may write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lodging', 'lodging', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admins upload lodging photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'lodging' and public.is_admin());
create policy "admins update lodging photos" on storage.objects
  for update to authenticated using (bucket_id = 'lodging' and public.is_admin());
create policy "admins delete lodging photos" on storage.objects
  for delete to authenticated using (bucket_id = 'lodging' and public.is_admin());
