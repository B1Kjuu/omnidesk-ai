import Icon from "@/components/ui/Icon";
import LocalTime from "@/components/ui/LocalTime";
import type { ConversationMessage } from "./ConversationList";

const senderLabel: Record<string, string> = { customer: "Customer", assistant: "OmniDesk", agent: "Staff" };

/** The full back-and-forth of one conversation, shared by the Inbox and Escalations pages. */
export default function ConversationThread({ messages }: { messages: ConversationMessage[] }) {
  return (
    <ol className="space-y-4 border-l-2 border-ink pl-5">
      {messages.map((message) => (
        <li key={message.id} className={message.sender_type === "agent" ? "-ml-5 border-l-2 border-go bg-go-wash py-2 pr-3 pl-5" : undefined}>
          <p className="flex items-baseline gap-3 text-xs font-bold tracking-wide text-ink-2 uppercase">
            {senderLabel[message.sender_type] ?? message.sender_type}
            <LocalTime iso={message.created_at} className="font-normal normal-case" />
          </p>
          <p className="mt-1 max-w-[70ch] text-[0.9375rem]/relaxed whitespace-pre-wrap">{message.content}</p>
          {message.sender_type === "assistant" &&
            (message.grounded ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-go">
                <Icon name="check" className="size-3.5" />
                Answered from {message.sources.length > 0 ? message.sources.join(", ") : "a source that has since been removed"}
              </p>
            ) : (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-2">
                <Icon name="person" className="size-3.5" />
                No source matched; handed to staff
              </p>
            ))}
        </li>
      ))}
    </ol>
  );
}
