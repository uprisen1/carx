-- Storage policies for the public "listing-images" bucket.
-- A public bucket only allows viewing; these let logged-in users upload.

create policy "Anyone can view listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Logged-in users can upload listing images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images');

create policy "Users can update their own listing images"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-images' and owner_id = (select auth.uid())::text);

create policy "Users can delete their own listing images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and owner_id = (select auth.uid())::text);
