-- SECURITY FIX.
-- Before this, any logged-in person could (a) make themselves an admin,
-- (b) approve their own listings, and (c) mark themselves a verified dealer,
-- by editing those columns directly. This closes all three.

-- 1) profiles: people may edit their own details, but never is_admin
revoke update on public.profiles from authenticated, anon;
grant update (role, full_name, phone, avatar_url) on public.profiles to authenticated;

-- 2) dealers: the "verified" badge can only be set by an admin / the SQL editor
revoke insert, update on public.dealers from authenticated, anon;
grant insert (user_id, business_name, slug, logo_url, description) on public.dealers to authenticated;
grant update (business_name, slug, logo_url, description) on public.dealers to authenticated;

-- 3) listings: only an admin may make a listing active or rejected
create or replace function public.protect_listing_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  -- Not a logged-in app user (SQL editor, server key): allow
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(p.is_admin, false) into caller_is_admin
  from public.profiles p where p.id = auth.uid();

  if coalesce(caller_is_admin, false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
  elsif new.status is distinct from old.status and new.status in ('active', 'rejected') then
    raise exception 'Only an admin can approve or reject listings';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_listing_status_insert on public.listings;
create trigger protect_listing_status_insert
  before insert on public.listings
  for each row execute function public.protect_listing_status();

drop trigger if exists protect_listing_status_update on public.listings;
create trigger protect_listing_status_update
  before update on public.listings
  for each row execute function public.protect_listing_status();
