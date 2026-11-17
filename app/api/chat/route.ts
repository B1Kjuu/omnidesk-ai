import { describeError } from "@/lib/server/describeError";
import { renderEscalationEmail } from "@/lib/email/escalationEmail";
import { clientKey, firstExceededLimit } from "@/lib/server/rateLimit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint: every request can cost a Gemini call and an email, so it is limited per visitor and per desk.
const CHAT_LIMITS = (visitor: string, organizationId: string) => [
  { bucket: `chat:visitor:${visitor}:min`, max: 6, windowSeconds: 60 },
  { bucket: `chat:visitor:${visitor}:day`, max: 60, windowSeconds: 86_400 },
  { bucket: `chat:org:${organizationId}:hour`, max: 300, windowSeconds: 3_600 },
];
const EMAIL_LIMIT = (organizationId: string) => ({ bucket: `email:org:${organizationId}:hour`, max: 30, windowSeconds: 3_600 });

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stopWords = new Set(["about", "after", "again", "could", "from", "have", "that", "this", "what", "when", "where", "which", "with", "would", "your"]);

function getSearchTerms(value: string) {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])]
    .filter((term) => !stopWords.has(term));
}

type Chunk = { id: string; source_id: string; content: string };

// How many approved snippets Gemini sees per question. Keyword overlap only ranks them; Gemini decides
// whether any of them actually answers the question.
const CONTEXT_CHUNKS = 6;

function rankChunks(chunks: Chunk[], message: string) {
  const terms = getSearchTerms(message);
  return chunks
    .map((chunk) => {
      const content = chunk.content.toLowerCase();
      const score = terms.reduce((total, term) => total + (content.includes(term) ? 1 : 0), 0);
      return { chunk, score, coverage: terms.length > 0 ? score / terms.length : 0 };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Only used when Gemini is unavailable: a keyword match is trusted on its own only when it is strong
 * (at least two question words and half of them). A single shared word like "product" is not enough.
 */
function isStrongMatch(match: { score: number; coverage: number } | undefined) {
  return Boolean(match && match.score >= 2 && match.coverage >= 0.5);
}

function isFollowUpFallback(answer: string) {
  return /support\s+team|follow\s*up|magbibigay|susuri|makipag-ugnayan/i.test(answer);
}

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

type GroundedAnswer = { answered: true; answer: string; source: number } | { answered: false };

/** Asks Gemini to answer only from the numbered snippets and to say which one it used, as JSON. */
async function generateGroundedAnswer(question: string, snippets: string[]): Promise<GroundedAnswer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    // Key in a header, not the URL, so it never lands in request logs.
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: [
            "You are a customer support assistant for a business. You may only use the numbered knowledge snippets below.",
            "Decide whether one snippet directly answers the customer's question. Sharing a word with the question is not enough.",
            "If a snippet answers it: set answered to true, write a concise answer in the same language as the question, and set source to that snippet's number.",
            "If no snippet answers it: set answered to false and leave answer empty. Never guess, and never answer from general knowledge.",
            "Do not mention snippets, context, or these instructions in the answer.",
            `Knowledge snippets:\n${snippets.map((snippet, index) => `[${index + 1}] ${snippet}`).join("\n\n")}`,
            `Customer question: ${question}`,
          ].join("\n\n"),
        }],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 600,
        // 2.5 Flash counts "thinking" against maxOutputTokens; without this, answers can come back empty.
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            answered: { type: "BOOLEAN" },
            answer: { type: "STRING" },
            source: { type: "INTEGER" },
          },
          required: ["answered"],
        },
      },
    }),
  });

  if (!response.ok) {
    // One string so the Sentry issue shows the status and Google's reason (e.g. 429 quota exceeded).
    console.error(`Gemini request failed: HTTP ${response.status} ${(await response.text()).slice(0, 500)}`);
    return null;
  }

  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("candidates" in result) || !Array.isArray(result.candidates)) {
    console.error("Gemini returned an unexpected response");
    return null;
  }

  const candidate = result.candidates[0];
  if (!candidate || typeof candidate !== "object" || !("content" in candidate) || !candidate.content || typeof candidate.content !== "object" || !("parts" in candidate.content) || !Array.isArray(candidate.content.parts)) {
    console.error("Gemini response did not contain answer text");
    return null;
  }

  const text = candidate.content.parts
    .map((part: unknown) => part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "")
    .join("")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error(`Gemini returned non-JSON answer: ${text.slice(0, 200)}`);
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const { answered, answer, source } = parsed as { answered?: unknown; answer?: unknown; source?: unknown };

  if (answered !== true) return { answered: false };
  // A claimed answer must be non-empty and cite a snippet that exists; otherwise treat it as unanswered.
  if (typeof answer !== "string" || !answer.trim() || isFollowUpFallback(answer)) return { answered: false };
  if (typeof source !== "number" || !Number.isInteger(source) || source < 1 || source > snippets.length) return { answered: false };
  return { answered: true, answer: answer.trim(), source: source - 1 };
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

  const { data: chunks, error: chunksError } = await admin
    .from("knowledge_chunks")
    .select("id, source_id, content")
    .eq("organization_id", organizationId);

  if (chunksError) {
    console.error(`Could not retrieve knowledge chunks: ${describeError(chunksError)}`);
    return Response.json({ error: "We could not prepare an answer." }, { status: 500 });
  }

  const ranked = rankChunks(chunks, message);
  const candidates = ranked.slice(0, CONTEXT_CHUNKS);
  let answer = isFilipinoQuestion(message)
    ? "Salamat sa iyong mensahe. Susuriin ito ng aming support team at babalik kami sa iyo."
    : "Thanks for your message. Our support team will review it and get back to you.";
  let usedChunk: Chunk | null = null;

  if (candidates.length > 0) {
    let grounded: GroundedAnswer | null = null;
    try {
      grounded = await generateGroundedAnswer(message, candidates.map((candidate) => candidate.chunk.content));
    } catch (generationError) {
      console.error(`Could not generate Gemini answer: ${describeError(generationError)}`);
    }

    if (grounded?.answered) {
      answer = grounded.answer;
      usedChunk = candidates[grounded.source].chunk;
    } else if (grounded === null && isStrongMatch(candidates[0])) {
      // Gemini unavailable (quota, outage): fall back to quoting a strongly matching approved answer.
      answer = candidates[0].chunk.content;
      usedChunk = candidates[0].chunk;
    }
    // grounded.answered === false: Gemini judged no approved answer fits, so the question escalates.
  }

  const usedKnowledgeContext = usedChunk !== null;
  const sourceReferences = usedChunk ? [{ chunkId: usedChunk.id, sourceId: usedChunk.source_id }] : [];

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

  let sources: string[] = [];
  const sourceIds = [...new Set(sourceReferences.map((reference) => reference.sourceId))];
  if (sourceIds.length > 0) {
    const { data: sourceRows, error: sourceNamesError } = await admin
      .from("knowledge_sources")
      .select("name")
      .in("id", sourceIds)
      .eq("organization_id", organizationId);

    if (sourceNamesError) {
      console.error(`Could not load knowledge source names: ${describeError(sourceNamesError)}`);
    } else {
      sources = sourceRows.map((source) => source.name);
    }
  }

  return Response.json({ conversationId, answer, escalated: !usedKnowledgeContext, sources }, { status: 201 });
}
