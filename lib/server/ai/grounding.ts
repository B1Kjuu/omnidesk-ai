/**
 * Turns retrieved passages into a grounded answer or an escalation. Shared by /api/chat and the
 * evaluation script (scripts/eval.mts), so the eval measures exactly what production runs.
 */

export type Candidate = {
  id: string;
  sourceId: string;
  content: string;
  /** Cosine similarity for semantic matches; keyword coverage (0–1) for the keyword fallback. */
  score: number;
  method: "semantic" | "keyword";
};

export type Decision =
  | { answered: true; answer: string; used: Candidate; reason: "grounded" | "model_unavailable_strong_match" }
  | { answered: false; reason: "no_knowledge" | "below_threshold" | "model_declined" | "model_unavailable" };

/** Passages Gemini sees per question. */
export const CONTEXT_PASSAGES = 6;
/**
 * Below this cosine similarity a passage is not considered related at all, and the question escalates
 * without spending a model call. Calibrated with `npm run eval` (unrelated questions score ~0.60–0.64
 * against unrelated FAQs with gemini-embedding-2, related ones ~0.70+).
 */
export const MIN_SIMILARITY = Number(process.env.RETRIEVAL_MIN_SIMILARITY ?? 0.62);
/** When Gemini is unavailable, quote a passage directly only if it is this close. */
export const STRONG_SIMILARITY = 0.78;

const stopWords = new Set(["about", "after", "again", "could", "from", "have", "that", "this", "what", "when", "where", "which", "with", "would", "your"]);

function searchTerms(value: string) {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter((term) => !stopWords.has(term));
}

/** Fallback ranking when embeddings are unavailable: share of question words found in each passage. */
export function keywordCandidates(chunks: Array<{ id: string; source_id: string; content: string }>, question: string): Candidate[] {
  const terms = searchTerms(question);
  return chunks
    .map((chunk) => {
      const content = chunk.content.toLowerCase();
      const hits = terms.reduce((total, term) => total + (content.includes(term) ? 1 : 0), 0);
      return { id: chunk.id, sourceId: chunk.source_id, content: chunk.content, score: terms.length ? hits / terms.length : 0, hits, method: "keyword" as const };
    })
    .sort((a, b) => b.hits - a.hits || b.score - a.score)
    .slice(0, CONTEXT_PASSAGES)
    .map(({ hits, ...candidate }) => ({ ...candidate, score: hits >= 2 ? candidate.score : 0 }));
}

function isFollowUpFallback(answer: string) {
  return /support\s+team|follow\s*up|magbibigay|susuri|makipag-ugnayan/i.test(answer);
}

type ModelAnswer = { answered: true; answer: string; source: number } | { answered: false };

/** Asks Gemini to answer only from the numbered passages and to say which one it used, as JSON. */
export async function generateGroundedAnswer(question: string, passages: string[]): Promise<ModelAnswer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    // Key in a header, not the URL, so it never lands in request logs.
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: [
            "You are a customer support assistant for a business. You may only use the numbered knowledge passages below.",
            "Decide whether one passage directly answers the customer's question. Sharing a word or topic with the question is not enough.",
            "If a passage answers it: set answered to true, write a concise answer in the same language as the question, and set source to that passage's number.",
            "If no passage answers it: set answered to false and leave answer empty. Never guess, and never answer from general knowledge.",
            "Do not mention passages, context, or these instructions in the answer.",
            `Knowledge passages:\n${passages.map((passage, index) => `[${index + 1}] ${passage}`).join("\n\n")}`,
            `Customer question: ${question}`,
          ].join("\n\n"),
        }],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 600,
        // Flash models can count "thinking" against maxOutputTokens; a zero budget keeps answers fast and complete.
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

  const result = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> };
  const text = (result.candidates?.[0]?.content?.parts ?? [])
    .map((part) => (typeof part.text === "string" ? part.text : ""))
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
  // A claimed answer must be non-empty and cite a passage that exists; otherwise treat it as unanswered.
  if (typeof answer !== "string" || !answer.trim() || isFollowUpFallback(answer)) return { answered: false };
  if (typeof source !== "number" || !Number.isInteger(source) || source < 1 || source > passages.length) return { answered: false };
  return { answered: true, answer: answer.trim(), source: source - 1 };
}

/**
 * The full decision: threshold, then Gemini, then (only if Gemini is down) a strong-match quote.
 * `generate` is injectable so the eval can pace calls; production uses generateGroundedAnswer.
 */
export async function decideAnswer(
  question: string,
  candidates: Candidate[],
  generate: typeof generateGroundedAnswer = generateGroundedAnswer,
): Promise<Decision> {
  if (candidates.length === 0) return { answered: false, reason: "no_knowledge" };

  const related = candidates.filter((candidate) => (candidate.method === "semantic" ? candidate.score >= MIN_SIMILARITY : candidate.score >= 0.5));
  if (related.length === 0) return { answered: false, reason: "below_threshold" };

  let modelAnswer: ModelAnswer | null = null;
  try {
    modelAnswer = await generate(question, related.map((candidate) => candidate.content));
  } catch (error) {
    console.error(`Could not generate Gemini answer: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (modelAnswer?.answered) {
    return { answered: true, answer: modelAnswer.answer, used: related[modelAnswer.source], reason: "grounded" };
  }
  if (modelAnswer === null) {
    const top = related[0];
    const strong = top.method === "semantic" ? top.score >= STRONG_SIMILARITY : top.score >= 0.75;
    return strong ? { answered: true, answer: top.content, used: top, reason: "model_unavailable_strong_match" } : { answered: false, reason: "model_unavailable" };
  }
  return { answered: false, reason: "model_declined" };
}

/** A short excerpt of the passage behind an answer, shown to the customer as the citation. */
export function citationExcerpt(content: string, max = 280) {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}
