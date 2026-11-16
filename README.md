# OmniDesk AI

OmniDesk AI is a multi-tenant customer-support platform that answers from a business's approved knowledge and hands off to a person when the evidence is insufficient.

## Status

Architecture approved. The initial application shell is in place; database implementation is the next milestone.

## MVP path

1. A business member signs in.
2. The member selects an organization.
3. An admin adds approved knowledge.
4. A customer submits a question.
5. OmniDesk retrieves knowledge belonging only to that organization.
6. The AI returns a grounded answer with sources or offers human help.
7. The conversation and messages are stored.

## Planned stack

- Next.js, React, and TypeScript
- Supabase Auth, PostgreSQL, Storage, pgvector, and Row Level Security
- Server-side AI provider integration
- Self-hosted n8n for local workflow development

The provider, embedding dimension, and document extraction library will be selected after checking current free-tier limits. No provider keys belong in browser code or source control.

## Local development

Install dependencies and run the initial shell with:

```powershell
npm install
npm run dev
```

The next milestone is to apply and test the database schema and RLS policies against a local or approved Supabase project.

### Local Supabase

Docker Desktop must be running. From the repository root:

```powershell
npx supabase@latest start
npx supabase@latest db reset
```

Open Supabase Studio at `http://127.0.0.1:54323`. Stop the local stack when finished with:

```powershell
npx supabase@latest stop
```

`db reset` is destructive: it deletes local data and replays every migration. Use it only when you intentionally want a clean database.

## Documentation

- [Initial architecture](docs/architecture.md)

## Scope rules

- OmniDesk is a standalone project.
- Existing portfolio projects are not dependencies.
- Development uses local/free-first services.
- No paid service, deployment, or external integration is enabled without explicit approval.
