create extension if not exists vector;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (id, created_by)
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'agent')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text check (name is null or char_length(name) <= 160),
  email text check (email is null or char_length(email) <= 320),
  external_id text check (external_id is null or char_length(external_id) <= 160),
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'escalated')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id)
    on delete cascade
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  sender_type text not null check (sender_type in ('customer', 'agent', 'assistant')),
  content text not null check (char_length(trim(content)) > 0),
  source_references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, conversation_id)
    references public.conversations(organization_id, id)
    on delete cascade
);

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 255),
  source_type text not null check (source_type in ('faq', 'text', 'pdf')),
  storage_path text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null,
  content text not null check (char_length(trim(content)) > 0),
  embedding vector,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, source_id)
    references public.knowledge_sources(organization_id, id)
    on delete cascade
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  category text not null check (char_length(trim(category)) between 1 and 80),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, conversation_id)
    references public.conversations(organization_id, id)
    on delete cascade
);

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null check (char_length(trim(event_type)) between 1 and 100),
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 1 and 255),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null,
  rating smallint not null check (rating in (-1, 1)),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (organization_id, message_id)
    references public.messages(organization_id, id)
    on delete cascade
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_organization_change()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger set_knowledge_sources_updated_at
before update on public.knowledge_sources
for each row execute function public.set_updated_at();

create trigger set_tickets_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

create trigger set_workflow_events_updated_at
before update on public.workflow_events
for each row execute function public.set_updated_at();

create trigger prevent_organization_members_organization_change
before update on public.organization_members
for each row execute function public.prevent_organization_change();

create trigger prevent_customers_organization_change
before update on public.customers
for each row execute function public.prevent_organization_change();

create trigger prevent_conversations_organization_change
before update on public.conversations
for each row execute function public.prevent_organization_change();

create trigger prevent_messages_organization_change
before update on public.messages
for each row execute function public.prevent_organization_change();

create trigger prevent_knowledge_sources_organization_change
before update on public.knowledge_sources
for each row execute function public.prevent_organization_change();

create trigger prevent_knowledge_chunks_organization_change
before update on public.knowledge_chunks
for each row execute function public.prevent_organization_change();

create trigger prevent_tickets_organization_change
before update on public.tickets
for each row execute function public.prevent_organization_change();

create trigger prevent_workflow_events_organization_change
before update on public.workflow_events
for each row execute function public.prevent_organization_change();

create trigger prevent_ai_feedback_organization_change
before update on public.ai_feedback
for each row execute function public.prevent_organization_change();

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_organization_creator(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations
    where id = target_organization_id
      and created_by = (select auth.uid())
  );
$$;

create or replace function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

create index organizations_created_by_idx on public.organizations(created_by);
create index organization_members_user_id_idx on public.organization_members(user_id);
create index customers_organization_id_idx on public.customers(organization_id);
create index customers_organization_email_idx on public.customers(organization_id, email);
create index conversations_organization_id_idx on public.conversations(organization_id);
create index conversations_customer_id_idx on public.conversations(customer_id);
create index conversations_assigned_to_idx on public.conversations(assigned_to);
create index messages_organization_conversation_idx on public.messages(organization_id, conversation_id, created_at);
create index knowledge_sources_organization_id_idx on public.knowledge_sources(organization_id);
create index knowledge_chunks_organization_source_idx on public.knowledge_chunks(organization_id, source_id);
create index tickets_organization_id_idx on public.tickets(organization_id);
create index tickets_conversation_id_idx on public.tickets(conversation_id);
create index workflow_events_organization_status_idx on public.workflow_events(organization_id, status);
create index ai_feedback_organization_id_idx on public.ai_feedback(organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.tickets enable row level security;
alter table public.workflow_events enable row level security;
alter table public.ai_feedback enable row level security;

create policy "organization members can read their organizations"
on public.organizations for select
to authenticated
using (
  (select public.is_organization_member(id))
  or created_by = (select auth.uid())
);

create policy "users can create organizations for themselves"
on public.organizations for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "organization admins can update organizations"
on public.organizations for update
to authenticated
using ((select public.is_organization_admin(id)))
with check ((select public.is_organization_admin(id)));

create policy "organization owners can delete organizations"
on public.organizations for delete
to authenticated
using ((select public.is_organization_owner(id)));

create policy "members can read organization membership"
on public.organization_members for select
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "organization creators can add their owner membership"
on public.organization_members for insert
to authenticated
with check (
  (
    user_id = (select auth.uid())
    and role = 'owner'
    and (select public.is_organization_creator(organization_id))
  )
  or (select public.is_organization_admin(organization_id))
);

create policy "organization admins can update membership"
on public.organization_members for update
to authenticated
using ((select public.is_organization_admin(organization_id)))
with check ((select public.is_organization_admin(organization_id)));

create policy "organization admins can remove membership"
on public.organization_members for delete
to authenticated
using ((select public.is_organization_admin(organization_id)));

create policy "members can read customers"
on public.customers for select
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "members can create customers"
on public.customers for insert
to authenticated
with check ((select public.is_organization_member(organization_id)));

create policy "members can update customers"
on public.customers for update
to authenticated
using ((select public.is_organization_member(organization_id)))
with check ((select public.is_organization_member(organization_id)));

create policy "members can delete customers"
on public.customers for delete
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "members can read conversations"
on public.conversations for select
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "members can create conversations"
on public.conversations for insert
to authenticated
with check ((select public.is_organization_member(organization_id)));

create policy "members can update conversations"
on public.conversations for update
to authenticated
using ((select public.is_organization_member(organization_id)))
with check ((select public.is_organization_member(organization_id)));

create policy "members can read messages"
on public.messages for select
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "members can create messages"
on public.messages for insert
to authenticated
with check ((select public.is_organization_member(organization_id)));

create policy "members can read knowledge sources"
on public.knowledge_sources for select
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "organization admins can create knowledge sources"
on public.knowledge_sources for insert
to authenticated
with check (
  (select public.is_organization_admin(organization_id))
  and created_by = (select auth.uid())
);

create policy "organization admins can update knowledge sources"
on public.knowledge_sources for update
to authenticated
using ((select public.is_organization_admin(organization_id)))
with check ((select public.is_organization_admin(organization_id)));

create policy "organization admins can delete knowledge sources"
on public.knowledge_sources for delete
to authenticated
using ((select public.is_organization_admin(organization_id)));

create policy "members can read knowledge chunks"
on public.knowledge_chunks for select
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "members can read tickets"
on public.tickets for select
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "members can create tickets"
on public.tickets for insert
to authenticated
with check ((select public.is_organization_member(organization_id)));

create policy "members can update tickets"
on public.tickets for update
to authenticated
using ((select public.is_organization_member(organization_id)))
with check ((select public.is_organization_member(organization_id)));

create policy "members can read workflow events"
on public.workflow_events for select
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "members can read feedback"
on public.ai_feedback for select
to authenticated
using ((select public.is_organization_member(organization_id)));

create policy "members can submit feedback"
on public.ai_feedback for insert
to authenticated
with check ((select public.is_organization_member(organization_id)));
