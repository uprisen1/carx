-- Message status (sent / delivered / read) for the chat.

alter table public.messages
  add column if not exists delivered_at timestamptz;

-- Recipients may mark messages as delivered/read, but can NEVER edit the
-- message text: only these two columns are updatable.
revoke update on public.messages from authenticated, anon;
grant update (delivered_at, read_at) on public.messages to authenticated;

create policy "Recipients can update message status" on public.messages
  for update to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create index if not exists idx_messages_unread
  on public.messages (conversation_id) where read_at is null;
