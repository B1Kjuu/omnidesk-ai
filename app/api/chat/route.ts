import { renderEscalationEmail } from "@/lib/email/escalationEmail";
import { citationExcerpt, decideAnswer } from "@/lib/server/ai/grounding";
import { retrieveCandidates } from "@/lib/server/ai/retrieve";
import { findCustomerConversation, newConversationToken } from "@/lib/server/conversationAccess";
import { describeError } from "@/lib/server/describeError";
import { clientKey, firstExceededLimit } from "@/lib/server/rateLimit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { notificationRecipient, sendWorkflowEmail } from "@/lib/server/workflowEmail";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint: every request can cost a Gemini call and an email, so it is limited per visitor and per desk.
const CHAT_LIMITS = (visitor: string, organizationId: string) => [
  { bucket: `chat:visitor:${visitor}:min`, max: 6, windowSeconds: 60 },
  { bucket: `chat:visitor:${visitor}:day`, max: 60, windowSeconds: 86_400 },
  { bucket: `chat:org:${organizationId}:hour`, max: 300, windowSeconds: 3_600 },
];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isFilipinoQuestion(question: string) {
  return /\b(kailan|kelan|makukuha|kuha|po|tol|salamat|ang|ng|mga|nais|gusto)\b/i.test(question);
}

/**
 * A customer message. Without conversationId it starts a conversation and returns a conversationToken
 * the browser keeps; with conversationId + conversationToken it continues that conversation.
 * Answers come only from approved knowledge; otherwise the conversation is handed to staff.
 */
export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") throw new Error("not an object");
    input = body as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const organizationId = typeof input.organizationId === "string" ? input.organizationId : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const turnstileToken = typeof input.turnstileToken === "string" ? input.turnstileToken : "";
  const existingId = typeof input.conversationId === "string" ? input.conversationId : "";
  const existingToken = typeof input.conversationToken === "string" ? input.conversationToken : "";

  if (!uuidPattern.test(organizationId)) {
    return Response.json({ error: "A valid organization is required." }, { status: 400 });
  }
  if (!name || name.length > 160 || !message || message.length > 5000 || email.length > 320 || (email && !emailPattern.test(email))) {
    return Response.json({ error: "Please check the submitted fields." }, { status: 400 });
  }

  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  if (!(await verifyTurnstile(turnstileToken, remoteIp, request.headers.get("host")))) {
    return Response.json({ error: "We could not confirm you are human. Refresh the page and try again." }, { status: 403 });
  }

  const admin = createAdminClient();
  const exceeded = await firstExceededLimit(admin, CHAT_LIMITS(await clientKey(request), organizationId));
  if (exceeded) {
    return Response.json(
      { error: "Too many questions in a short time. Please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(exceeded.windowSeconds) } },
    );
  }

  // 1. Start or continue the conversation and store the customer's message.
  let conversationId: string;
  let conversationToken: string | null = null;
  if (existingId) {
    const conversation = await findCustomerConversation(admin, existingId, existingToken);
    if (!conversation || conversation.organization_id !== organizationId) {
      return Response.json({ error: "This conversation could not be found. Start a new one." }, { status: 404 });
    }
    conversationId = conversation.id;
    const { error: messageError } = await admin
      .from("messages")
      .insert({ organization_id: organizationId, conversation_id: conversationId, sender_type: "customer", content: message });
    if (messageError) {
      console.error(`Could not save follow-up message: ${describeError(messageError)}`);
      return Response.json({ error: "We could not save your message." }, { status: 500 });
    }
    if (email) await admin.from("customers").update({ email }).eq("id", conversation.customer_id).is("email", null);
  } else {
    const { data, error } = await admin.rpc("create_public_conversation", {
      target_organization_id: organizationId,
      customer_name: name,
      customer_email: email,
      first_message: message,
    });
    if (error || !data[0]?.conversation_id) {
      console.error(`Could not create public conversation: ${describeError(error)}`);
      return Response.json({ error: "We could not save your message." }, { status: 500 });
    }
    conversationId = data[0].conversation_id;
    const access = newConversationToken();
    conversationToken = access.token;
    await admin.from("conversations").update({ customer_token_hash: access.hash }).eq("id", conversationId);
  }

  // 2. Retrieve approved knowledge and decide: grounded answer, or a person.
  let candidates;
  try {
    const retrieval = await retrieveCandidates(admin, organizationId, message);
    candidates = retrieval.candidates;
    if (retrieval.questionEmbedding) {
      // Kept on the customer's message so Insights can group unanswered questions by meaning without re-embedding.
      const { data: latest } = await admin
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("sender_type", "customer")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest) await admin.from("messages").update({ question_embedding: retrieval.questionEmbedding }).eq("id", latest.id);
    }
  } catch (retrievalError) {
    console.error(`Could not retrieve knowledge: ${describeError(retrievalError)}`);
    return Response.json({ error: "We could not prepare an answer." }, { status: 500 });
  }

  const decision = await decideAnswer(message, candidates);
  const usedPassage = decision.answered ? decision.used : null;
  const filipino = isFilipinoQuestion(message);

  // 3. No grounded answer: open a ticket and email the team, unless one is already open for this conversation.
  let alreadyWithStaff = false;
  if (!usedPassage) {
    const { data: openTicket } = await admin
      .from("tickets")
      .select("id")
      .eq("conversation_id", conversationId)
      .in("status", ["open", "in_progress"])
      .limit(1)
      .maybeSingle();
    alreadyWithStaff = Boolean(openTicket);

    if (!alreadyWithStaff) {
      const { data: ticket, error: ticketError } = await admin
        .from("tickets")
        .insert({ organization_id: organizationId, conversation_id: conversationId, category: "knowledge_gap", priority: "normal", status: "open" })
        .select("id")
        .single();
      if (ticketError || !ticket) {
        console.error(`Could not create escalation ticket: ${describeError(ticketError)}`);
        return Response.json({ error: "We could not create a support ticket." }, { status: 500 });
      }

      const recipient = await notificationRecipient(admin, organizationId);
      if (recipient.email) {
        const origin = process.env.SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
        await sendWorkflowEmail(admin, {
          organizationId,
          eventType: "conversation.escalated",
          idempotencyKey: `ticket:${ticket.id}:escalated`,
          summary: { conversationId, ticketId: ticket.id, customerName: name, customerEmail: email || null, customerMessage: message, ticketCategory: "knowledge_gap" },
          to: recipient.email,
          replyTo: email || recipient.email,
          email: renderEscalationEmail({
            organizationName: recipient.organizationName,
            customerName: name,
            customerEmail: email || null,
            question: message,
            askedAt: new Date(),
            dashboardUrl: `${origin}/dashboard/escalations`,
            settingsUrl: `${origin}/dashboard/organizations`,
          }),
          extra: { organizationName: recipient.organizationName },
        });
      } else {
        console.error(`No notification recipient for organization ${organizationId}`);
      }
    }

    await admin.from("conversations").update({ status: "escalated" }).eq("id", conversationId).eq("organization_id", organizationId);
  }

  // 4. Store and return the reply, with the quoted passage behind it.
  const answer = decision.answered
    ? decision.answer
    : alreadyWithStaff
      ? filipino
        ? "Naidagdag ang mensahe mo sa usapan. Makikita ito ng team at sasagot sila rito."
        : "Added to your conversation. The team will see it and reply here."
      : filipino
        ? "Salamat sa iyong mensahe. Susuriin ito ng aming support team at babalik kami sa iyo."
        : "Thanks for your message. Our support team will review it and get back to you.";
  const sourceReferences = usedPassage
    ? [{ chunkId: usedPassage.id, sourceId: usedPassage.sourceId, score: Number(usedPassage.score.toFixed(3)), method: usedPassage.method }]
    : [];

  const { error: assistantMessageError } = await admin.from("messages").insert({
    organization_id: organizationId,
    conversation_id: conversationId,
    sender_type: "assistant",
    content: answer,
    source_references: sourceReferences,
  });
  if (assistantMessageError) {
    console.error(`Could not save assistant response: ${describeError(assistantMessageError)}`);
    return Response.json({ error: "We could not save the assistant response." }, { status: 500 });
  }

  let sources: string[] = [];
  let citations: Array<{ source: string; quote: string; url: string | null }> = [];
  if (usedPassage) {
    const { data: sourceRow, error: sourceNameError } = await admin
      .from("knowledge_sources")
      .select("name, source_url")
      .eq("id", usedPassage.sourceId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (sourceNameError) {
      console.error(`Could not load knowledge source names: ${describeError(sourceNameError)}`);
    } else if (sourceRow) {
      sources = [sourceRow.name];
      citations = [{ source: sourceRow.name, quote: citationExcerpt(usedPassage.content), url: sourceRow.source_url }];
    }
  }

  return Response.json(
    { conversationId, conversationToken, answer, escalated: !usedPassage, withStaff: alreadyWithStaff, sources, citations },
    { status: existingId ? 200 : 201 },
  );
}
