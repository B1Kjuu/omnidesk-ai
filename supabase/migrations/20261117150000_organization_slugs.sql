-- Short, readable public chat links: /chat/sunrise-outfitters instead of /chat/<uuid>.
-- UUID links keep working; the chat page accepts either.

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(left(trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g')), 40), ''), 'desk');
$$;

create or replace function public.unique_organization_slug(base text, exclude_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  root text := trim(both '-' from left(public.slugify(base), 36));
  candidate text := root;
  suffix integer := 1;
begin
  while exists (
    select 1 from public.organizations
    where slug = candidate and (exclude_id is null or id <> exclude_id)
  ) loop
    suffix := suffix + 1;
    candidate := root || '-' || suffix;
  end loop;
  return candidate;
end;
$$;

revoke all on function public.unique_organization_slug(text, uuid) from public, anon, authenticated;

alter table public.organizations add column slug text;

-- Backfill existing organizations, oldest first, so the earliest keeps the plain name.
do $$
declare
  org record;
begin
  for org in select id, name from public.organizations order by created_at, id loop
    update public.organizations
    set slug = public.unique_organization_slug(org.name, org.id)
    where id = org.id;
  end loop;
end;
$$;

alter table public.organizations
  alter column slug set not null,
  add constraint organizations_slug_key unique (slug),
  add constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 40);

create or replace function public.set_organization_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is null or trim(new.slug) = '' then
    new.slug := public.unique_organization_slug(new.name, new.id);
  end if;
  return new;
end;
$$;

create trigger set_organizations_slug
before insert on public.organizations
for each row execute function public.set_organization_slug();
