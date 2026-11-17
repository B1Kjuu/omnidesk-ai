import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { describeError } from "@/lib/server/describeError";
import { embedQuery, toVectorLiteral } from "./embeddings";
import { CONTEXT_PASSAGES, keywordCandidates, type Candidate } from "./grounding";

/**
 * Finds the passages most likely to answer a question, for one organization only.
 * Semantic search (pgvector) first; if embedding fails or nothing is indexed yet, keyword ranking.
 */
export async function retrieveCandidates(admin: SupabaseClient<Database>, organizationId: string, question: string): Promise<Candidate[]> {
  try {
    const embedding = await embedQuery(question);
    const { data, error } = await admin.rpc("match_knowledge_chunks", {
      target_organization_id: organizationId,
      query_embedding: toVectorLiteral(embedding),
      match_count: CONTEXT_PASSAGES,
    });
    if (error) throw error;
    if (data.length > 0) {
      return data.map((row) => ({ id: row.id, sourceId: row.source_id, content: row.content, score: row.similarity, method: "semantic" as const }));
    }
  } catch (error) {
    console.error(`Semantic retrieval unavailable, using keyword fallback: ${describeError(error)}`);
  }

  const { data: chunks, error } = await admin
    .from("knowledge_chunks")
    .select("id, source_id, content, knowledge_sources!inner(status)")
    .eq("organization_id", organizationId)
    .eq("knowledge_sources.status", "ready");
  if (error) throw new Error(`Could not retrieve knowledge chunks: ${describeError(error)}`);
  return keywordCandidates(chunks, question);
}
