create or replace function public.create_knowledge_source(
  target_organization_id uuid,
  source_name text,
  source_type text,
  source_content text
)
returns table (source_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_source_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not (select public.is_organization_admin(target_organization_id)) then
    raise exception 'Organization admin access required';
  end if;

  if source_name is null or char_length(trim(source_name)) not between 1 and 255 then
    raise exception 'Source name must be between 1 and 255 characters';
  end if;

  if source_type not in ('faq', 'text', 'pdf') then
    raise exception 'Unsupported source type';
  end if;

  if source_content is null or char_length(trim(source_content)) = 0 then
    raise exception 'Source content is required';
  end if;

  insert into public.knowledge_sources (
    organization_id,
    name,
    source_type,
    status,
    created_by
  )
  values (
    target_organization_id,
    trim(source_name),
    source_type,
    'ready',
    current_user_id
  )
  returning id into new_source_id;

  insert into public.knowledge_chunks (organization_id, source_id, content)
  values (target_organization_id, new_source_id, trim(source_content));

  return query select new_source_id;
end;
$$;

revoke all on function public.create_knowledge_source(uuid, text, text, text) from public;
grant execute on function public.create_knowledge_source(uuid, text, text, text) to authenticated;
