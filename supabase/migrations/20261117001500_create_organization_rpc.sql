create or replace function public.create_organization(organization_name text)
returns table (id uuid, name text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization public.organizations;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if organization_name is null or char_length(trim(organization_name)) not between 1 and 120 then
    raise exception 'Organization name must be between 1 and 120 characters';
  end if;

  insert into public.organizations (name, created_by)
  values (trim(organization_name), current_user_id)
  returning * into new_organization;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization.id, current_user_id, 'owner');

  return query
  select new_organization.id, new_organization.name, new_organization.created_at;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
