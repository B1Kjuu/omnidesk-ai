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

The MVP work is committed and pushed to `origin/main` as `f130db1`. Do not commit or push further changes unless the owner explicitly asks, and do not run destructive Git commands.

## UI redesign (2026-11-17, uncommitted)

- Visual world: "Railway Information Program" chosen through the Impeccable design skill. Product truth in `PRODUCT.md`, design system in `DESIGN.md`, direction contract in `.impeccable/surfaces/` (the skill itself is vendored locally in `.claude/skills/impeccable/`, excluded from git via `.git/info/exclude`).
- Landing: split-flap departure board with rotating example rows, scroll-drawn route map, engineering timetable.
- Dashboard split into `/dashboard` (overview), `/dashboard/inbox`, `/escalations`, `/knowledge`, `/automation`, `/organizations`; shared data loader `lib/dashboard/getDesk.ts`.
- `/api/chat` now also returns `escalated` and `sources` (knowledge source names).
- Optional `DEMO_ORGANIZATION_ID` env var turns on a live "Ask the desk" row on the landing page; escalated demo questions send real staff emails.
- The dashboard "test conversation" form was removed.

## Production setup notes

- Supabase Cloud project `omnidesk-ai` (ref `lzqawtivzmtjgrpulycz`, ap-southeast-2) is linked and all 7 migrations were applied on 2026-11-17.
- The Supabase CLI now targets the local stack by default; production commands need `--remote` (and `--yes` to confirm hosted changes).

- In Supabase Cloud, set Authentication > URL Configuration > Site URL to the Vercel production URL so email-confirmation links land on the deployed app.
- Supabase Cloud requires email confirmation by default; the sign-up form already tells users to confirm and then sign in.
- The built-in Supabase email sender is heavily rate-limited; use few sign-ups during the smoke test or configure custom SMTP.

## Milestone 1: launch safely (code done, uncommitted)

- `/api/chat`: Turnstile check, Postgres rate limits (`hit_rate_limit`, fails open), per-org email cap, Gemini key in header, timeouts on Gemini and n8n.
- Escalation email rendered in `lib/email/escalationEmail.ts`; webhook body carries `notifyEmail`, `replyTo`, `email.{subject,html,text}`.
- Per-organization recipient: `organizations.notification_email`, edited in Dashboard → Organizations; falls back to the creator.
- Auth: `/auth/confirm` (PKCE code or token_hash), reset mode on `/auth?mode=reset`, `/auth/update-password`, resend confirmation.
- Sentry via `instrumentation.ts`, `instrumentation-client.ts`, `sentry.*.config.ts`, `app/error.tsx`, `app/global-error.tsx`; off without a DSN.
- Lint enforces Tailwind canonical classes (`eslint-plugin-better-tailwindcss`); CI in `.github/workflows/ci.yml`.
- Pending owner steps: `docs/milestone-1-setup.md` (migration push needs approval, Supabase URL config/templates, Turnstile keys, Sentry DSN, n8n Gmail node fields).
