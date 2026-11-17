import LocalTime from "@/components/ui/LocalTime";
import StatusTag from "@/components/ui/StatusTag";
import { EmptyState } from "./SectionHeader";

type WorkflowEvent = {
  id: string;
  event_type: string;
  status: string;
  last_error: string | null;
  created_at: string;
};

const eventLabel: Record<string, string> = { "conversation.escalated": "Staff handoff email" };

export default function WorkflowEventList({ events }: { events: WorkflowEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState title="No automation events yet">
        Each staff handoff queues an event here and sends it to n8n. You will see whether the email went out, or the error if it did not.
      </EmptyState>
    );
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead className="sr-only md:not-sr-only">
        <tr className="text-xs tracking-wide text-ink-2 uppercase">
          <th scope="col" className="py-2 pr-4 font-bold">Event</th>
          <th scope="col" className="py-2 pr-4 font-bold">Queued</th>
          <th scope="col" className="py-2 text-right font-bold">Delivery</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id} className="grid grid-cols-[1fr_auto] gap-x-4 border-t border-rule py-3 first:border-t-0 md:table-row md:py-0 md:first:border-t">
            <td className="md:py-3 md:pr-4">
              <p className="font-bold">{eventLabel[event.event_type] ?? event.event_type}</p>
              <p className="font-mono text-xs text-ink-2">{event.event_type}</p>
              {event.last_error && <p className="mt-1.5 text-sm text-signal-deep">{event.last_error}</p>}
            </td>
            <td className="col-start-1 row-start-2 text-sm text-ink-2 md:py-3 md:pr-4">
              <LocalTime iso={event.created_at} />
            </td>
            <td className="col-start-2 row-span-2 row-start-1 text-right md:py-3">
              <StatusTag domain="workflow" value={event.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
