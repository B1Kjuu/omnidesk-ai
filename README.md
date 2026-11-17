# OmniDesk AI

OmniDesk AI is a multi-tenant customer-support platform that answers from a business's approved knowledge and hands off to a person when the evidence is insufficient.

## Status

The local MVP is working with authentication, tenant-scoped inboxes, grounded AI answers, human escalation, and n8n notifications.

The current dashboard includes a polished workspace overview, FAQ CRUD, escalation ticket controls, workflow-event visibility, and session-expiry messaging. The next milestone is deploying a separate production Supabase project and the app to Vercel.

## MVP path

1. A business member signs in.
2. The member selects an organization.
3. An admin adds approved knowledge.
4. A customer submits a question.
5. OmniDesk retrieves knowledge belonging only to that organization.
6. The AI returns a grounded answer with sources or offers human help.
7. The conversation and messages are stored.

## Stack

- Next.js, React, and TypeScript
- Supabase Auth, PostgreSQL, Storage, pgvector, and Row Level Security
- Server-side AI provider integration
- Self-hosted n8n for escalation notifications

The provider, embedding dimension, and document extraction library will be selected after checking current free-tier limits. No provider keys belong in browser code or source control.

## Local development

Install dependencies and run the app with:

```powershell
npm install
npm run dev
```

The local Supabase stack is the development environment. The production environment must use a separate Supabase Cloud project.

### Local Supabase

Docker Desktop must be running. From the repository root:

```powershell
npx supabase@latest start
```

Open Supabase Studio at `http://127.0.0.1:54323`. Stop the local stack when finished with:

```powershell
npx supabase@latest stop
```

`supabase db reset` is destructive: it deletes local users and application data. Do not use it during normal development. Apply append-only migrations with:

```powershell
npx supabase@latest migration up
```

### Environment variables

Copy `.env.example` to `.env.local` for local development. For Vercel, add the same variables in the project settings. Keep `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `N8N_ESCALATION_WEBHOOK_URL` server-only; never expose or commit them.

### Production deployment

1. Create a Supabase Cloud project.
2. Apply the migrations to the production project.
3. Import this GitHub repository into Vercel.
4. Add the variables from `.env.example` in Vercel.
5. Deploy and test authentication, FAQ answers, escalation tickets, and n8n email notifications.

## Documentation

- [Initial architecture](docs/architecture.md)

## Scope rules

- OmniDesk is a standalone project.
- Existing portfolio projects are not dependencies.
- Development uses local/free-first services.
