# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary audience (confirmed 2026-11-17): hiring managers and technical reviewers** evaluating the owner as a full-stack developer and AI engineer. OmniDesk is the flagship project of the owner's portfolio. They arrive from the portfolio site or a resume link, usually on a laptop, and spend a few minutes deciding whether the engineering is real.
- **In-product roles the app must serve credibly:** support-team members (owner, admin, agent roles) who sign in to a tenant workspace, maintain approved knowledge, and handle escalated conversations; and end customers of a business who ask questions through a public chat page without signing in.

## Product Purpose

OmniDesk is a multi-tenant customer-support platform. It answers customers only from a business's approved knowledge and hands the conversation to a person when the evidence is insufficient. Success for the portfolio: a reviewer understands the mechanism within one viewport, can try it live, and leaves convinced the system is production-grade (tenant isolation, grounding, escalation, automation).

## Positioning

The answer is grounded or it is escalated; OmniDesk does not improvise. Every customer answer is drawn from organization-scoped knowledge, and anything the knowledge cannot support becomes a human ticket and an automation event, not a guess.

## Operating Context

- Customer flow: a public chat page per organization (`/chat/[organizationId]`). Each submitted message creates a conversation, retrieves that organization's knowledge, and returns a Gemini answer or a fallback that escalates.
- Team flow: sign in at `/auth`, then use one dashboard (`/dashboard`) for organizations, inbox, escalation tickets (priority and status), knowledge sources (FAQ create/edit/delete), and automation events.
- Escalation emits a `conversation.escalated` workflow event delivered to an Azure-hosted n8n webhook that sends a Gmail notification.

## Capabilities and Constraints

- Stack: Next.js 16 App Router, React, TypeScript, Tailwind CSS v4, Supabase (Auth, Postgres, Row Level Security), Gemini, n8n.
- Tenant isolation is enforced by Postgres RLS; the public chat page uses a server-only admin client.
- Data vocabulary: conversation status `open | pending | resolved | escalated`; ticket status `open | in_progress | resolved | cancelled`; ticket priority `low | normal | high | urgent`; message sender `customer | assistant | agent`; knowledge source type `faq | text | pdf` and status `pending | processing | ready | failed`; workflow event status `pending | processing | completed | failed`.
- Not built yet: PDF extraction, agent replies from the dashboard, multi-turn customer threads (each chat message is its own conversation), vector search.
- Production: Supabase Cloud project and Vercel deployment.

## Brand Commitments

- Name: "OmniDesk AI".
- Standalone project; must not depend on or visually borrow from the owner's portfolio site (Portfolio-2027).

## Evidence on Hand

- Working, deployed product and its real flows; no screenshots, metrics, customers, or testimonials exist.
- Do not invent customers, usage numbers, uptime, pricing, or testimonials. Demonstration conversations on the landing page must be labeled as examples.

## Product Principles

1. Show the mechanism, do not claim it: a reviewer should see grounding and escalation happen.
2. Honesty over polish: every state the system can be in (grounded, escalated, failed delivery) is visible and named plainly.
3. Tenant boundaries are part of the product, not plumbing; surfaces make clear which organization data belongs to.
4. Operational screens favour scanability and quick action over decoration.
