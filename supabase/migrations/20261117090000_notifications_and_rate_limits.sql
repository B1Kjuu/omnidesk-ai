-- Where escalation emails go, per organization. Null means "the organization's creator".
alter table public.organizations
  add column notification_email text
  check (
    notification_email is null
    or (char_length(notification_email) <= 320 and notification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  );

-- Admins already have an UPDATE policy on organizations. This RPC returns the effective recipient,
-- falling back to the creator's sign-in email, so the dashboard can show who is actually emailed.
create or replace function public.get_notification_recipient(target_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(o.notification_email, u.email)
  from public.organizations o
  join auth.users u on u.id = o.created_by
  where o.id = target_organization_id
    and (
      (select public.is_organization_member(o.id))
      or (select auth.role()) = 'service_role'
    );
$$;

revoke all on function public.get_notification_recipient(uuid) from public;
grant execute on function public.get_notification_recipient(uuid) to authenticated, service_role;

-- Fixed-window rate limiting for the public chat endpoint. Only the server (service role) touches it.
create table public.rate_limits (
  bucket text not null check (char_length(bucket) between 1 and 200),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies: anon and authenticated users can never read or write this table.

create or replace function public.hit_rate_limit(bucket_key text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  total integer;
begin
  insert into public.rate_limits as r (bucket, window_start, hits)
  values (bucket_key, current_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into total;

  -- Occasional cleanup keeps the table small without a cron job.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return total <= max_hits;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
