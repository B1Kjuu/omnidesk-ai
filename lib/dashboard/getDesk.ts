import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ConversationItem } from "@/components/dashboard/ConversationList";
import type { TicketItem } from "@/components/dashboard/TicketList";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

function getSourceIds(references: Json): string[] {
  if (!Array.isArray(references)) return [];
  return references.flatMap((reference) =>
    reference && typeof reference === "object" && !Array.isArray(reference) && typeof reference.sourceId === "string" ? [reference.sourceId] : [],
  );
}

export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Everything the desk shows, loaded once per request and shared by the layout and the page. */
export const getDesk = cache(async () => {
  await connection();
  const supabase = await createClient();
  // getClaims verifies the JWT locally (asymmetric signing keys), saving a round trip to the Auth server
  // on every dashboard request. Data access is still enforced by RLS in Postgres.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) {
    redirect("/auth?reason=session-expired");
  }

  const [organizationsResult, conversationsResult, ticketsResult, workflowEventsResult, knowledgeSourcesResult, knowledgeChunksResult] = await Promise.all([
    supabase.from("organizations").select("id, name").order("created_at", { ascending: true }),
    supabase
      .from("conversations")
      .select("id, organization_id, status, created_at, customers(name, email), messages(id, sender_type, content, created_at, source_references)")
      .order("created_at", { ascending: false }),
    supabase
      .from("tickets")
      .select("id, organization_id, conversation_id, category, priority, status, created_at, conversations(customers(name, email))")
      .order("created_at", { ascending: false }),
    supabase.from("workflow_events").select("id, event_type, status, last_error, created_at").order("created_at", { ascending: false }),
    supabase
      .from("knowledge_sources")
      .select("id, organization_id, name, source_type, status, created_at, organizations(name)")
      .order("created_at", { ascending: false }),
    supabase.from("knowledge_chunks").select("source_id, content").order("created_at", { ascending: true }),
  ]);

  for (const [label, result] of [
    ["organizations", organizationsResult],
    ["conversations", conversationsResult],
    ["tickets", ticketsResult],
    ["workflow events", workflowEventsResult],
    ["knowledge sources", knowledgeSourcesResult],
    ["knowledge chunks", knowledgeChunksResult],
  ] as const) {
    if (result.error) {
      throw new Error(`Could not load ${label}: ${result.error.message}`);
    }
  }

  const organizations = organizationsResult.data ?? [];
  const conversations = conversationsResult.data ?? [];
  const tickets = ticketsResult.data ?? [];
  const workflowEvents = workflowEventsResult.data ?? [];
  const knowledgeSources = knowledgeSourcesResult.data ?? [];
  const knowledgeChunks = knowledgeChunksResult.data ?? [];

  const multipleOrganizations = organizations.length > 1;
  const organizationNames = new Map(organizations.map((organization) => [organization.id, organization.name]));
  const sourceNames = new Map(knowledgeSources.map((source) => [source.id, source.name]));

  const conversationItems: ConversationItem[] = conversations.map((conversation) => ({
    id: conversation.id,
    status: conversation.status,
    created_at: conversation.created_at,
    organization_name: multipleOrganizations ? organizationNames.get(conversation.organization_id) ?? null : null,
    customer_name: conversation.customers?.name ?? "Unnamed customer",
    customer_email: conversation.customers?.email ?? null,
    messages: [...(conversation.messages ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((message) => {
        const sourceIds = getSourceIds(message.source_references);
        return {
          id: message.id,
          sender_type: message.sender_type,
          content: message.content,
          created_at: message.created_at,
          grounded: sourceIds.length > 0,
          sources: [...new Set(sourceIds.flatMap((id) => sourceNames.get(id) ?? []))],
        };
      }),
  }));

  const firstQuestionByConversation = new Map(
    conversationItems.map((conversation) => [conversation.id, conversation.messages.find((message) => message.sender_type === "customer")?.content ?? null]),
  );

  const ticketItems: TicketItem[] = tickets.map((ticket) => ({
    id: ticket.id,
    organization_id: ticket.organization_id,
    organization_name: multipleOrganizations ? organizationNames.get(ticket.organization_id) ?? null : null,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    created_at: ticket.created_at,
    customer_name: ticket.conversations?.customers?.name ?? "Unnamed customer",
    customer_email: ticket.conversations?.customers?.email ?? null,
    question: firstQuestionByConversation.get(ticket.conversation_id) ?? null,
  }));

  const sourceItems = knowledgeSources.map((source) => ({
    id: source.id,
    organization_id: source.organization_id,
    organization_name: source.organizations?.name ?? "Unknown organization",
    name: source.name,
    source_type: source.source_type,
    status: source.status,
    content: knowledgeChunks.find((chunk) => chunk.source_id === source.id)?.content ?? "",
  }));

  const openTickets = ticketItems.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress");
  const failedEvents = workflowEvents.filter((event) => event.status === "failed");

  return {
    email: typeof claims.email === "string" ? claims.email : "",
    organizations,
    multipleOrganizations,
    conversations: conversationItems,
    tickets: ticketItems,
    openTickets,
    sources: sourceItems,
    workflowEvents,
    failedEvents,
    chatHref: organizations.length > 0 ? `/chat/${organizations[0].id}` : null,
  };
});

export type Desk = Awaited<ReturnType<typeof getDesk>>;
