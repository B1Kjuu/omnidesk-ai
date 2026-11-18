import { PageTitle } from "@/components/dashboard/SectionHeader";
import TicketList from "@/components/dashboard/TicketList";
import { getDesk, plural } from "@/lib/dashboard/getDesk";

export const instant = false;
export const metadata = { title: "Escalations" };

export default async function EscalationsPage() {
  const desk = await getDesk();
  const closed = desk.tickets.filter((ticket) => ticket.status === "resolved" || ticket.status === "cancelled");

  return (
    <>
      <PageTitle
        title="Escalations"
        description="Questions no approved source could answer. Reply to the customer, then resolve the ticket to close its conversation."
      />

      <section aria-labelledby="waiting-title">
        <h2 id="waiting-title" className="mb-3 text-lg font-bold">
          Waiting on staff <span className="font-mono text-base font-normal text-ink-2">{desk.openTickets.length}</span>
        </h2>
        <div className="border border-rule bg-paper px-4 sm:px-5">
          <TicketList tickets={desk.openTickets} />
        </div>
      </section>

      {closed.length > 0 && (
        <details className="group mt-10">
          <summary className="cursor-pointer text-lg font-bold">
            Closed <span className="font-mono text-base font-normal text-ink-2">{closed.length}</span>
            <span className="ml-2 text-sm font-normal text-ink-2">{plural(closed.length, "ticket")} resolved or cancelled</span>
          </summary>
          <div className="mt-3 border border-rule bg-paper px-4 sm:px-5">
            <TicketList tickets={closed} />
          </div>
        </details>
      )}
    </>
  );
}
