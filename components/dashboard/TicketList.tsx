"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LocalTime from "@/components/ui/LocalTime";
import StatusTag from "@/components/ui/StatusTag";
import { createClient } from "@/lib/supabase/browser";
import { getOptions } from "@/lib/status";
import type { ConversationMessage } from "./ConversationList";
import ConversationThread from "./ConversationThread";
import ReplyForm from "./ReplyForm";
import { EmptyState } from "./SectionHeader";

export type TicketItem = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  customer_name: string;
  customer_email: string | null;
  question: string | null;
  conversation_id: string;
  messages: ConversationMessage[];
};

const categoryLabel: Record<string, string> = { knowledge_gap: "No approved answer" };

export default function TicketList({ tickets }: { tickets: TicketItem[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateTicket(ticket: TicketItem, field: "status" | "priority", value: string) {
    setError("");
    setUpdatingId(ticket.id);

    try {
      const { error: updateError } = await createClient().rpc("update_ticket", {
        target_ticket_id: ticket.id,
        new_status: field === "status" ? value : ticket.status,
        new_priority: field === "priority" ? value : ticket.priority,
      });

      if (updateError) {
        setError(`The ticket could not be updated: ${updateError.message}`);
        return;
      }

      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  if (tickets.length === 0) {
    return (
      <EmptyState title="No handoffs to staff">
        When a customer asks something your knowledge does not cover, OmniDesk opens a ticket here instead of guessing.
      </EmptyState>
    );
  }

  return (
    <>
      {error && <p className="alert-error mt-4" role="alert">{error}</p>}
      <ul>
        {tickets.map((ticket) => {
          const isUpdating = updatingId === ticket.id;
          return (
            <li key={ticket.id} className={`border-b border-rule py-4 transition-opacity last:border-b-0 ${isUpdating ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
                <div className="min-w-0 flex-1 basis-80">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-bold">{ticket.customer_name}</p>
                    <StatusTag domain="ticket" value={ticket.status} />
                    <StatusTag domain="priority" value={ticket.priority} />
                  </div>
                  {ticket.question && <p className="mt-2 max-w-[70ch] text-[0.9375rem]/relaxed">&ldquo;{ticket.question}&rdquo;</p>}
                  <p className="mt-2 text-sm text-ink-2">
                    <LocalTime iso={ticket.created_at} /> · {categoryLabel[ticket.category] ?? ticket.category}
                    {ticket.organization_name && <> · {ticket.organization_name}</>}
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-2" htmlFor={`ticket-priority-${ticket.id}`}>Priority</label>
                    <select
                      id={`ticket-priority-${ticket.id}`}
                      className="field mt-1 w-auto py-1.5 text-sm"
                      value={ticket.priority}
                      disabled={isUpdating}
                      onChange={(event) => updateTicket(ticket, "priority", event.target.value)}
                    >
                      {getOptions("priority").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-2" htmlFor={`ticket-status-${ticket.id}`}>Status</label>
                    <select
                      id={`ticket-status-${ticket.id}`}
                      className="field mt-1 w-auto py-1.5 text-sm"
                      value={ticket.status}
                      disabled={isUpdating}
                      onChange={(event) => updateTicket(ticket, "status", event.target.value)}
                    >
                      {getOptions("ticket").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <details className="group mt-3" open={ticket.status === "open"}>
                <summary className="cursor-pointer text-sm font-bold text-ink-2 hover:text-ink">
                  Conversation ({ticket.messages.length} {ticket.messages.length === 1 ? "message" : "messages"}) and reply
                </summary>
                <div className="mt-3 border-t border-dashed border-rule-strong pt-4">
                  <ConversationThread messages={ticket.messages} />
                  <ReplyForm conversationId={ticket.conversation_id} customerName={ticket.customer_name} customerEmail={ticket.customer_email} />
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
