-- Milestone 6: insights. Question embeddings (to group knowledge gaps by meaning), one rating per answer,
-- and reporting functions that only an organization's members can call.

alter table public.messages add column question_embedding vector(768);

-- One rating per answer; a customer changing their mind updates it.
create unique index ai_feedback_message_id_key on public.ai_feedback (message_id);

-- Headline numbers, the daily series, sources, and ratings for the last `days` days, as one JSON document.
create or replace function public.get_desk_insights(target_organization_id uuid, days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select now() - make_interval(days => least(greatest(days, 1), 365)) as since
  ),
  allowed as (
    select (select public.is_organization_member(target_organization_id)) as ok
  ),
  answers as (
    select m.id, m.created_at, m.source_references
    from public.messages m, bounds
    where m.organization_id = target_organization_id and m.sender_type = 'assistant'
      and jsonb_array_length(m.source_references) > 0 and m.created_at >= bounds.since
  ),
  escalations as (
    select t.id, t.conversation_id, t.created_at
    from public.tickets t, bounds
    where t.organization_id = target_organization_id and t.created_at >= bounds.since
  ),
  first_replies as (
    select e.created_at,
      (select min(m.created_at) from public.messages m
       where m.conversation_id = e.conversation_id and m.sender_type = 'agent' and m.created_at >= e.created_at) as replied_at
    from escalations e
  ),
  days_series as (
    select d::date as day
    from bounds, generate_series(date_trunc('day', bounds.since), date_trunc('day', now()), interval '1 day') as d
  ),
  daily as (
    select ds.day,
      (select count(*) from answers a where a.created_at::date = ds.day) as answered,
      (select count(*) from escalations e where e.created_at::date = ds.day) as escalated
    from days_series ds
  ),
  source_use as (
    select (ref ->> 'sourceId')::uuid as source_id, count(*) as uses
    from answers, jsonb_array_elements(answers.source_references) as ref
    group by 1
  ),
  ratings as (
    select f.rating, count(*) as total
    from public.ai_feedback f, bounds
    where f.organization_id = target_organization_id and f.created_at >= bounds.since
    group by f.rating
  )
  select case when not (select ok from allowed) then null else jsonb_build_object(
    'questions', (select count(*) from public.messages m, bounds where m.organization_id = target_organization_id and m.sender_type = 'customer' and m.created_at >= bounds.since),
    'answered', (select count(*) from answers),
    'escalated', (select count(*) from escalations),
    'medianFirstReplySeconds', (select percentile_cont(0.5) within group (order by extract(epoch from replied_at - created_at)) from first_replies where replied_at is not null),
    'awaitingFirstReply', (select count(*) from first_replies where replied_at is null),
    'helpful', coalesce((select total from ratings where rating = 1), 0),
    'notHelpful', coalesce((select total from ratings where rating = -1), 0),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'answered', answered, 'escalated', escalated) order by day), '[]'::jsonb) from daily),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'uses', coalesce(u.uses, 0)) order by coalesce(u.uses, 0) desc, s.name), '[]'::jsonb)
      from public.knowledge_sources s left join source_use u on u.source_id = s.id
      where s.organization_id = target_organization_id and s.status = 'ready'
    )
  ) end;
$$;

revoke all on function public.get_desk_insights(uuid, integer) from public, anon;
grant execute on function public.get_desk_insights(uuid, integer) to authenticated;

-- Customer questions the desk could not answer, with the first staff reply (the ground truth for a new FAQ).
create or replace function public.list_unanswered_questions(target_organization_id uuid, days integer default 30, max_rows integer default 200)
returns table (message_id uuid, conversation_id uuid, content text, created_at timestamptz, embedding text, staff_reply text)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.conversation_id, q.content, q.created_at, q.question_embedding::text,
    (select r.content from public.messages r
     where r.conversation_id = q.conversation_id and r.sender_type = 'agent' and r.created_at > q.created_at
     order by r.created_at limit 1)
  from public.messages q
  join lateral (
    select a.source_references from public.messages a
    where a.conversation_id = q.conversation_id and a.sender_type = 'assistant' and a.created_at >= q.created_at
    order by a.created_at limit 1
  ) reply on true
  where q.organization_id = target_organization_id
    and q.sender_type = 'customer'
    and q.created_at >= now() - make_interval(days => least(greatest(days, 1), 365))
    and jsonb_array_length(reply.source_references) = 0
    and (select public.is_organization_member(target_organization_id))
  order by q.created_at desc
  limit least(greatest(max_rows, 1), 500);
$$;

revoke all on function public.list_unanswered_questions(uuid, integer, integer) from public, anon;
grant execute on function public.list_unanswered_questions(uuid, integer, integer) to authenticated;

-- Answers customers marked not helpful, with the question that prompted them.
create or replace function public.list_unhelpful_answers(target_organization_id uuid, max_rows integer default 20)
returns table (message_id uuid, answer text, question text, created_at timestamptz, source_name text)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.content,
    (select q.content from public.messages q where q.conversation_id = a.conversation_id and q.sender_type = 'customer' and q.created_at <= a.created_at order by q.created_at desc limit 1),
    f.created_at,
    (select s.name from public.knowledge_sources s where s.id = (a.source_references -> 0 ->> 'sourceId')::uuid)
  from public.ai_feedback f
  join public.messages a on a.id = f.message_id
  where f.organization_id = target_organization_id and f.rating = -1
    and (select public.is_organization_member(target_organization_id))
  order by f.created_at desc
  limit least(greatest(max_rows, 1), 100);
$$;

revoke all on function public.list_unhelpful_answers(uuid, integer) from public, anon;
grant execute on function public.list_unhelpful_answers(uuid, integer) to authenticated;
