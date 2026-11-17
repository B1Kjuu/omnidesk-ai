import Link from "next/link";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import { PageTitle, Panel } from "@/components/dashboard/SectionHeader";
import SetupRoute from "@/components/dashboard/SetupRoute";
import Icon from "@/components/ui/Icon";
import LocalTime from "@/components/ui/LocalTime";
import StatusTag from "@/components/ui/StatusTag";
import { getDesk, plural } from "@/lib/dashboard/getDesk";

export const instant = false;

function PanelLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-bold text-signal-deep no-underline hover:underline">
      {children}
      <Icon name="arrow" className="size-3.5" />
    </Link>
  );
}

export default async function OverviewPage() {
  const desk = await getDesk();
  const hasOrganization = desk.organizations.length > 0;
  const waiting = desk.openTickets.slice(0, 4);
  const latest = desk.conversations.slice(0, 6);

  return (
    <>
      <PageTitle
        title="Overview"
        description={
          hasOrganization
            ? `${plural(desk.conversations.length, "conversation")} · ${desk.openTickets.length} waiting on staff · ${plural(desk.sources.length, "approved source")}`
            : "Set up your first organization to start answering customers."
        }
      />

      <div className="space-y-8">
        <SetupRoute
          hasOrganization={hasOrganization}
          hasKnowledge={desk.sources.length > 0}
          hasConversation={desk.conversations.length > 0}
          hasEscalation={desk.tickets.length > 0}
          chatHref={desk.chatHref}
        />

        {desk.failedEvents.length > 0 && (
          <Link
            href="/dashboard/automation"
            className="flex flex-wrap items-center justify-between gap-3 bg-notice px-5 py-3.5 font-bold text-ink no-underline hover:brightness-95"
          >
            <span className="flex items-center gap-2.5">
              <Icon name="bolt" />
              {plural(desk.failedEvents.length, "staff email")} failed to send. The team was not notified.
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              See the errors
              <Icon name="arrow" className="size-3.5" />
            </span>
          </Link>
        )}

        {hasOrganization && (
          <div className="grid gap-8 xl:grid-cols-2">
            <Panel title="Waiting on staff" action={<PanelLink href="/dashboard/escalations">All escalations</PanelLink>}>
              {waiting.length === 0 ? (
                <p className="py-4 text-[0.9375rem] leading-relaxed text-ink-2">Nothing is waiting. Every recent question was answered from your knowledge.</p>
              ) : (
                <ul>
                  {waiting.map((ticket) => (
                    <li key={ticket.id} className="border-t border-rule py-3.5 first:border-t-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-bold">{ticket.customer_name}</p>
                        <StatusTag domain="priority" value={ticket.priority} />
                      </div>
                      {ticket.question && <p className="mt-1 truncate text-[0.9375rem] text-ink-2">{ticket.question}</p>}
                      <LocalTime iso={ticket.created_at} className="mt-1 block text-xs text-ink-3" />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Latest questions" action={<PanelLink href="/dashboard/inbox">Open inbox</PanelLink>}>
              {latest.length === 0 ? (
                <p className="py-4 text-[0.9375rem] leading-relaxed text-ink-2">No questions yet. Share your customer chat page to receive the first one.</p>
              ) : (
                <ul>
                  {latest.map((conversation) => (
                    <li key={conversation.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 border-t border-rule py-3 first:border-t-0">
                      <div className="min-w-0">
                        <p className="truncate text-[0.9375rem]">
                          <span className="font-bold">{conversation.customer_name}</span>
                          <span className="text-ink-2"> · {conversation.messages.find((message) => message.sender_type === "customer")?.content ?? "No message"}</span>
                        </p>
                        <LocalTime iso={conversation.created_at} className="text-xs text-ink-3" />
                      </div>
                      <StatusTag domain="conversation" value={conversation.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {hasOrganization && (
          <Panel title="Customer chat pages" action={<PanelLink href="/dashboard/organizations">Manage</PanelLink>}>
            <ul>
              {desk.organizations.map((organization) => (
                <li key={organization.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-3 first:border-t-0">
                  <p className="font-bold">{organization.name}</p>
                  <div className="flex items-center gap-1">
                    <CopyLinkButton path={`/chat/${organization.id}`} />
                    <Link className="btn btn-secondary py-1.5 text-sm no-underline" href={`/chat/${organization.id}`} target="_blank">
                      Open
                      <Icon name="external" className="size-3.5" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
