"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Ticket = {
  id: string;
  organization_id: string;
  category: string;
  priority: string;
  status: string;
  customer_name: string;
  customer_email: string | null;
};

const statuses = ["open", "in_progress", "resolved", "cancelled"];
const priorities = ["low", "normal", "high", "urgent"];

export default function TicketList({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateTicket(ticket: Ticket, field: "status" | "priority", value: string) {
    setMessage("");
    setUpdatingId(ticket.id);

    try {
      const { error } = await createClient().rpc("update_ticket", {
        target_ticket_id: ticket.id,
        new_status: field === "status" ? value : ticket.status,
        new_priority: field === "priority" ? value : ticket.priority,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  if (tickets.length === 0) {
    return <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">No support tickets yet.</p>;
  }

  return (
    <>
      <ul className="mt-6 space-y-3">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">{ticket.customer_name}</p>
                <p className="mt-1 text-sm text-slate-500">{ticket.customer_email ?? "No email provided"} · {ticket.category}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor={`ticket-priority-${ticket.id}`}>Ticket priority</label>
                <select
                  id={`ticket-priority-${ticket.id}`}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-600"
                  value={ticket.priority}
                  disabled={updatingId === ticket.id}
                  onChange={(event) => updateTicket(ticket, "priority", event.target.value)}
                >
                  {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
                <label className="sr-only" htmlFor={`ticket-status-${ticket.id}`}>Ticket status</label>
                <select
                  id={`ticket-status-${ticket.id}`}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-600"
                  value={ticket.status}
                  disabled={updatingId === ticket.id}
                  onChange={(event) => updateTicket(ticket, "status", event.target.value)}
                >
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {message && <p className="mt-3 text-sm text-rose-700" role="alert">{message}</p>}
    </>
  );
}
