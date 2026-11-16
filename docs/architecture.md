# OmniDesk AI — Initial Architecture

Status: Approved draft  
Scope: MVP foundation before implementation

## Goal

OmniDesk is a multi-tenant customer-support application. A business can manage its knowledge, receive customer conversations, and get AI-assisted answers grounded in that knowledge. When evidence is insufficient, the system should offer human help instead of guessing.

The MVP must support this path:

1. A business member signs in.
2. The member creates or selects an organization.
3. An admin adds approved knowledge.
4. A customer submits a question.
5. OmniDesk retrieves knowledge belonging only to that organization.
6. The AI returns a grounded answer with source references, or marks the conversation for human help.
7. The conversation and messages are stored.

## Components

- **Next.js app:** dashboard, inbox, settings, customer chat, server-side API routes.
- **Supabase:** authentication, PostgreSQL, storage, pgvector, and Row Level Security.
- **AI provider:** server-side embeddings and answer generation behind a small provider interface.
- **n8n:** authenticated webhooks for routing, escalation, and approved follow-up workflows.

Provider API keys must only be available to server-side code. The browser must never call the model provider directly.

## Core data model

Every tenant-owned table includes `organization_id`. This is required for authorization and database-level tenant isolation.

### `organizations`

- `id` UUID primary key
- `name` text, required
- `created_by` UUID referencing `auth.users`
- `created_at` timestamptz

### `organization_members`

- `organization_id` UUID
- `user_id` UUID referencing `auth.users`
- `role` text constrained to `owner`, `admin`, or `agent`
- `created_at` timestamptz
- Primary key: `(organization_id, user_id)`

### `customers`

- `id` UUID primary key
- `organization_id` UUID
- `name` text, optional
- `email` text, optional
- `external_id` text, optional
- `created_at` timestamptz

### `conversations`

- `id` UUID primary key
- `organization_id` UUID
- `customer_id` UUID
- `status` text constrained to `open`, `pending`, `resolved`, or `escalated`
- `assigned_to` UUID referencing `auth.users`, optional
- `created_at` and `updated_at` timestamptz

### `messages`

- `id` UUID primary key
- `organization_id` UUID
- `conversation_id` UUID
- `sender_type` text constrained to `customer`, `agent`, or `assistant`
- `content` text, required
- `source_references` JSONB, optional
- `created_at` timestamptz

### `knowledge_sources`

- `id` UUID primary key
- `organization_id` UUID
- `name` text, required
- `source_type` text constrained to `faq`, `text`, or `pdf`
- `storage_path` text, optional
- `status` text constrained to `pending`, `processing`, `ready`, or `failed`
- `created_by` UUID referencing `auth.users`
- `created_at` and `updated_at` timestamptz

### `knowledge_chunks`

- `id` UUID primary key
- `organization_id` UUID
- `source_id` UUID
- `content` text, required
- `embedding` vector, dimension selected to match the provider
- `metadata` JSONB, optional
- `created_at` timestamptz

The retrieval query must filter by `organization_id` before ranking by vector similarity. Tenant filtering must not rely on prompt instructions.

### `tickets`

- `id` UUID primary key
- `organization_id` UUID
- `conversation_id` UUID
- `category` text
- `priority` text constrained to `low`, `normal`, `high`, or `urgent`
- `status` text constrained to `open`, `in_progress`, `resolved`, or `cancelled`
- `created_at` and `updated_at` timestamptz

### `workflow_events`

- `id` UUID primary key
- `organization_id` UUID
- `event_type` text
- `idempotency_key` text
- `status` text constrained to `pending`, `processing`, `completed`, or `failed`
- `payload` JSONB
- `last_error` text, optional
- `created_at` and `updated_at` timestamptz
- Unique constraint: `(organization_id, idempotency_key)`

### `ai_feedback`

- `id` UUID primary key
- `organization_id` UUID
- `message_id` UUID
- `rating` smallint constrained to `-1` or `1`
- `comment` text, optional
- `created_at` timestamptz

## Authorization and RLS

Create a database helper function such as `is_organization_member(target_organization_id uuid)` that checks whether `auth.uid()` has a row in `organization_members`.

RLS policies must enforce:

- Members can read only organizations they belong to.
- Members can read and modify tenant-owned records only when they belong to the record's `organization_id`.
- Customers and public chat sessions must not receive direct unrestricted table access.
- Only owners/admins can manage organization members and knowledge sources.
- Agents can read conversations and messages and update assigned workflow state according to the final role policy.
- Service-role operations are server-only and must still validate organization ownership before writes.

The final migration must include indexes on every `organization_id`, foreign keys, check constraints, and RLS enabled on every tenant-owned table.

## RAG flow

### Ingestion

1. Validate file type and size.
2. Store the original file in organization-scoped storage.
3. Extract and normalize text.
4. Split text into bounded, meaningful chunks.
5. Generate embeddings server-side.
6. Store chunks with `organization_id`, `source_id`, and source metadata.
7. Mark the source `ready`, or `failed` with an observable error.

### Answering

1. Identify the organization from the authenticated dashboard session or signed customer-chat configuration.
2. Validate and rate-limit the question.
3. Generate a query embedding.
4. Retrieve only chunks for that organization.
5. Apply a relevance threshold.
6. Ask the model to answer only from the retrieved context.
7. Validate the response shape and source references.
8. If evidence is insufficient, return a fallback and offer human assistance.
9. Save the question, answer, sources, latency, and outcome.
10. Emit an authenticated, idempotent workflow event when escalation is required.

The model may draft an answer and classify an inquiry. It may not send outbound messages, change business records, or perform consequential actions without an explicit server-side policy and human approval.

## Initial API boundaries

These are logical boundaries, not implementation commitments:

- `POST /api/organizations`
- `POST /api/knowledge-sources`
- `POST /api/knowledge-sources/:id/process`
- `GET /api/conversations`
- `GET /api/conversations/:id`
- `POST /api/conversations/:id/messages`
- `POST /api/chat`
- `POST /api/ai-feedback`
- `POST /api/workflow-events`

Every route must derive authorization from the authenticated session or a validated signed widget credential. Organization IDs supplied by clients must never override server-side authorization.

## Reliability and observability

- Use bounded timeouts and explicit retries for provider calls.
- Use idempotency keys for ingestion and n8n events.
- Store structured error logs without sensitive document contents.
- Record retrieval source IDs, fallback decisions, latency, and provider usage where available.
- Never return provider keys, raw stack traces, or internal authorization details to clients.

## Decisions deferred until implementation

- Exact LLM and embedding provider after checking free-tier limits and regional availability.
- Exact embedding dimension after provider selection.
- PDF extraction library.
- Whether a separate FastAPI service is justified; start in server-side Next.js unless processing needs prove otherwise.
- Public widget authentication format.

## Definition of done for the architecture milestone

- Schema and tenant boundaries are reviewed.
- RLS strategy is agreed before migrations.
- RAG flow and fallback behavior are explicit.
- External services and deferred decisions are identified.
- No Supabase project, external repository, or deployment is created without approval.
