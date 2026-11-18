import { findCustomerConversation } from "@/lib/server/conversationAccess";
import { clientKey, firstExceededLimit } from "@/lib/server/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Lets a customer add or change the email the team replies to, after their question was handed over. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { conversationId?: unknown; conversationToken?: unknown; email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || email.length > 320 || !emailPattern.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (await firstExceededLimit(admin, [{ bucket: `contact:${await clientKey(request)}:hour`, max: 10, windowSeconds: 3_600 }])) {
    return Response.json({ error: "Too many changes. Try again later." }, { status: 429 });
  }

  const conversation = await findCustomerConversation(
    admin,
    typeof body?.conversationId === "string" ? body.conversationId : "",
    typeof body?.conversationToken === "string" ? body.conversationToken : "",
  );
  if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });

  const { error } = await admin.from("customers").update({ email }).eq("id", conversation.customer_id).eq("organization_id", conversation.organization_id);
  if (error) return Response.json({ error: "The email could not be saved." }, { status: 500 });
  return Response.json({ email });
}
