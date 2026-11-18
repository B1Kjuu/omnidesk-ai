import { renderInviteEmail } from "@/lib/email/inviteEmail";
import { publicOrigin } from "@/lib/publicOrigin";
import { describeError } from "@/lib/server/describeError";
import { newSecretToken } from "@/lib/server/secretToken";
import { sendWorkflowEmail } from "@/lib/server/workflowEmail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Invites someone to an organization. Inserted with the inviter's session (RLS: owners and admins only).
 * Returns the link so it can be shared directly, and emails it when the n8n webhook is configured.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  const inviterEmail = typeof claims?.claims.email === "string" ? claims.claims.email : "A teammate";
  if (!userId) return Response.json({ error: "Sign in again to invite people." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { organizationId?: unknown; email?: unknown; role?: unknown } | null;
  const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.role === "admin" ? "admin" : body?.role === "agent" ? "agent" : null;
  if (!uuidPattern.test(organizationId) || !role || !emailPattern.test(email) || email.length > 320) {
    return Response.json({ error: "Enter a valid email and choose a role." }, { status: 400 });
  }

  const { data: existing } = await supabase.rpc("list_organization_members", { target_organization_id: organizationId });
  if (existing?.some((member) => member.email.toLowerCase() === email)) {
    return Response.json({ error: `${email} is already a member.` }, { status: 409 });
  }

  const { token, hash } = newSecretToken();
  const { data: invitation, error } = await supabase
    .from("organization_invitations")
    .insert({ organization_id: organizationId, email, role, token_hash: hash, invited_by: userId })
    .select("id")
    .single();
  if (error || !invitation) {
    if (error?.code === "23505") return Response.json({ error: `${email} already has a pending invitation. Revoke it to send a new one.` }, { status: 409 });
    return Response.json({ error: "Only owners and admins of this organization can invite people." }, { status: 403 });
  }

  const origin = publicOrigin() ?? new URL(request.url).origin;
  const link = `${origin}/invite/${token}`;
  const { data: organization } = await supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle();
  const organizationName = organization?.name ?? "your team";

  const result = await sendWorkflowEmail(createAdminClient(), {
    organizationId,
    eventType: "member.invited",
    idempotencyKey: `invitation:${invitation.id}:sent`,
    summary: { invitationId: invitation.id, email, role },
    to: email,
    replyTo: inviterEmail.includes("@") ? inviterEmail : email,
    email: renderInviteEmail({ organizationName, inviterEmail, role, link }),
    extra: { organizationName },
  }).catch((sendError: unknown) => {
    console.error(`Invitation email failed: ${describeError(sendError)}`);
    return { sent: false };
  });

  return Response.json({ link, emailed: result.sent }, { status: 201 });
}
