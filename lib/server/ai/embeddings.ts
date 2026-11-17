/**
 * Gemini embeddings (gemini-embedding-2, 768 dimensions, normalized by the API).
 * gemini-embedding-2 takes no task_type parameter; the task goes into the text as a prefix instead.
 */
export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 50;

export type DocumentInput = { title: string; text: string };

const documentText = ({ title, text }: DocumentInput) => `title: ${title.trim() || "none"} | text: ${text}`;
const queryText = (question: string) => `task: search result | query: ${question}`;

function apiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

async function batchEmbed(texts: string[]): Promise<number[][]> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey() },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
  }

  const result = (await response.json()) as { embeddings?: Array<{ values?: number[] }> };
  const vectors = result.embeddings?.map((embedding) => embedding.values ?? []) ?? [];
  if (vectors.length !== texts.length || vectors.some((vector) => vector.length !== EMBEDDING_DIMENSIONS)) {
    throw new Error("Embedding response did not match the request");
  }
  return vectors;
}

/** Embeds knowledge passages for storage. */
export async function embedDocuments(documents: DocumentInput[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let start = 0; start < documents.length; start += BATCH_SIZE) {
    vectors.push(...(await batchEmbed(documents.slice(start, start + BATCH_SIZE).map(documentText))));
  }
  return vectors;
}

/** Embeds a customer question for search. */
export async function embedQuery(question: string): Promise<number[]> {
  const [vector] = await batchEmbed([queryText(question)]);
  return vector;
}

/** pgvector accepts a vector as the string "[0.1,0.2,...]". */
export function toVectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}
