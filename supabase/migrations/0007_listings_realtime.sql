-- Lets the admin's Admin-link bubble update live when a listing is posted.
do $$
begin
  alter publication supabase_realtime add table public.listings;
exception
  when duplicate_object then null; -- already enabled
end $$;
