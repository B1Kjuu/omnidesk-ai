import { renderReplyEmail } from "@/lib/email/replyEmail";
import { publicOrigin } from "@/lib/publicOrigin";
import { describeError } from "@/lib/server/describeError";
import { notificationRecipient, sendWorkflowEmail } from "@/lib/server/workflowEmail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_REPLY = 5000;

/**
 * A staff reply. Saved with the staff member's own session (RLS: members of the conversation's
 * organization, as themselves), then emailed to the customer if they left an address.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/conversations/[id]/reply">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return Response.json({ error: "Sign in again to reply." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content || content.length > MAX_REPLY) return Response.json({ error: "Write a reply (up to 5,000 characters)." }, { status: 400 });

  // Read through RLS: if this user is not a member of the organization, no row comes back.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, organization_id, customers(name, email), organizations(name, slug)")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });

  const { data: saved, error: insertError } = await supabase
    .from("messages")
    .insert({ organization_id: conversation.organization_id, conversation_id: conversation.id, sender_type: "agent", content, author_id: userId })
    .select("id, created_at")
    .single();
  if (insertError || !saved) {
    console.error(`Could not save staff reply: ${describeError(insertError)}`);
    return Response.json({ error: "The reply could not be saved." }, { status: 500 });
  }

  // A reply means someone is on it.
  await supabase.from("tickets").update({ status: "in_progress" }).eq("conversation_id", conversation.id).eq("status", "open");

  const customerEmail = conversation.customers?.email ?? null;
  if (!customerEmail) {
    return Response.json({ messageId: saved.id, emailed: false, reason: "no_customer_email" }, { status: 201 });
  }

  const admin = createAdminClient();
  const [{ data: lastQuestion }, recipient] = await Promise.all([
    admin.from("messages").select("content").eq("conversation_id", conversation.id).eq("sender_type", "customer").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    notificationRecipient(admin, conversation.organization_id),
  ]);
  const origin = publicOrigin() ?? new URL(request.url).origin;
  const organizationName = conversation.organizations?.name ?? recipient.organizationName;
  const chatUrl = `${origin}/chat/${conversation.organizations?.slug ?? conversation.organization_id}`;

  const result = await sendWorkflowEmail(admin, {
    organizationId: conversation.organization_id,
    eventType: "conversation.replied",
    idempotencyKey: `message:${saved.id}:replied`,
    summary: { conversationId: conversation.id, messageId: saved.id, customerName: conversation.customers?.name ?? "", customerEmail },
    to: customerEmail,
    // Customer replies to the email go to the organization's contact, not to a no-reply address.
    replyTo: recipient.email ?? customerEmail,
    email: renderReplyEmail({
      organizationName,
      customerName: conversation.customers?.name ?? "",
      question: lastQuestion?.content ?? null,
      reply: content,
      chatUrl,
    }),
    extra: { organizationName },
  });

  return Response.json({ messageId: saved.id, emailed: result.sent, reason: result.reason ?? null }, { status: 201 });
}
