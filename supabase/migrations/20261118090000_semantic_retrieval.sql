-- Milestone 2: retrieval by meaning.
-- Each knowledge source keeps its full text; it is split into passages (chunks), each with a 768-dimension
-- embedding from gemini-embedding-2. Questions are matched by cosine similarity with pgvector.

-- Sources: full text (for editing and re-indexing), origin URL, indexing error, passage count, and a URL type.
alter table public.knowledge_sources
  add column content text,
  add column source_url text check (source_url is null or char_length(source_url) <= 2048),
  add column last_error text,
  add column chunk_count integer not null default 0;

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public' and rel.relname = 'knowledge_sources' and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%source_type%';
  if constraint_name is not null then
    execute format('alter table public.knowledge_sources drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.knowledge_sources
  add constraint knowledge_sources_source_type_check check (source_type in ('faq', 'text', 'pdf', 'url'));

-- Backfill the full text from the existing single-chunk sources.
update public.knowledge_sources s
set content = c.content,
    chunk_count = c.chunk_total
from (
  select source_id, string_agg(content, E'\n\n' order by created_at) as content, count(*) as chunk_total
  from public.knowledge_chunks
  group by source_id
) c
where c.source_id = s.id;

-- Chunks: fixed-size embeddings, passage order, and an approximate-nearest-neighbour index.
alter table public.knowledge_chunks
  alter column embedding type vector(768) using embedding::vector(768),
  add column chunk_index integer not null default 0;

create index knowledge_chunks_embedding_idx
  on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

-- Nearest passages for one organization. Server-only: the chat route calls it with the service role.
create or replace function public.match_knowledge_chunks(
  target_organization_id uuid,
  query_embedding vector(768),
  match_count integer default 6
)
returns table (id uuid, source_id uuid, content text, similarity double precision)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.id, c.source_id, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks c
  join public.knowledge_sources s on s.id = c.source_id and s.organization_id = c.organization_id
  where c.organization_id = target_organization_id
    and c.embedding is not null
    and s.status = 'ready'
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

revoke all on function public.match_knowledge_chunks(uuid, vector, integer) from public, anon, authenticated;
grant execute on function public.match_knowledge_chunks(uuid, vector, integer) to service_role;
