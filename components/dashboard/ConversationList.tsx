import LocalTime from "@/components/ui/LocalTime";
import StatusTag from "@/components/ui/StatusTag";
import ConversationThread from "./ConversationThread";
import ReplyForm from "./ReplyForm";
import { EmptyState } from "./SectionHeader";

export type ConversationItem = {
  id: string;
  status: string;
  created_at: string;
  organization_name: string | null;
  customer_name: string;
  customer_email: string | null;
  messages: ConversationMessage[];
};

export type ConversationMessage = { id: string; sender_type: string; content: string; created_at: string; grounded: boolean; sources: string[] };


export default function ConversationList({ conversations }: { conversations: ConversationItem[] }) {
  if (conversations.length === 0) {
    return (
      <EmptyState title="No conversations yet">
        Questions customers send from your chat page land here, newest first, with the reply and the source it came from.
      </EmptyState>
    );
  }

  return (
    <ul>
      {conversations.map((conversation) => {
        const firstQuestion = conversation.messages.find((message) => message.sender_type === "customer")?.content ?? "No message";
        return (
          <li key={conversation.id} className="border-b border-rule last:border-b-0">
            <details className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-1 py-3.5 hover:bg-platform md:grid-cols-[7.5rem_11rem_1fr_7rem] [&::-webkit-details-marker]:hidden">
                <LocalTime iso={conversation.created_at} className="text-sm text-ink-2" />
                <span className="order-first truncate font-bold md:order-0">{conversation.customer_name}</span>
                <span className="col-span-2 truncate text-[0.9375rem] text-ink-2 md:col-span-1">{firstQuestion}</span>
                <span className="col-start-2 row-start-1 flex justify-end md:col-start-auto md:row-start-auto">
                  <StatusTag domain="conversation" value={conversation.status} />
                </span>
              </summary>

              <div className="px-1 pt-1 pb-6 md:pl-34">
                <p className="text-sm text-ink-2">
                  {conversation.customer_email ?? "No email given"}
                  {conversation.organization_name && <> · {conversation.organization_name}</>}
                </p>
                <div className="mt-4">
                  <ConversationThread messages={conversation.messages} />
                </div>
                <ReplyForm conversationId={conversation.id} customerName={conversation.customer_name} customerEmail={conversation.customer_email} />
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
