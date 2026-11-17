/**
 * Re-indexes knowledge sources: splits each source's text into passages and stores fresh embeddings.
 * Run once after applying the semantic-retrieval migration, or after changing the embedding model.
 *
 *   npm run reindex            only sources that have passages without embeddings
 *   npm run reindex -- --all   every source
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local. Embeds before deleting, so a failure never empties a source.
 */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chunkSource } from "../lib/server/ai/chunking";
import { embedDocuments, toVectorLiteral } from "../lib/server/ai/embeddings";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey || !process.env.GEMINI_API_KEY) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GEMINI_API_KEY in .env.local.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const all = process.argv.includes("--all");

const { data: sources, error } = await admin.from("knowledge_sources").select("id, organization_id, name, source_type, content");
if (error) throw new Error(`Could not list sources: ${error.message}`);

let done = 0;
for (const source of sources ?? []) {
  if (!all) {
    const { count } = await admin.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("source_id", source.id).is("embedding", null);
    const { count: total } = await admin.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("source_id", source.id);
    if ((count ?? 0) === 0 && (total ?? 0) > 0) continue;
  }

  const text: string = source.content ?? "";
  const passages = chunkSource(source.source_type, text);
  if (passages.length === 0) {
    console.log(`skip  ${source.name}: no text`);
    continue;
  }

  const vectors = await embedDocuments(passages.map((content) => ({ title: source.name, text: content })));
  await admin.from("knowledge_chunks").delete().eq("source_id", source.id);
  const { error: insertError } = await admin.from("knowledge_chunks").insert(
    passages.map((content, index) => ({ organization_id: source.organization_id, source_id: source.id, content, chunk_index: index, embedding: toVectorLiteral(vectors[index]) })),
  );
  if (insertError) throw new Error(`Could not store passages for ${source.name}: ${insertError.message}`);
  await admin.from("knowledge_sources").update({ status: "ready", last_error: null, chunk_count: passages.length }).eq("id", source.id);
  done++;
  console.log(`done  ${source.name}: ${passages.length} ${passages.length === 1 ? "passage" : "passages"}`);
}

console.log(`\nRe-indexed ${done} of ${sources?.length ?? 0} sources.`);
