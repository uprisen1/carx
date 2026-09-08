-- ============================================================
-- Adds an admin flag and the RLS policies needed for the
-- moderation/approval queue.
-- ============================================================

alter table public.profiles
  add column is_admin boolean not null default false;

-- Admins can see every listing regardless of status (needed for the
-- pending queue), and can update any listing's status.
create policy "Admins can view all listings" on public.listings
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "Admins can update any listing" on public.listings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- To make your own account an admin, run once in the SQL editor:
-- update public.profiles set is_admin = true where id = '<your-user-uuid>';
