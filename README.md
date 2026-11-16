# OmniDesk AI

OmniDesk AI is a multi-tenant customer-support platform that answers from a business's approved knowledge and hands off to a person when the evidence is insufficient.

## Status

Architecture approved. Application implementation has not started.

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

The app shell and dependencies have not been created yet. The next milestone is to choose the initial Next.js setup and add the first health-check page.

## Documentation

- [Initial architecture](docs/architecture.md)

## Scope rules

- OmniDesk is a standalone project.
- Existing portfolio projects are not dependencies.
- Development uses local/free-first services.
- No paid service, deployment, or external integration is enabled without explicit approval.
