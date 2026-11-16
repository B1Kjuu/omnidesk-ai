create or replace function public.create_public_conversation(
  target_organization_id uuid,
  customer_name text,
  customer_email text,
  first_message text
)
returns table (conversation_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_customer_id uuid;
  new_conversation_id uuid;
begin
  if not exists (
    select 1 from public.organizations where id = target_organization_id
  ) then
    raise exception 'Organization not found';
  end if;

  if customer_name is null or char_length(trim(customer_name)) = 0 then
    raise exception 'Customer name is required';
  end if;

  if first_message is null or char_length(trim(first_message)) = 0 then
    raise exception 'Message is required';
  end if;

  insert into public.customers (organization_id, name, email)
  values (target_organization_id, trim(customer_name), nullif(trim(customer_email), ''))
  returning id into new_customer_id;

  insert into public.conversations (organization_id, customer_id)
  values (target_organization_id, new_customer_id)
  returning id into new_conversation_id;

  insert into public.messages (organization_id, conversation_id, sender_type, content)
  values (target_organization_id, new_conversation_id, 'customer', trim(first_message));

  return query select new_conversation_id;
end;
$$;

revoke all on function public.create_public_conversation(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_public_conversation(uuid, text, text, text) to service_role;
