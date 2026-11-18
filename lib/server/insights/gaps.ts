import { cosineSimilarity } from "@/lib/server/ai/embeddings";

/**
 * Questions with this cosine similarity or more (gemini-embedding-2, query embeddings) are treated as the same gap.
 * Measured on paraphrase pairs: same-intent questions scored 0.78–0.94 (including Filipino vs English), unrelated
 * ones up to 0.75. Near-topic questions ("pay with Bitcoin" vs "pay with PayPal", 0.85) merge, which is what we
 * want: both point to one missing FAQ about payment methods.
 */
export const GAP_SIMILARITY = 0.78;

export type UnansweredQuestion = {
  message_id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  embedding: string | null;
  staff_reply: string | null;
};

export type KnowledgeGap = {
  id: string;
  /** The question closest to the group's centre: the most typical phrasing. */
  label: string;
  count: number;
  examples: string[];
  staffReplies: string[];
  lastAskedAt: string;
};

type Group = { members: UnansweredQuestion[]; vectors: number[][]; centroid: number[] | null };

function parseVector(literal: string | null) {
  if (!literal) return null;
  try {
    const values = JSON.parse(literal) as unknown;
    return Array.isArray(values) && values.every((value) => typeof value === "number") ? (values as number[]) : null;
  } catch {
    return null;
  }
}

const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Greedy single-pass clustering, newest first. Questions without an embedding group only with identical wording. */
export function groupKnowledgeGaps(questions: UnansweredQuestion[]): KnowledgeGap[] {
  const groups: Group[] = [];
  const byText = new Map<string, Group>();

  for (const question of questions) {
    const vector = parseVector(question.embedding);
    if (!vector) {
      const key = normalize(question.content);
      const group = byText.get(key) ?? { members: [], vectors: [], centroid: null };
      if (!byText.has(key)) {
        byText.set(key, group);
        groups.push(group);
      }
      group.members.push(question);
      continue;
    }

    let best: Group | null = null;
    let bestScore = GAP_SIMILARITY;
    for (const group of groups) {
      if (!group.centroid) continue;
      const score = cosineSimilarity(vector, group.centroid);
      if (score >= bestScore) {
        best = group;
        bestScore = score;
      }
    }
    if (best) {
      best.members.push(question);
      best.vectors.push(vector);
      best.centroid = best.centroid!.map((value, index) => value + (vector[index] - value) / best!.vectors.length);
    } else {
      groups.push({ members: [question], vectors: [vector], centroid: [...vector] });
    }
  }

  return groups
    .map((group) => {
      const typical = group.centroid
        ? group.members[group.vectors.reduce((bestIndex, vector, index, all) => (cosineSimilarity(vector, group.centroid!) > cosineSimilarity(all[bestIndex], group.centroid!) ? index : bestIndex), 0)]
        : group.members[0];
      return {
        id: typical.message_id,
        label: typical.content,
        count: group.members.length,
        examples: [...new Set(group.members.map((member) => member.content))].slice(0, 4),
        staffReplies: [...new Set(group.members.map((member) => member.staff_reply).filter((reply): reply is string => Boolean(reply)))].slice(0, 5),
        lastAskedAt: group.members.reduce((latest, member) => (member.created_at > latest ? member.created_at : latest), group.members[0].created_at),
      };
    })
    .sort((a, b) => b.count - a.count || b.lastAskedAt.localeCompare(a.lastAskedAt));
}
