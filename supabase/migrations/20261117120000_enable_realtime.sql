-- Let the dashboard hear new conversations, escalations, and workflow results without a reload.
-- Realtime postgres_changes applies each table's RLS policies, so members only receive their own
-- organizations' rows.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['conversations', 'messages', 'tickets', 'workflow_events', 'knowledge_sources']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
