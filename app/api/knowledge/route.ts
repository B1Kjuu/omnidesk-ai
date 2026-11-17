import { describeError } from "@/lib/server/describeError";
import { ExtractionError, extractPdfText, fetchUrlText, MAX_PDF_BYTES } from "@/lib/server/ai/extract";
import { indexSource } from "@/lib/server/knowledge/indexSource";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Fetching a page or reading a PDF, then embedding every passage, can take a while.
export const maxDuration = 60;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES = new Set(["faq", "text", "pdf", "url"]);
const MAX_TEXT = 100_000;

/** Adds a knowledge source: FAQ or text (typed), a PDF upload, or a public web page. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return Response.json({ error: "Sign in again to add knowledge." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "The upload could not be read. PDFs must be under 4 MB." }, { status: 400 });
  }

  const organizationId = String(form.get("organizationId") ?? "");
  const type = String(form.get("type") ?? "");
  let name = String(form.get("name") ?? "").trim();
  const typed = String(form.get("content") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  const file = form.get("file");

  if (!uuidPattern.test(organizationId) || !TYPES.has(type)) return Response.json({ error: "Choose an organization and a source type." }, { status: 400 });
  if ((type === "faq" || type === "text") && (!typed || typed.length > MAX_TEXT)) return Response.json({ error: "Write the approved answer (up to 100,000 characters)." }, { status: 400 });
  if (type === "url" && !url) return Response.json({ error: "Paste the page's link." }, { status: 400 });
  if (type === "pdf" && !(file instanceof File)) return Response.json({ error: "Choose a PDF file." }, { status: 400 });
  if (type === "pdf" && file instanceof File && file.size > MAX_PDF_BYTES) return Response.json({ error: "The PDF is larger than 4 MB." }, { status: 400 });

  // Extract first, so a bad link or unreadable PDF never leaves a half-created source behind.
  let text = typed;
  let sourceUrl: string | null = null;
  try {
    if (type === "url") {
      const page = await fetchUrlText(url);
      text = page.text;
      sourceUrl = page.finalUrl;
      name ||= page.title || new URL(page.finalUrl).hostname;
    } else if (type === "pdf" && file instanceof File) {
      text = await extractPdfText(await file.arrayBuffer());
      name ||= file.name.replace(/\.pdf$/i, "");
    }
  } catch (error) {
    if (error instanceof ExtractionError) return Response.json({ error: error.message }, { status: 422 });
    console.error(`Knowledge extraction failed: ${describeError(error)}`);
    return Response.json({ error: "The source could not be read. Try again in a moment." }, { status: 502 });
  }

  name = name.slice(0, 255);
  if (!name) return Response.json({ error: "Give the source a title." }, { status: 400 });

  // Inserted with the user's own session: RLS only allows organization admins, as themselves.
  const { data: source, error: insertError } = await supabase
    .from("knowledge_sources")
    .insert({ organization_id: organizationId, name, source_type: type, status: "processing", created_by: userId, content: text, source_url: sourceUrl })
    .select("id")
    .single();
  if (insertError || !source) {
    return Response.json({ error: "Only owners and admins of this organization can add knowledge." }, { status: 403 });
  }

  try {
    const { passages } = await indexSource(createAdminClient(), { organizationId, sourceId: source.id, sourceName: name, sourceType: type, text });
    return Response.json({ sourceId: source.id, name, passages }, { status: 201 });
  } catch {
    return Response.json(
      { sourceId: source.id, error: "Saved, but indexing failed. Use Retry on the source in a moment." },
      { status: 502 },
    );
  }
}
