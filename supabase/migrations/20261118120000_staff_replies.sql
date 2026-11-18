-- Milestone 3: staff replies and returning customers.

-- A customer's browser holds a random token for its conversation; only its SHA-256 hash is stored,
-- so a leaked conversation id alone never exposes the thread.
alter table public.conversations
  add column customer_token_hash text check (customer_token_hash is null or customer_token_hash ~ '^[0-9a-f]{64}$'),
  add column last_message_at timestamptz not null default now();

update public.conversations c
set last_message_at = coalesce((select max(m.created_at) from public.messages m where m.conversation_id = c.id), c.created_at);

create index conversations_organization_last_message_idx on public.conversations (organization_id, last_message_at desc);

-- Which staff member wrote a reply.
alter table public.messages
  add column author_id uuid references auth.users(id) on delete set null;

-- Members may only write staff replies as themselves; customer and assistant messages come from the server.
drop policy if exists "members can create messages" on public.messages;
create policy "members can create staff replies"
on public.messages for insert
to authenticated
with check (
  (select public.is_organization_member(organization_id))
  and sender_type = 'agent'
  and author_id = (select auth.uid())
);

-- Keep last_message_at current for sorting the inbox.
create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id and organization_id = new.organization_id;
  return new;
end;
$$;

create trigger touch_conversation_after_message
after insert on public.messages
for each row execute function public.touch_conversation_last_message();
