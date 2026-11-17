import { describeError } from "@/lib/server/describeError";
import { ExtractionError, fetchUrlText } from "@/lib/server/ai/extract";
import { indexSource } from "@/lib/server/knowledge/indexSource";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_TEXT = 100_000;

/**
 * Edits and/or re-indexes one source.
 * Body: { name?, content?, refetch? }. `refetch` re-reads a web page source from its link.
 * With no changes it simply re-indexes (the Retry button on a failed source).
 */
export async function PATCH(request: Request, { params }: RouteContext<"/api/knowledge/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return Response.json({ error: "Sign in again to edit knowledge." }, { status: 401 });

  let body: { name?: unknown; content?: unknown; refetch?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 255) : undefined;
  const content = typeof body.content === "string" ? body.content.trim() : undefined;
  if (name === "" || content === "" || (content && content.length > MAX_TEXT)) {
    return Response.json({ error: "Title and content cannot be empty (content up to 100,000 characters)." }, { status: 400 });
  }

  // The update runs as the user, so RLS decides: only admins of the source's organization get a row back.
  const { data: source, error } = await supabase
    .from("knowledge_sources")
    .update({ status: "processing", ...(name ? { name } : {}) })
    .eq("id", id)
    .select("id, organization_id, name, source_type, content, source_url")
    .maybeSingle();
  if (error || !source) return Response.json({ error: "Only owners and admins of this organization can edit this source." }, { status: 403 });

  let text = content ?? source.content ?? "";
  try {
    if (body.refetch === true && source.source_type === "url" && source.source_url) {
      text = (await fetchUrlText(source.source_url)).text;
    }
  } catch (fetchError) {
    const message = fetchError instanceof ExtractionError ? fetchError.message : "The page could not be fetched.";
    if (!(fetchError instanceof ExtractionError)) console.error(`Knowledge refetch failed: ${describeError(fetchError)}`);
    await createAdminClient().from("knowledge_sources").update({ status: "failed", last_error: message }).eq("id", source.id);
    return Response.json({ error: message }, { status: 422 });
  }

  try {
    const { passages } = await indexSource(createAdminClient(), {
      organizationId: source.organization_id,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.source_type,
      text,
    });
    return Response.json({ sourceId: source.id, passages });
  } catch {
    return Response.json({ error: "Indexing failed. Try again in a moment." }, { status: 502 });
  }
}
