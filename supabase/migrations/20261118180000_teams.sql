-- Milestone 5: teams. Invitations, member management with owner safeguards, and an audit log.

-- ---------------------------------------------------------------------------------------------
-- Invitations. The link carries a random token; only its SHA-256 hash is stored.
-- ---------------------------------------------------------------------------------------------
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (char_length(email) <= 320 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null check (role in ('admin', 'agent')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

create unique index organization_invitations_pending_email_idx
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null;

alter table public.organization_invitations enable row level security;

create policy "organization admins can read invitations"
on public.organization_invitations for select
to authenticated
using ((select public.is_organization_admin(organization_id)));

create policy "organization admins can invite"
on public.organization_invitations for insert
to authenticated
with check ((select public.is_organization_admin(organization_id)) and invited_by = (select auth.uid()));

create policy "organization admins can revoke invitations"
on public.organization_invitations for delete
to authenticated
using ((select public.is_organization_admin(organization_id)));

-- What the invite page shows to whoever holds the link (the token is the secret).
create or replace function public.get_invitation(invitation_token_hash text)
returns table (organization_name text, role text, email text, expired boolean, accepted boolean)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, i.role, i.email, i.expires_at < now(), i.accepted_at is not null
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token_hash = invitation_token_hash;
$$;

revoke all on function public.get_invitation(text) from public;
grant execute on function public.get_invitation(text) to anon, authenticated;

-- Joins the signed-in user to the organization, only if their verified email matches the invitation.
create or replace function public.accept_invitation(invitation_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  invitation public.organization_invitations;
begin
  if current_user_id is null then
    raise exception 'Sign in to accept this invitation';
  end if;

  select email into current_email from auth.users where id = current_user_id;

  select * into invitation
  from public.organization_invitations
  where token_hash = invitation_token_hash
  for update;

  if invitation.id is null then
    raise exception 'This invitation does not exist';
  end if;
  if invitation.accepted_at is not null then
    raise exception 'This invitation was already used';
  end if;
  if invitation.expires_at < now() then
    raise exception 'This invitation has expired. Ask for a new one';
  end if;
  if lower(current_email) <> lower(invitation.email) then
    raise exception 'This invitation is for %. Sign in with that email to accept it', invitation.email;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invitation.organization_id, current_user_id, invitation.role)
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invitations
  set accepted_at = now(), accepted_by = current_user_id
  where id = invitation.id;

  return invitation.organization_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Members: list with emails, change roles, remove. An organization always keeps at least one owner.
-- ---------------------------------------------------------------------------------------------
create or replace function public.list_organization_members(target_organization_id uuid)
returns table (user_id uuid, email text, role text, joined_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.organization_members m
  join auth.users u on u.id = m.user_id
  where m.organization_id = target_organization_id
    and (select public.is_organization_member(target_organization_id))
  order by case m.role when 'owner' then 0 when 'admin' then 1 else 2 end, m.created_at;
$$;

revoke all on function public.list_organization_members(uuid) from public, anon;
grant execute on function public.list_organization_members(uuid) to authenticated;

create or replace function public.set_member_role(target_organization_id uuid, target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  target_role_now text;
begin
  if new_role not in ('owner', 'admin', 'agent') then
    raise exception 'Unknown role';
  end if;

  select role into caller_role from public.organization_members
  where organization_id = target_organization_id and user_id = (select auth.uid());
  select role into target_role_now from public.organization_members
  where organization_id = target_organization_id and user_id = target_user_id
  for update;

  if caller_role is null or caller_role = 'agent' then
    raise exception 'Only owners and admins can change roles';
  end if;
  if target_role_now is null then
    raise exception 'That person is not a member';
  end if;
  if (target_role_now = 'owner' or new_role = 'owner') and caller_role <> 'owner' then
    raise exception 'Only owners can grant or remove ownership';
  end if;
  if target_role_now = 'owner' and new_role <> 'owner' and (
    select count(*) from public.organization_members where organization_id = target_organization_id and role = 'owner'
  ) <= 1 then
    raise exception 'An organization needs at least one owner. Make someone else an owner first';
  end if;

  update public.organization_members set role = new_role
  where organization_id = target_organization_id and user_id = target_user_id;
end;
$$;

revoke all on function public.set_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

create or replace function public.remove_member(target_organization_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  caller_role text;
  target_role text;
begin
  select role into caller_role from public.organization_members
  where organization_id = target_organization_id and user_id = current_user_id;
  select role into target_role from public.organization_members
  where organization_id = target_organization_id and user_id = target_user_id
  for update;

  if target_role is null then
    raise exception 'That person is not a member';
  end if;
  -- Anyone may leave; removing someone else needs admin rights, and owners can only be removed by owners.
  if target_user_id <> current_user_id then
    if caller_role is null or caller_role = 'agent' then
      raise exception 'Only owners and admins can remove members';
    end if;
    if target_role = 'owner' and caller_role <> 'owner' then
      raise exception 'Only owners can remove an owner';
    end if;
  end if;
  if target_role = 'owner' and (
    select count(*) from public.organization_members where organization_id = target_organization_id and role = 'owner'
  ) <= 1 then
    raise exception 'An organization needs at least one owner. Make someone else an owner first';
  end if;

  delete from public.organization_members
  where organization_id = target_organization_id and user_id = target_user_id;
end;
$$;

revoke all on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Audit log, written by triggers so no code path can skip it. Readable by owners and admins.
-- ---------------------------------------------------------------------------------------------
create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 60),
  subject text check (subject is null or char_length(subject) <= 300),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_organization_created_idx on public.audit_events (organization_id, created_at desc);

alter table public.audit_events enable row level security;

create policy "organization admins can read the audit log"
on public.audit_events for select
to authenticated
using ((select public.is_organization_admin(organization_id)));

create or replace function public.record_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(coalesce(new, old));
  old_data jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else '{}'::jsonb end;
  organization uuid := case when tg_table_name = 'organizations' then (row_data ->> 'id')::uuid else (row_data ->> 'organization_id')::uuid end;
  action_name text;
  subject_text text;
  detail jsonb := '{}'::jsonb;
begin
  -- Rows removed by an organization being deleted: nothing left to log against.
  if not exists (select 1 from public.organizations where id = organization) then
    return coalesce(new, old);
  end if;

  case tg_table_name
    when 'knowledge_sources' then
      if tg_op = 'UPDATE' and (row_data -> 'name') is not distinct from (old_data -> 'name') and (row_data -> 'content') is not distinct from (old_data -> 'content') then
        return new; -- indexing status changes are not user actions
      end if;
      action_name := 'knowledge.' || case tg_op when 'INSERT' then 'added' when 'UPDATE' then 'edited' else 'deleted' end;
      subject_text := row_data ->> 'name';
      detail := jsonb_build_object('type', row_data ->> 'source_type');
    when 'organization_members' then
      if tg_op = 'UPDATE' and (row_data ->> 'role') = (old_data ->> 'role') then
        return new;
      end if;
      action_name := 'member.' || case tg_op when 'INSERT' then 'joined' when 'UPDATE' then 'role_changed' else 'removed' end;
      select email into subject_text from auth.users where id = (row_data ->> 'user_id')::uuid;
      detail := jsonb_build_object('role', row_data ->> 'role') || case when tg_op = 'UPDATE' then jsonb_build_object('previous_role', old_data ->> 'role') else '{}'::jsonb end;
    when 'organization_invitations' then
      if tg_op = 'UPDATE' then
        return new; -- acceptance is logged as member.joined
      end if;
      action_name := 'invitation.' || case tg_op when 'INSERT' then 'sent' else 'revoked' end;
      subject_text := row_data ->> 'email';
      detail := jsonb_build_object('role', row_data ->> 'role');
    when 'organizations' then
      select coalesce(jsonb_agg(key), '[]'::jsonb) into detail
      from jsonb_each(to_jsonb(new)) as changed(key, value)
      where key in ('name', 'notification_email', 'widget_domains', 'slug') and value is distinct from (to_jsonb(old) -> key);
      if jsonb_array_length(detail) = 0 then
        return new;
      end if;
      action_name := 'settings.updated';
      subject_text := new.name;
      detail := jsonb_build_object('fields', detail);
    when 'tickets' then
      if new.status = old.status and new.priority = old.priority then
        return new;
      end if;
      action_name := 'ticket.updated';
      detail := jsonb_build_object('status', new.status, 'previous_status', old.status, 'priority', new.priority, 'previous_priority', old.priority);
    when 'messages' then
      if new.sender_type <> 'agent' then
        return new;
      end if;
      action_name := 'reply.sent';
      subject_text := left(new.content, 120);
  end case;

  insert into public.audit_events (organization_id, actor_id, action, subject, details)
  values (organization, (select auth.uid()), action_name, subject_text, detail);
  return coalesce(new, old);
end;
$$;

create trigger audit_knowledge_sources after insert or update or delete on public.knowledge_sources
for each row execute function public.record_audit_event();
create trigger audit_organization_members after insert or update or delete on public.organization_members
for each row execute function public.record_audit_event();
create trigger audit_organization_invitations after insert or update or delete on public.organization_invitations
for each row execute function public.record_audit_event();
create trigger audit_organizations after update on public.organizations
for each row execute function public.record_audit_event();
create trigger audit_tickets after update on public.tickets
for each row execute function public.record_audit_event();
create trigger audit_staff_replies after insert on public.messages
for each row execute function public.record_audit_event();

-- The activity page: events with the actor's email, for owners and admins only.
create or replace function public.list_audit_events(target_organization_id uuid, max_rows integer default 100)
returns table (id bigint, created_at timestamptz, actor_email text, action text, subject text, details jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.created_at, u.email::text, e.action, e.subject, e.details
  from public.audit_events e
  left join auth.users u on u.id = e.actor_id
  where e.organization_id = target_organization_id
    and (select public.is_organization_admin(target_organization_id))
  order by e.created_at desc
  limit least(greatest(max_rows, 1), 500);
$$;

revoke all on function public.list_audit_events(uuid, integer) from public, anon;
grant execute on function public.list_audit_events(uuid, integer) to authenticated;
