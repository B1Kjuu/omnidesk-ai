import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Drafts an FAQ entry for a knowledge gap. The facts come only from what staff already replied to those
 * customers; with no staff reply there is nothing to ground an answer in, so the answer is left for a person.
 * Owners and admins only. Nothing is saved: staff edit the draft, then publish it through /api/knowledge.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return Response.json({ error: "Sign in again." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { organizationId?: unknown; questions?: unknown; staffReplies?: unknown } | null;
  const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
  const strings = (value: unknown, max: number) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 1000)).slice(0, max) : []);
  const questions = strings(body?.questions, 6);
  const staffReplies = strings(body?.staffReplies, 5);
  if (!uuidPattern.test(organizationId) || questions.length === 0) return Response.json({ error: "Nothing to draft from." }, { status: 400 });

  const { data: isAdmin } = await supabase.rpc("is_organization_admin", { target_organization_id: organizationId });
  if (!isAdmin) return Response.json({ error: "Only owners and admins can add knowledge." }, { status: 403 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ question: questions[0], answer: "", grounded: false });

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite"}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: [
            "You write FAQ entries for a business's customer support knowledge base.",
            "Write one clear, general FAQ question that covers all of the customer questions below, in English.",
            "Write the answer using ONLY facts stated in the staff replies. Do not add facts, prices, dates, or promises that are not in them.",
            "If there are no staff replies, or they do not answer the question, set answer to an empty string.",
            `Customer questions:\n${questions.map((question) => `- ${question}`).join("\n")}`,
            `Staff replies:\n${staffReplies.length ? staffReplies.map((reply) => `- ${reply}`).join("\n") : "(none)"}`,
          ].join("\n\n"),
        }],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", properties: { question: { type: "STRING" }, answer: { type: "STRING" } }, required: ["question", "answer"] },
      },
    }),
  }).catch(() => null);

  try {
    if (!response?.ok) throw new Error("model unavailable");
    const result = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const draft = JSON.parse(result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "{}") as { question?: string; answer?: string };
    const answer = (draft.answer ?? "").trim();
    return Response.json({ question: (draft.question ?? questions[0]).trim(), answer, grounded: answer.length > 0 && staffReplies.length > 0 });
  } catch {
    // Fall back to an editable draft rather than an error: the question is known even if the model is not available.
    return Response.json({ question: questions[0], answer: staffReplies[0] ?? "", grounded: false });
  }
}
