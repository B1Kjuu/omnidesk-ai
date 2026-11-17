import Icon from "@/components/ui/Icon";
import LocalTime from "@/components/ui/LocalTime";
import StatusTag from "@/components/ui/StatusTag";
import { EmptyState } from "./SectionHeader";

export type ConversationItem = {
  id: string;
  status: string;
  created_at: string;
  organization_name: string | null;
  customer_name: string;
  customer_email: string | null;
  messages: Array<{ id: string; sender_type: string; content: string; created_at: string; grounded: boolean; sources: string[] }>;
};

const senderLabel: Record<string, string> = { customer: "Customer", assistant: "OmniDesk", agent: "Staff" };

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
                <ol className="mt-4 space-y-4 border-l-2 border-ink pl-5">
                  {conversation.messages.map((message) => (
                    <li key={message.id}>
                      <p className="flex items-baseline gap-3 text-xs font-bold tracking-wide text-ink-2 uppercase">
                        {senderLabel[message.sender_type] ?? message.sender_type}
                        <LocalTime iso={message.created_at} className="font-normal normal-case" />
                      </p>
                      <p className="mt-1 max-w-[70ch] text-[0.9375rem] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      {message.sender_type === "assistant" && (
                        message.grounded ? (
                          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-go">
                            <Icon name="check" className="size-3.5" />
                            Answered from {message.sources.length > 0 ? message.sources.join(", ") : "a source that has since been removed"}
                          </p>
                        ) : (
                          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-2">
                            <Icon name="person" className="size-3.5" />
                            No source matched; handed to staff
                          </p>
                        )
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
