import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { describeError } from "@/lib/server/describeError";
import { firstExceededLimit } from "@/lib/server/rateLimit";

/** Each organization sends at most this many workflow emails per hour (escalations and staff replies). */
const EMAIL_LIMIT = (organizationId: string) => ({ bucket: `email:org:${organizationId}:hour`, max: 30, windowSeconds: 3_600 });

type EmailContent = { subject: string; html: string; text: string };

type WorkflowEmail = {
  organizationId: string;
  eventType: "conversation.escalated" | "conversation.replied" | "member.invited";
  idempotencyKey: string;
  /** Stored on the workflow event for the Automation page; keep it free of rendered HTML. */
  summary: Record<string, Json>;
  to: string;
  replyTo: string;
  email: EmailContent;
  /** Extra fields for the n8n webhook body. */
  extra?: Record<string, unknown>;
};

/** The organization's escalation contact: the configured address, else the creator's sign-in email. */
export async function notificationRecipient(admin: SupabaseClient<Database>, organizationId: string) {
  const [{ data: organization }, { data: configured, error }] = await Promise.all([
    admin.from("organizations").select("name, created_by").eq("id", organizationId).single(),
    admin.rpc("get_notification_recipient", { target_organization_id: organizationId }),
  ]);
  let email = configured ?? null;
  if (error || !email) {
    if (error) console.error(`Notification recipient lookup failed, using creator email: ${describeError(error)}`);
    const creator = organization ? await admin.auth.admin.getUserById(organization.created_by) : null;
    email = creator?.data.user?.email ?? null;
  }
  return { email, organizationName: organization?.name ?? "your desk" };
}

/**
 * Records a workflow event and delivers it to the n8n webhook, which sends `email` to `to`.
 * The n8n Send Email node reads body.notifyEmail, body.replyTo, and body.email.{subject,html,text},
 * so the same workflow sends both escalation and reply emails.
 * Never throws: delivery problems are recorded on the event and shown on the Automation page.
 */
export async function sendWorkflowEmail(admin: SupabaseClient<Database>, input: WorkflowEmail): Promise<{ sent: boolean; reason?: string }> {
  const { data: event, error } = await admin
    .from("workflow_events")
    .insert({ organization_id: input.organizationId, event_type: input.eventType, idempotency_key: input.idempotencyKey, payload: input.summary })
    .select("id")
    .single();
  if (error || !event) {
    console.error(`Could not create ${input.eventType} workflow event: ${describeError(error)}`);
    return { sent: false, reason: "event_not_recorded" };
  }

  const fail = async (reason: string) => {
    await admin.from("workflow_events").update({ status: "failed", last_error: reason }).eq("id", event.id);
    return { sent: false, reason };
  };

  const webhookUrl = process.env.N8N_ESCALATION_WEBHOOK_URL;
  if (!webhookUrl) return { sent: false, reason: "webhook_not_configured" };
  if (await firstExceededLimit(admin, [EMAIL_LIMIT(input.organizationId)])) {
    return fail("Hourly email limit reached; the conversation is still in the dashboard.");
  }

  await admin.from("workflow_events").update({ status: "processing" }).eq("id", event.id);
  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    // Matches an n8n "Header Auth" credential so only OmniDesk can trigger the email workflow.
    if (process.env.N8N_WEBHOOK_SECRET) headers["x-omnidesk-secret"] = process.env.N8N_WEBHOOK_SECRET;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        eventId: event.id,
        eventType: input.eventType,
        organizationId: input.organizationId,
        ...input.summary,
        ...input.extra,
        notifyEmail: input.to,
        replyTo: input.replyTo,
        email: input.email,
      }),
    });
    if (!response.ok) throw new Error(`n8n webhook returned HTTP ${response.status}`);

    await admin.from("workflow_events").update({ status: "completed" }).eq("id", event.id);
    return { sent: true };
  } catch (deliveryError) {
    console.error(`Could not deliver ${input.eventType} workflow event: ${describeError(deliveryError)}`);
    return fail(deliveryError instanceof Error ? deliveryError.message : "Unknown n8n webhook error");
  }
}
