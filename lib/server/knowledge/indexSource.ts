import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { describeError } from "@/lib/server/describeError";
import { chunkSource } from "@/lib/server/ai/chunking";
import { embedDocuments, toVectorLiteral } from "@/lib/server/ai/embeddings";

type IndexInput = {
  organizationId: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  text: string;
};

/**
 * Splits a source into passages, embeds them, and replaces its stored passages.
 * Uses the service-role client; callers must already have verified the user may edit this source.
 * Leaves the source "ready" with its passage count, or "failed" with the reason.
 */
export async function indexSource(admin: SupabaseClient<Database>, input: IndexInput) {
  try {
    const passages = chunkSource(input.sourceType, input.text);
    if (passages.length === 0) throw new Error("The source has no text to index.");

    // Embedding happens before anything is deleted, so a failure never leaves the source empty.
    const vectors = await embedDocuments(passages.map((text) => ({ title: input.sourceName, text })));

    const { error: deleteError } = await admin.from("knowledge_chunks").delete().eq("source_id", input.sourceId).eq("organization_id", input.organizationId);
    if (deleteError) throw new Error(`Could not replace old passages: ${describeError(deleteError)}`);

    const { error: insertError } = await admin.from("knowledge_chunks").insert(
      passages.map((content, index) => ({
        organization_id: input.organizationId,
        source_id: input.sourceId,
        content,
        chunk_index: index,
        embedding: toVectorLiteral(vectors[index]),
      })),
    );
    if (insertError) throw new Error(`Could not store passages: ${describeError(insertError)}`);

    const { error: updateError } = await admin
      .from("knowledge_sources")
      .update({ status: "ready", last_error: null, chunk_count: passages.length, content: input.text })
      .eq("id", input.sourceId)
      .eq("organization_id", input.organizationId);
    if (updateError) throw new Error(`Could not mark the source ready: ${describeError(updateError)}`);

    return { passages: passages.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : describeError(error);
    console.error(`Indexing failed for knowledge source ${input.sourceId}: ${message}`);
    await admin
      .from("knowledge_sources")
      .update({ status: "failed", last_error: message.slice(0, 500), content: input.text })
      .eq("id", input.sourceId)
      .eq("organization_id", input.organizationId);
    throw error;
  }
}
