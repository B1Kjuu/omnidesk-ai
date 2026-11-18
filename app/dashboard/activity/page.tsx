import { EmptyState, PageTitle } from "@/components/dashboard/SectionHeader";
import LocalTime from "@/components/ui/LocalTime";
import { getDesk } from "@/lib/dashboard/getDesk";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Activity" };

type Event = { id: number; created_at: string; actor_email: string | null; action: string; subject: string | null; details: Json };

const field = (details: Json, key: string) => (details && typeof details === "object" && !Array.isArray(details) ? details[key] : undefined);
const roleName = (value: unknown) => (typeof value === "string" ? value : "");
const statusName = (value: unknown) => (typeof value === "string" ? value.replace("_", " ") : "");

/** One plain-language line per audit event, written by database triggers (see the teams migration). */
function describe(event: Event) {
  const subject = event.subject ?? "";
  switch (event.action) {
    case "knowledge.added": return <>added knowledge <b>{subject}</b></>;
    case "knowledge.edited": return <>edited knowledge <b>{subject}</b></>;
    case "knowledge.deleted": return <>deleted knowledge <b>{subject}</b></>;
    case "member.joined": return <><b>{subject}</b> joined as {roleName(field(event.details, "role"))}</>;
    case "member.role_changed": return <>changed <b>{subject}</b> from {roleName(field(event.details, "previous_role"))} to {roleName(field(event.details, "role"))}</>;
    case "member.removed": return <>removed <b>{subject}</b> from the team</>;
    case "invitation.sent": return <>invited <b>{subject}</b> as {roleName(field(event.details, "role"))}</>;
    case "invitation.revoked": return <>revoked the invitation for <b>{subject}</b></>;
    case "settings.updated": {
      const fields = field(event.details, "fields");
      const names: Record<string, string> = { name: "name", notification_email: "escalation email", widget_domains: "widget websites", slug: "chat link" };
      return <>updated {Array.isArray(fields) ? fields.map((name) => names[String(name)] ?? String(name)).join(", ") : "settings"}</>;
    }
    case "ticket.updated": {
      const status = statusName(field(event.details, "status"));
      const previous = statusName(field(event.details, "previous_status"));
      return status !== previous ? <>moved a ticket from {previous} to <b>{status}</b></> : <>changed a ticket&apos;s priority to <b>{statusName(field(event.details, "priority"))}</b></>;
    }
    case "reply.sent": return <>replied to a customer: <span className="text-ink-2">&ldquo;{subject}&rdquo;</span></>;
    default: return <>{event.action}</>;
  }
}

export default async function ActivityPage() {
  const desk = await getDesk();
  const supabase = await createClient();
  const logs = await Promise.all(
    desk.managedOrganizations.map(async (organization) => {
      const { data, error } = await supabase.rpc("list_audit_events", { target_organization_id: organization.id, max_rows: 150 });
      return { organization, events: error ? null : (data ?? []) };
    }),
  );

  return (
    <>
      <PageTitle title="Activity" description="Who changed knowledge, settings, the team, and tickets. Recorded by the database itself, so no change goes unlogged. Visible to owners and admins." />
      {logs.length === 0 ? (
        <EmptyState title="Only owners and admins see activity">Ask an owner of your organization if you need to know who changed something.</EmptyState>
      ) : (
        <div className="space-y-8">
          {logs.map(({ organization, events }) => (
            <section key={organization.id} className="border border-rule bg-paper">
              {desk.managedOrganizations.length > 1 && <h2 className="border-b border-rule px-5 py-3.5 text-lg font-bold">{organization.name}</h2>}
              {events === null ? (
                <p className="p-5 text-sm text-ink-2">Apply the latest database migration to start recording activity.</p>
              ) : events.length === 0 ? (
                <div className="px-5"><EmptyState title="Nothing recorded yet">Changes to knowledge, settings, the team, and tickets will appear here.</EmptyState></div>
              ) : (
                <ol className="px-5">
                  {events.map((event) => (
                    <li key={event.id} className="grid gap-x-4 gap-y-0.5 border-b border-rule py-3 last:border-b-0 sm:grid-cols-[9rem_1fr]">
                      <LocalTime iso={event.created_at} className="text-sm text-ink-2" />
                      <p className="text-[0.9375rem]/relaxed">
                        <span className="font-bold">{event.actor_email ?? "OmniDesk"}</span> {describe(event)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
