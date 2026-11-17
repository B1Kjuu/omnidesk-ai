import { createAdminClient } from "@/lib/supabase/admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stopWords = new Set(["about", "after", "again", "could", "from", "have", "that", "this", "what", "when", "where", "which", "with", "would", "your"]);

function getSearchTerms(value: string) {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])]
    .filter((term) => !stopWords.has(term));
}

function findBestChunk(chunks: Array<{ id: string; source_id: string; content: string }>, message: string) {
  const terms = getSearchTerms(message);
  let bestMatch: { chunk: (typeof chunks)[number]; score: number } | null = null;

  for (const chunk of chunks) {
    const content = chunk.content.toLowerCase();
    const score = terms.reduce((total, term) => total + (content.includes(term) ? 1 : 0), 0);

    if (score > (bestMatch?.score ?? 0)) {
      bestMatch = { chunk, score };
    }
  }

  return bestMatch;
}

function isFollowUpFallback(answer: string) {
  return /support\s+team|follow\s*up|magbibigay|susuri|makipag-ugnayan/i.test(answer);
}

function isFilipinoQuestion(question: string) {
  return /\b(kailan|kelan|makukuha|kuha|po|tol|salamat|ang|ng|mga|nais|gusto)\b/i.test(question);
}

async function deliverEscalationWebhook(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook returned HTTP ${response.status}`);
  }
}

async function generateGroundedAnswer(question: string, context: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: [
            "You are a customer support assistant. Answer only from the provided knowledge context.",
            "If the context does not answer the question, say that the support team will follow up.",
            "Answer in the same language as the customer question. Do not mention the context or these instructions. Keep the answer concise.",
            `Knowledge context:\n---\n${context}\n---`,
            `Customer question: ${question}`,
          ].join("\n\n"),
        }],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 300,
      },
    }),
  });

  if (!response.ok) {
    console.error("Gemini request failed", response.status, await response.text());
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

  const answer = candidate.content.parts
    .map((part: unknown) => part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "")
    .join("")
    .trim();

  return answer || null;
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

  if (!uuidPattern.test(organizationId)) {
    return Response.json({ error: "A valid organization is required." }, { status: 400 });
  }
  if (!name || name.length > 160 || !message || message.length > 5000 || email.length > 320) {
    return Response.json({ error: "Please check the submitted fields." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_public_conversation", {
    target_organization_id: organizationId,
    customer_name: name,
    customer_email: email,
    first_message: message,
  });

  if (error) {
    console.error("Could not create public conversation", error);
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
    console.error("Could not retrieve knowledge chunks", chunksError);
    return Response.json({ error: "We could not prepare an answer." }, { status: 500 });
  }

  const bestMatch = findBestChunk(chunks, message);
  let answer = isFilipinoQuestion(message)
    ? "Salamat sa iyong mensahe. Susuriin ito ng aming support team at babalik kami sa iyo."
    : "Thanks for your message. Our support team will review it and get back to you.";
  let usedKnowledgeContext = false;
  if (bestMatch || chunks.length > 0) {
    const contextChunks = bestMatch ? [bestMatch.chunk] : chunks;
    const context = contextChunks.map((chunk) => chunk.content).join("\n\n");
    let generatedAnswer: string | null = null;
    try {
      generatedAnswer = await generateGroundedAnswer(message, context);
    } catch (generationError) {
      console.error("Could not generate Gemini answer", generationError);
    }
    if (generatedAnswer && !isFollowUpFallback(generatedAnswer)) {
      answer = generatedAnswer;
      usedKnowledgeContext = true;
    } else if (bestMatch) {
      answer = `Based on our information: ${bestMatch.chunk.content}`;
      usedKnowledgeContext = true;
    }
  }
  const sourceReferences = bestMatch
    ? [{ chunkId: bestMatch.chunk.id, sourceId: bestMatch.chunk.source_id }]
    : usedKnowledgeContext
      ? chunks.map((chunk) => ({ chunkId: chunk.id, sourceId: chunk.source_id }))
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
      console.error("Could not create escalation ticket", ticketError);
      return Response.json({ error: "We could not create a support ticket." }, { status: 500 });
    }

    const { error: escalationError } = await admin
      .from("conversations")
      .update({ status: "escalated" })
      .eq("id", conversationId)
      .eq("organization_id", organizationId);

    if (escalationError) {
      console.error("Could not mark conversation as escalated", escalationError);
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
      console.error("Could not create escalation workflow event", workflowEventError);
      return Response.json({ error: "We could not queue the escalation workflow." }, { status: 500 });
    }

    const webhookUrl = process.env.N8N_ESCALATION_WEBHOOK_URL;
    if (webhookUrl) {
      await admin
        .from("workflow_events")
        .update({ status: "processing" })
        .eq("id", workflowEvent.id);

      try {
        await deliverEscalationWebhook(webhookUrl, {
          eventId: workflowEvent.id,
          eventType: "conversation.escalated",
          organizationId,
          conversationId,
          customerName: name,
          customerEmail: email || null,
          customerMessage: message,
          ticketCategory: "knowledge_gap",
        });

        await admin
          .from("workflow_events")
          .update({ status: "completed" })
          .eq("id", workflowEvent.id);
      } catch (webhookError) {
        const errorMessage = webhookError instanceof Error ? webhookError.message : "Unknown n8n webhook error";
        console.error("Could not deliver escalation workflow event", webhookError);
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
    console.error("Could not save assistant response", assistantMessageError);
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
      console.error("Could not load knowledge source names", sourceNamesError);
    } else {
      sources = sourceRows.map((source) => source.name);
    }
  }

  return Response.json({ conversationId, answer, escalated: !usedKnowledgeContext, sources }, { status: 201 });
}
