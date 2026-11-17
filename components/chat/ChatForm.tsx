"use client";

import { FormEvent, useState } from "react";
import Icon from "@/components/ui/Icon";
import { askDesk, formatClock, type DeskReply } from "@/lib/askDesk";
import { useTurnstile } from "@/lib/useTurnstile";
import { getStatus, replyToneClasses } from "@/lib/status";

type Exchange = {
  id: string;
  time: string;
  question: string;
  reply: DeskReply | null;
  error: string | null;
};

export default function ChatForm({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [identified, setIdentified] = useState(false);
  const [message, setMessage] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isSending, setIsSending] = useState(false);
  const { mount: mountTurnstile, ready: turnstileReady, failed: turnstileFailed, consume: consumeTurnstile } = useTurnstile();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = message.trim();
    if (!question || !name.trim() || !turnstileReady) return;
    const turnstileToken = consumeTurnstile();

    const id = crypto.randomUUID();
    setExchanges((items) => [...items, { id, time: formatClock(new Date()), question, reply: null, error: null }]);
    setMessage("");
    setIdentified(true);
    setIsSending(true);

    const result = await askDesk({ organizationId, name: name.trim(), email: email.trim(), message: question, turnstileToken });
    setExchanges((items) =>
      items.map((item) => (item.id !== id ? item : result.ok ? { ...item, reply: result.reply } : { ...item, error: result.error })),
    );
    setIsSending(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      {exchanges.length === 0 ? (
        <div className="max-w-[60ch]">
          <h2 className="text-xl font-bold">Ask {organizationName} a question</h2>
          <p className="mt-2 text-base/relaxed text-ink-2">
            Answers come from {organizationName}&apos;s approved help articles. If none of them covers your question, it goes straight to a person on the team.
          </p>
        </div>
      ) : (
        <ol className="space-y-8" aria-label="Your conversation" aria-live="polite">
          {exchanges.map((item) => (
            <li key={item.id} className="flap relative grid grid-cols-[3.5rem_1fr] gap-x-4">
              <time className="pt-0.5 font-mono text-sm font-bold text-ink-2">{item.time}</time>
              <div className="border-l-2 border-ink pl-5">
                <p className="text-xs font-bold tracking-wide text-ink-2 uppercase">You asked</p>
                <p className="mt-1 text-lg/snug">{item.question}</p>

                <div className="mt-4 border-t border-dashed border-rule-strong pt-4">
                  {item.error ? (
                    <p className="alert-error" role="alert">{item.error}</p>
                  ) : !item.reply ? (
                    <p className={`text-[0.9375rem] font-bold motion-safe:animate-pulse ${replyToneClasses[getStatus("reply", "checking").tone]}`}>
                      {getStatus("reply", "checking").label}
                    </p>
                  ) : (
                    <>
                      <p className="max-w-[65ch] text-base/relaxed whitespace-pre-wrap">{item.reply.answer}</p>
                      {item.reply.escalated ? (
                        <p className={`mt-3 flex items-start gap-2 px-3 py-2 text-sm font-bold ${replyToneClasses[getStatus("reply", "staff").tone]}`}>
                          <Icon name="person" className="mt-0.5 size-4 shrink-0" />
                          {email.trim()
                            ? `Passed to the ${organizationName} team. They will reply to ${email.trim()}.`
                            : `Passed to the ${organizationName} team. Add your email below so they can reply.`}
                        </p>
                      ) : (
                        <div className="mt-3">
                          <p className={`flex items-center gap-2 text-sm ${replyToneClasses[getStatus("reply", "answered").tone]}`}>
                            <Icon name="check" className="size-4 shrink-0" />
                            <span>
                              <span className="font-bold">{getStatus("reply", "answered").label} from</span>{" "}
                              {item.reply.sources.length > 0 ? item.reply.sources.join(", ") : "approved help articles"}
                            </span>
                          </p>
                          {item.reply.citations.map((citation) => (
                            <figure key={citation.source} className="mt-2 max-w-[65ch] border-l-2 border-go bg-paper px-3 py-2">
                              <blockquote className="text-sm/relaxed text-ink-2">&ldquo;{citation.quote}&rdquo;</blockquote>
                              <figcaption className="mt-1 text-xs text-ink-2">
                                {citation.url ? (
                                  <a href={citation.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">{citation.source}</a>
                                ) : (
                                  <span className="font-bold">{citation.source}</span>
                                )}
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form className={`${exchanges.length > 0 ? "mt-auto" : ""} border border-rule bg-paper p-5 sm:p-6`} onSubmit={submit}>
        {identified ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
            <span>
              Asking as <span className="font-bold text-ink">{name}</span>
              {email && <> · {email}</>}
            </span>
            <button type="button" className="btn btn-quiet py-1 text-sm" onClick={() => setIdentified(false)}>
              Change details
            </button>
          </div>
        ) : (
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="chat-name">Your name</label>
              <input id="chat-name" className="field mt-1.5" autoComplete="name" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="chat-email">
                Email <span className="font-normal text-ink-2">(optional)</span>
              </label>
              <input id="chat-email" className="field mt-1.5" type="email" autoComplete="email" maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby="chat-email-hint" />
              <p id="chat-email-hint" className="field-hint">Needed if a person has to reply.</p>
            </div>
          </div>
        )}

        <label className="field-label" htmlFor="chat-message">Your question</label>
        <textarea
          id="chat-message"
          className="field mt-1.5 min-h-28 resize-y"
          required
          maxLength={5000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
          }}
        />
        <div ref={mountTurnstile} className="mt-3 empty:hidden" />
        {turnstileFailed && (
          <p className="mt-3 alert-error" role="alert">The security check could not load. Disable content blockers for this page or refresh it.</p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="hidden text-sm text-ink-2 sm:block">Ctrl or ⌘ + Enter to send</p>
          <button className="btn btn-primary px-6" type="submit" disabled={isSending || !message.trim() || !name.trim() || !turnstileReady}>
            {isSending ? "Sending" : turnstileReady ? "Send question" : "Checking connection"}
            <Icon name="arrow" />
          </button>
        </div>
      </form>
    </div>
  );
}
