-- ============================================================
-- Car Marketplace Kenya — initial schema
-- Run via: supabase db push  (or paste into SQL editor)
-- ============================================================

-- Extends Supabase's built-in auth.users with app-specific fields
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('private_seller', 'dealer', 'buyer')),
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Dealer-specific storefront info (one row per dealer profile)
create table public.dealers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  logo_url text,
  description text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  make text not null,
  model text not null,
  year int not null,
  price numeric(12, 2) not null,
  mileage int,
  transmission text check (transmission in ('manual', 'automatic')),
  fuel_type text check (fuel_type in ('petrol', 'diesel', 'hybrid', 'electric')),
  condition text check (condition in ('brand_new', 'foreign_used', 'locally_used')),
  location text,
  description text,
  status text not null default 'pending' check (status in ('pending', 'active', 'sold', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Helpful indexes for the search/filter page
create index idx_listings_status on public.listings(status);
create index idx_listings_make_model on public.listings(make, model);
create index idx_listings_price on public.listings(price);
create index idx_listings_location on public.listings(location);
create index idx_messages_conversation on public.messages(conversation_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.dealers enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Profiles: anyone can view, only the owner can edit their own
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Dealers: public storefronts, owner-only edits
create policy "Dealer profiles are viewable by everyone" on public.dealers
  for select using (true);
create policy "Dealers can update own storefront" on public.dealers
  for update using (auth.uid() = user_id);
create policy "Dealers can insert own storefront" on public.dealers
  for insert with check (auth.uid() = user_id);

-- Listings: active listings are public; sellers manage their own
create policy "Active listings are viewable by everyone" on public.listings
  for select using (status = 'active' or auth.uid() = seller_id);
create policy "Sellers can insert own listings" on public.listings
  for insert with check (auth.uid() = seller_id);
create policy "Sellers can update own listings" on public.listings
  for update using (auth.uid() = seller_id);
create policy "Sellers can delete own listings" on public.listings
  for delete using (auth.uid() = seller_id);

-- Listing images: follow the parent listing's visibility
create policy "Images follow listing visibility" on public.listing_images
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );
create policy "Sellers can manage own listing images" on public.listing_images
  for all using (
    exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

-- Favorites: users manage their own
create policy "Users manage own favorites" on public.favorites
  for all using (auth.uid() = user_id);

-- Conversations: only the two participants can see it
create policy "Participants can view conversation" on public.conversations
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyers can start a conversation" on public.conversations
  for insert with check (auth.uid() = buyer_id);

-- Messages: only participants of the parent conversation
create policy "Participants can view messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
create policy "Participants can send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
