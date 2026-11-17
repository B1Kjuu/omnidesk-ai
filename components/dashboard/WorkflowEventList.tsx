type WorkflowEvent = {
  id: string;
  event_type: string;
  status: string;
  last_error: string | null;
  created_at: string;
};

function formatStatus(status: string) {
  return status.replace("_", " ");
}

export default function WorkflowEventList({ events }: { events: WorkflowEvent[] }) {
  if (events.length === 0) {
    return <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">No workflow events yet.</p>;
  }

  return (
    <ul className="mt-6 space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{event.event_type}</p>
              <p className="mt-1 text-sm text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">{formatStatus(event.status)}</span>
          </div>
          {event.last_error && <p className="mt-3 text-sm text-rose-700">{event.last_error}</p>}
        </li>
      ))}
    </ul>
  );
}
