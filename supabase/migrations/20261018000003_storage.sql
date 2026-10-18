-- =====================================================================
-- Image storage. Covers and post images are public to VIEW (they appear on
-- the shop), but only admins can upload, replace or delete them.
-- Listing a bucket's files is not allowed for visitors.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('book-covers', 'book-covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-images', 'post-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Admins can upload shop images"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()));

create policy "Admins can replace shop images"
  on storage.objects for update to authenticated
  using (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()))
  with check (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()));

create policy "Admins can delete shop images"
  on storage.objects for delete to authenticated
  using (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()));

-- Admins need SELECT for upsert/replace to work through the storage API.
create policy "Admins can see shop image records"
  on storage.objects for select to authenticated
  using (bucket_id in ('book-covers', 'post-images') and (select public.is_admin()));
