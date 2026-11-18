import { citationExcerpt } from "@/lib/server/ai/grounding";
import { findCustomerConversation } from "@/lib/server/conversationAccess";
import { clientKey, firstExceededLimit } from "@/lib/server/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";

type Reference = { chunkId?: unknown; sourceId?: unknown };

/**
 * A returning customer's conversation: their messages, OmniDesk's answers with citations, and staff replies.
 * POST so the access token travels in the body, never in a URL or access log.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { conversationId?: unknown; conversationToken?: unknown } | null;
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";
  const token = typeof body?.conversationToken === "string" ? body.conversationToken : "";

  const admin = createAdminClient();
  // The chat page polls while a person is expected to reply; this keeps a stuck tab from hammering the database.
  if (await firstExceededLimit(admin, [{ bucket: `thread:${await clientKey(request)}:min`, max: 40, windowSeconds: 60 }])) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const conversation = await findCustomerConversation(admin, conversationId, token);
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });

  const [{ data: messages }, { data: customer }, { data: openTicket }] = await Promise.all([
    admin.from("messages").select("id, sender_type, content, created_at, source_references").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(200),
    admin.from("customers").select("name, email").eq("id", conversation.customer_id).maybeSingle(),
    admin.from("tickets").select("id").eq("conversation_id", conversation.id).in("status", ["open", "in_progress"]).limit(1).maybeSingle(),
  ]);

  // Resolve citations for grounded answers: the quoted passage and its source's name and link.
  const references = (messages ?? []).flatMap((message) => (Array.isArray(message.source_references) ? (message.source_references as Reference[]) : []));
  const chunkIds = [...new Set(references.map((reference) => reference.chunkId).filter((id): id is string => typeof id === "string"))];
  const sourceIds = [...new Set(references.map((reference) => reference.sourceId).filter((id): id is string => typeof id === "string"))];
  const answerIds = (messages ?? []).filter((message) => message.sender_type === "assistant").map((message) => message.id);
  const [{ data: chunks }, { data: sources }, { data: feedback }] = await Promise.all([
    chunkIds.length ? admin.from("knowledge_chunks").select("id, content").in("id", chunkIds).eq("organization_id", conversation.organization_id) : Promise.resolve({ data: [] }),
    sourceIds.length ? admin.from("knowledge_sources").select("id, name, source_url").in("id", sourceIds).eq("organization_id", conversation.organization_id) : Promise.resolve({ data: [] }),
    answerIds.length ? admin.from("ai_feedback").select("message_id, rating").in("message_id", answerIds) : Promise.resolve({ data: [] }),
  ]);
  const ratings = new Map((feedback ?? []).map((row) => [row.message_id, row.rating]));
  const chunkText = new Map((chunks ?? []).map((chunk) => [chunk.id, chunk.content]));
  const sourceInfo = new Map((sources ?? []).map((source) => [source.id, source]));

  return Response.json({
    status: conversation.status,
    waitingForStaff: Boolean(openTicket),
    customer: { name: customer?.name ?? "", email: customer?.email ?? null },
    messages: (messages ?? []).map((message) => {
      const refs = Array.isArray(message.source_references) ? (message.source_references as Reference[]) : [];
      const citations = refs.flatMap((reference) => {
        const source = typeof reference.sourceId === "string" ? sourceInfo.get(reference.sourceId) : undefined;
        if (!source) return [];
        const quote = typeof reference.chunkId === "string" ? chunkText.get(reference.chunkId) : undefined;
        return [{ source: source.name, quote: quote ? citationExcerpt(quote) : "", url: source.source_url }];
      });
      return {
        id: message.id,
        sender: message.sender_type,
        content: message.content,
        createdAt: message.created_at,
        grounded: refs.length > 0,
        citations,
        rating: ratings.get(message.id) ?? null,
      };
    }),
  });
}
