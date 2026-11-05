-- Push notifications: where to send, and a log so nothing is sent twice.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Remembers which messages/listings already triggered a push.
-- No policies on purpose: only the server (secret key) can touch it.
create table public.push_log (
  kind text not null,
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (kind, ref_id)
);

alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;
