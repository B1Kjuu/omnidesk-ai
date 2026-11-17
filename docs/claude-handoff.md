# OmniDesk AI handoff

## Current state

OmniDesk is a working local MVP for tenant-scoped customer support:

- Next.js 16 App Router, TypeScript, Tailwind, Supabase, Gemini, and Azure-hosted n8n
- Authentication, organizations, RLS, inbox, customer chat, FAQ knowledge sources, grounded answers, escalation tickets, and workflow events are implemented
- Azure n8n receives `conversation.escalated` production webhook events and sends Gmail notifications successfully
- The landing page and dashboard received a major visual pass
- `npm run lint` and `npm run build` pass

## Important local warning

Do not run:

```powershell
npx supabase db reset
```

It deletes local auth users and all application data. The local database was reset again on 2026-11-17, so the owner must recreate a local account, organization, FAQ, and test conversation before manual testing.

Use append-only migrations instead:

```powershell
npx supabase@latest migration up
```

## Current files and behavior

- `app/page.tsx`: polished marketing/portfolio landing page
- `app/auth/page.tsx`, `components/auth/AuthForm.tsx`: sign-in/sign-up and session-expiry messaging
- `app/dashboard/page.tsx`: workspace overview, organizations, inbox, escalations, knowledge, and automation events
- `components/dashboard/KnowledgeSourceList.tsx`: view/edit/delete FAQ content
- `components/dashboard/TicketList.tsx`: update ticket priority/status
- `components/dashboard/WorkflowEventList.tsx`: view automation event status/errors
- `app/api/chat/route.ts`: grounded retrieval, Gemini response, fallback, escalation ticket, workflow event, and optional n8n webhook delivery
- `supabase/migrations/20261117004500_create_knowledge_source_rpc.sql`: atomic knowledge-source creation
- `supabase/migrations/20261117005500_manage_knowledge_chunks.sql`: admin chunk update/delete RLS
- `supabase/migrations/20261117060000_update_ticket_rpc.sql`: ticket update RPC synchronized with conversation status

## Environment variables

`.env.local` is ignored and must never be committed. Required names are documented in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `N8N_ESCALATION_WEBHOOK_URL`

## Next steps

1. Recreate local test data after the reset.
2. Create a separate Supabase Cloud production project.
3. Apply migrations to production without resetting local or production data.
4. Import the GitHub repository into Vercel.
5. Configure production environment variables in Vercel.
6. Run a live smoke test for sign-in, FAQ answer, escalation ticket, n8n webhook, and Gmail notification.

## Change policy

The owner asked not to commit the current work yet. Preserve the uncommitted changes and do not run destructive Git commands.
