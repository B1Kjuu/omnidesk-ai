create or replace function public.update_ticket(
  target_ticket_id uuid,
  new_status text,
  new_priority text
)
returns table (ticket_id uuid, conversation_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_ticket public.tickets;
  next_conversation_status text;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if new_status not in ('open', 'in_progress', 'resolved', 'cancelled') then
    raise exception 'Invalid ticket status';
  end if;

  if new_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid ticket priority';
  end if;

  select *
  into target_ticket
  from public.tickets
  where id = target_ticket_id;

  if target_ticket.id is null or not (select public.is_organization_member(target_ticket.organization_id)) then
    raise exception 'Ticket access denied';
  end if;

  next_conversation_status := case
    when new_status in ('resolved', 'cancelled') then 'resolved'
    else 'escalated'
  end;

  update public.tickets
  set status = new_status, priority = new_priority
  where id = target_ticket_id;

  update public.conversations
  set status = next_conversation_status
  where id = target_ticket.conversation_id
    and organization_id = target_ticket.organization_id;

  return query select target_ticket_id, next_conversation_status;
end;
$$;

revoke all on function public.update_ticket(uuid, text, text) from public;
grant execute on function public.update_ticket(uuid, text, text) to authenticated;
