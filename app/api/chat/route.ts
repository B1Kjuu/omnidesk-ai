import { describeError } from "@/lib/server/describeError";
import { renderEscalationEmail } from "@/lib/email/escalationEmail";
import { clientKey, firstExceededLimit } from "@/lib/server/rateLimit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { createAdminClient } from "@/lib/supabase/admin";
import { citationExcerpt, decideAnswer } from "@/lib/server/ai/grounding";
import { retrieveCandidates } from "@/lib/server/ai/retrieve";

// Public endpoint: every request can cost a Gemini call and an email, so it is limited per visitor and per desk.
const CHAT_LIMITS = (visitor: string, organizationId: string) => [
  { bucket: `chat:visitor:${visitor}:min`, max: 6, windowSeconds: 60 },
  { bucket: `chat:visitor:${visitor}:day`, max: 60, windowSeconds: 86_400 },
  { bucket: `chat:org:${organizationId}:hour`, max: 300, windowSeconds: 3_600 },
];
const EMAIL_LIMIT = (organizationId: string) => ({ bucket: `email:org:${organizationId}:hour`, max: 30, windowSeconds: 3_600 });

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isFilipinoQuestion(question: string) {
  return /\b(kailan|kelan|makukuha|kuha|po|tol|salamat|ang|ng|mga|nais|gusto)\b/i.test(question);
}

async function deliverEscalationWebhook(url: string, payload: Record<string, unknown>) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  // Matches an n8n "Header Auth" credential so only OmniDesk can trigger the Gmail workflow.
  if (process.env.N8N_WEBHOOK_SECRET) headers["x-omnidesk-secret"] = process.env.N8N_WEBHOOK_SECRET;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook returned HTTP ${response.status}`);
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const organizationId = typeof input.organizationId === "string" ? input.organizationId : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const turnstileToken = typeof input.turnstileToken === "string" ? input.turnstileToken : "";

  if (!uuidPattern.test(organizationId)) {
    return Response.json({ error: "A valid organization is required." }, { status: 400 });
  }
  if (!name || name.length > 160 || !message || message.length > 5000 || email.length > 320) {
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

  const { data, error } = await admin.rpc("create_public_conversation", {
    target_organization_id: organizationId,
    customer_name: name,
    customer_email: email,
    first_message: message,
  });

  if (error) {
    console.error(`Could not create public conversation: ${describeError(error)}`);
    return Response.json({ error: "We could not save your message." }, { status: 500 });
  }

  const conversationId = data[0]?.conversation_id;
  if (!conversationId) {
    console.error("Public conversation was created without an id");
    return Response.json({ error: "We could not start the conversation." }, { status: 500 });
  }

  let candidates;
  try {
    candidates = await retrieveCandidates(admin, organizationId, message);
  } catch (retrievalError) {
    console.error(`Could not retrieve knowledge: ${describeError(retrievalError)}`);
    return Response.json({ error: "We could not prepare an answer." }, { status: 500 });
  }

  // Threshold, then Gemini judging whether a passage really answers; anything else escalates.
  const decision = await decideAnswer(message, candidates);
  const answer = decision.answered
    ? decision.answer
    : isFilipinoQuestion(message)
      ? "Salamat sa iyong mensahe. Susuriin ito ng aming support team at babalik kami sa iyo."
      : "Thanks for your message. Our support team will review it and get back to you.";
  const usedPassage = decision.answered ? decision.used : null;
  const usedKnowledgeContext = usedPassage !== null;
  const sourceReferences = usedPassage
    ? [{ chunkId: usedPassage.id, sourceId: usedPassage.sourceId, score: Number(usedPassage.score.toFixed(3)), method: usedPassage.method }]
    : [];

  if (!usedKnowledgeContext) {
    const { error: ticketError } = await admin.from("tickets").insert({
      organization_id: organizationId,
      conversation_id: conversationId,
      category: "knowledge_gap",
      priority: "normal",
      status: "open",
    });

    if (ticketError) {
      console.error(`Could not create escalation ticket: ${describeError(ticketError)}`);
      return Response.json({ error: "We could not create a support ticket." }, { status: 500 });
    }

    const { error: escalationError } = await admin
      .from("conversations")
      .update({ status: "escalated" })
      .eq("id", conversationId)
      .eq("organization_id", organizationId);

    if (escalationError) {
      console.error(`Could not mark conversation as escalated: ${describeError(escalationError)}`);
      return Response.json({ error: "We could not update the conversation status." }, { status: 500 });
    }

    const { data: workflowEvent, error: workflowEventError } = await admin.from("workflow_events").insert({
      organization_id: organizationId,
      event_type: "conversation.escalated",
      idempotency_key: `conversation:${conversationId}:escalated`,
      payload: {
        conversationId,
        customerName: name,
        customerEmail: email || null,
        customerMessage: message,
        ticketCategory: "knowledge_gap",
      },
    }).select("id").single();

    if (workflowEventError) {
      console.error(`Could not create escalation workflow event: ${describeError(workflowEventError)}`);
      return Response.json({ error: "We could not queue the escalation workflow." }, { status: 500 });
    }

    const webhookUrl = process.env.N8N_ESCALATION_WEBHOOK_URL;
    const emailCapped = webhookUrl ? await firstExceededLimit(admin, [EMAIL_LIMIT(organizationId)]) : null;
    if (webhookUrl && emailCapped) {
      await admin
        .from("workflow_events")
        .update({ status: "failed", last_error: "Hourly email limit reached; the ticket is still open in the dashboard." })
        .eq("id", workflowEvent.id);
    } else if (webhookUrl) {
      await admin
        .from("workflow_events")
        .update({ status: "processing" })
        .eq("id", workflowEvent.id);

      try {
        const [{ data: organization }, { data: configuredRecipient, error: recipientError }] = await Promise.all([
          admin.from("organizations").select("name, created_by").eq("id", organizationId).single(),
          admin.rpc("get_notification_recipient", { target_organization_id: organizationId }),
        ]);
        let notifyEmail = configuredRecipient;
        if (recipientError || !notifyEmail) {
          // Fallback keeps emails flowing even before the notification migration is applied.
          if (recipientError) console.error(`Notification recipient lookup failed, using creator email: ${describeError(recipientError)}`);
          const creator = organization ? await admin.auth.admin.getUserById(organization.created_by) : null;
          notifyEmail = creator?.data.user?.email ?? null;
        }
        if (!notifyEmail) {
          throw new Error("No notification recipient for this organization");
        }

        const origin = process.env.SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
        const organizationName = organization?.name ?? "your desk";
        const emailContent = renderEscalationEmail({
          organizationName,
          customerName: name,
          customerEmail: email || null,
          question: message,
          askedAt: new Date(),
          dashboardUrl: `${origin}/dashboard/escalations`,
          settingsUrl: `${origin}/dashboard/organizations`,
        });

        await deliverEscalationWebhook(webhookUrl, {
          eventId: workflowEvent.id,
          eventType: "conversation.escalated",
          organizationId,
          organizationName,
          conversationId,
          customerName: name,
          customerEmail: email || null,
          customerMessage: message,
          ticketCategory: "knowledge_gap",
          notifyEmail,
          replyTo: email || notifyEmail,
          email: emailContent,
        });

        await admin
          .from("workflow_events")
          .update({ status: "completed" })
          .eq("id", workflowEvent.id);
      } catch (webhookError) {
        const errorMessage = webhookError instanceof Error ? webhookError.message : "Unknown n8n webhook error";
        console.error(`Could not deliver escalation workflow event: ${describeError(webhookError)}`);
        await admin
          .from("workflow_events")
          .update({ status: "failed", last_error: errorMessage })
          .eq("id", workflowEvent.id);
      }
    }
  }

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

  // Citation: which approved source answered, plus the exact passage, so customers and staff can check it.
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

  return Response.json({ conversationId, answer, escalated: !usedKnowledgeContext, sources, citations }, { status: 201 });
}
