-- Creates a profiles row automatically whenever someone signs up.
-- Role and full name come from the signup form's metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case
      when new.raw_user_meta_data->>'role' in ('private_seller', 'dealer', 'buyer')
        then new.raw_user_meta_data->>'role'
      else 'buyer'
    end,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
