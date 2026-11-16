import { createAdminClient } from "@/lib/supabase/admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const { data, error } = await createAdminClient().rpc("create_public_conversation", {
    target_organization_id: organizationId,
    customer_name: name,
    customer_email: email,
    first_message: message,
  });

  if (error) {
    console.error("Could not create public conversation", error);
    return Response.json({ error: "We could not save your message." }, { status: 500 });
  }

  return Response.json({ conversationId: data[0]?.conversation_id }, { status: 201 });
}
