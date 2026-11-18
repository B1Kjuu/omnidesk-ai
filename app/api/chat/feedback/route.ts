import { findCustomerConversation } from "@/lib/server/conversationAccess";
import { clientKey, firstExceededLimit } from "@/lib/server/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";

/** A customer rates one of OmniDesk's answers in their own conversation: 1 helpful, -1 not helpful. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { conversationId?: unknown; conversationToken?: unknown; messageId?: unknown; rating?: unknown } | null;
  const rating = body?.rating === 1 || body?.rating === -1 ? body.rating : null;
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  if (!rating || !messageId) return Response.json({ error: "Invalid rating." }, { status: 400 });

  const admin = createAdminClient();
  if (await firstExceededLimit(admin, [{ bucket: `feedback:${await clientKey(request)}:hour`, max: 60, windowSeconds: 3_600 }])) {
    return Response.json({ error: "Too many ratings." }, { status: 429 });
  }

  const conversation = await findCustomerConversation(
    admin,
    typeof body?.conversationId === "string" ? body.conversationId : "",
    typeof body?.conversationToken === "string" ? body.conversationToken : "",
  );
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });

  // Only OmniDesk's own answers in this customer's conversation can be rated.
  const { data: message } = await admin
    .from("messages")
    .select("id")
    .eq("id", messageId)
    .eq("conversation_id", conversation.id)
    .eq("sender_type", "assistant")
    .maybeSingle();
  if (!message) return Response.json({ error: "Answer not found." }, { status: 404 });

  const { error } = await admin
    .from("ai_feedback")
    .upsert({ organization_id: conversation.organization_id, message_id: message.id, rating }, { onConflict: "message_id" });
  if (error) return Response.json({ error: "The rating could not be saved." }, { status: 500 });
  return Response.json({ rating });
}
