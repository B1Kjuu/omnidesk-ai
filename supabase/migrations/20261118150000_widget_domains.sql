-- Milestone 4: embeddable widget.
-- Websites allowed to embed an organization's chat. Empty means any website (handy while trying it out).
alter table public.organizations
  add column widget_domains text[] not null default '{}'
  check (cardinality(widget_domains) <= 20);

-- Each entry is a bare hostname, optionally with a leading "*." wildcard, e.g. "shop.example.com" or "*.example.com".
create or replace function public.valid_widget_domains(domains text[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(domain ~ '^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$' or domain = 'localhost'), true)
  from unnest(domains) as domain;
$$;

alter table public.organizations
  add constraint organizations_widget_domains_format check (public.valid_widget_domains(widget_domains));

-- What the embed page's security header needs, and nothing else: callable without signing in.
create or replace function public.get_widget_domains(handle text)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select widget_domains
  from public.organizations
  where slug = lower(handle) or id::text = lower(handle)
  limit 1;
$$;

revoke all on function public.get_widget_domains(text) from public;
grant execute on function public.get_widget_domains(text) to anon, authenticated, service_role;
