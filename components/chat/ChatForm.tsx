"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { askDesk, fetchThread, formatClock, rateAnswer, saveContactEmail, type Citation, type ThreadMessage } from "@/lib/askDesk";
import { useTurnstile } from "@/lib/useTurnstile";
import { getStatus, replyToneClasses } from "@/lib/status";

type Session = { conversationId: string; conversationToken: string };
type Pending = { id: string; question: string; error: string | null };

const POLL_MS = 10_000;
const storageKey = (organizationId: string) => `omnidesk:chat:${organizationId}`;

// The conversation token lives only in this browser. Storage can be unavailable (private mode), so every access is guarded.
function readSession(organizationId: string): Session | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(organizationId)) ?? "null") as Partial<Session> | null;
    return parsed?.conversationId && parsed.conversationToken ? { conversationId: parsed.conversationId, conversationToken: parsed.conversationToken } : null;
  } catch {
    return null;
  }
}
function writeSession(organizationId: string, session: Session | null) {
  try {
    if (session) window.localStorage.setItem(storageKey(organizationId), JSON.stringify(session));
    else window.localStorage.removeItem(storageKey(organizationId));
  } catch {
    // Without storage the conversation still works for this visit.
  }
}

function Citations({ citations }: { citations: Citation[] }) {
  return citations.map((citation) => (
    <figure key={citation.source} className="mt-2 max-w-[65ch] border-l-2 border-go bg-paper px-3 py-2">
      {citation.quote && <blockquote className="text-sm/relaxed text-ink-2">&ldquo;{citation.quote}&rdquo;</blockquote>}
      <figcaption className="mt-1 text-xs text-ink-2">
        {citation.url ? (
          <a href={citation.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">{citation.source}</a>
        ) : (
          <span className="font-bold">{citation.source}</span>
        )}
      </figcaption>
    </figure>
  ));
}

/** `compact` is the narrow layout used inside the website widget (app/embed). */
export default function ChatForm({ organizationId, organizationName, compact = false }: { organizationId: string; organizationName: string; compact?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [waitingForStaff, setWaitingForStaff] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [identified, setIdentified] = useState(false);
  const [message, setMessage] = useState("");
  const [contactDraft, setContactDraft] = useState("");
  const [contactNotice, setContactNotice] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { mount: mountTurnstile, ready: turnstileReady, failed: turnstileFailed, consume: consumeTurnstile } = useTurnstile();

  const apply = useCallback((current: Session, thread: Awaited<ReturnType<typeof fetchThread>>) => {
    if (thread === "unavailable") return;
    if (thread === null) {
      // The conversation was deleted or the token is stale: start fresh.
      writeSession(organizationId, null);
      setSession(null);
      setMessages([]);
      setWaitingForStaff(false);
      return;
    }
    setSession(current);
    setMessages(thread.messages);
    setWaitingForStaff(thread.waitingForStaff);
    setSavedEmail(thread.customer.email);
    setName((value) => value || thread.customer.name);
    setEmail((value) => value || thread.customer.email || "");
    setIdentified(true);
  }, [organizationId]);

  // Fetch, then update state in the promise callback.
  const load = useCallback(
    (current: Session) => fetchThread(current.conversationId, current.conversationToken).then((thread) => apply(current, thread)),
    [apply],
  );

  // Returning customer: restore the conversation kept in this browser.
  useEffect(() => {
    const saved = readSession(organizationId);
    if (!saved) return;
    fetchThread(saved.conversationId, saved.conversationToken).then((thread) => apply(saved, thread));
  }, [organizationId, apply]);

  // While a person is expected to reply, check for it every few seconds (only when the tab is visible).
  useEffect(() => {
    if (!session || !waitingForStaff) return;
    const tick = () => {
      if (document.visibilityState === "visible") void load(session);
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session, waitingForStaff, load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = message.trim();
    if (!question || !name.trim() || !turnstileReady) return;
    const turnstileToken = consumeTurnstile();

    const pendingId = crypto.randomUUID();
    setPending({ id: pendingId, question, error: null });
    setMessage("");
    setIdentified(true);
    setIsSending(true);

    const result = await askDesk({
      organizationId,
      name: name.trim(),
      email: email.trim(),
      message: question,
      turnstileToken,
      ...(session ? { conversationId: session.conversationId, conversationToken: session.conversationToken } : {}),
    });

    if (!result.ok) {
      if (result.status === 404 && session) {
        writeSession(organizationId, null);
        setSession(null);
        setMessages([]);
      }
      setPending({ id: pendingId, question, error: result.error });
      setMessage(question);
      setIsSending(false);
      return;
    }

    const current = session ?? (result.reply.conversationToken ? { conversationId: result.reply.conversationId, conversationToken: result.reply.conversationToken } : null);
    if (current && !session) writeSession(organizationId, current);
    if (current) await load(current);
    setPending(null);
    setIsSending(false);
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const value = contactDraft.trim();
    const failure = await saveContactEmail(session.conversationId, session.conversationToken, value);
    if (failure) {
      setContactNotice(failure);
      return;
    }
    setSavedEmail(value);
    setEmail(value);
    setContactDraft("");
    setContactNotice(`Thanks. The team will also email ${value} when they reply.`);
  }

  async function rate(messageId: string, rating: 1 | -1) {
    if (!session) return;
    setMessages((items) => items.map((item) => (item.id === messageId ? { ...item, rating } : item)));
    const saved = await rateAnswer(session.conversationId, session.conversationToken, messageId, rating);
    if (!saved) setMessages((items) => items.map((item) => (item.id === messageId ? { ...item, rating: null } : item)));
  }

  function startOver() {
    writeSession(organizationId, null);
    setSession(null);
    setMessages([]);
    setWaitingForStaff(false);
    setPending(null);
    setContactNotice("");
  }

  const hasConversation = messages.length > 0 || pending !== null;
  const lastAssistant = [...messages].reverse().find((item) => item.sender === "assistant");
  const askForEmail = waitingForStaff && !savedEmail && lastAssistant && !lastAssistant.grounded;

  return (
    <div className={`flex flex-1 flex-col ${compact ? "gap-5" : "gap-8"}`}>
      {!hasConversation ? (
        <div className="max-w-[60ch]">
          <h2 className={`${compact ? "text-lg" : "text-xl"} font-bold`}>Ask {organizationName} a question</h2>
          {/* In the widget the panel header already says this; keep the question box above the fold. */}
          <p className={`mt-2 text-base/relaxed text-ink-2 ${compact ? "hidden" : ""}`}>
            Answers come from {organizationName}&apos;s approved help articles. If none of them covers your question, it goes straight to a person on the team, and their reply appears here.
          </p>
        </div>
      ) : (
        <div>
          <ol className="space-y-5" aria-label="Your conversation" aria-live="polite">
            {messages.map((item) => (
              <li key={item.id} className="grid grid-cols-[3.5rem_1fr] gap-x-4">
                <time className="pt-0.5 font-mono text-sm font-bold text-ink-2" dateTime={item.createdAt}>{formatClock(new Date(item.createdAt))}</time>
                {item.sender === "customer" ? (
                  <div className="border-l-2 border-ink pl-5">
                    <p className="text-xs font-bold tracking-wide text-ink-2 uppercase">You</p>
                    <p className="mt-1 text-lg/snug whitespace-pre-wrap">{item.content}</p>
                  </div>
                ) : item.sender === "agent" ? (
                  <div className="border-l-4 border-go bg-go-wash px-4 py-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-go uppercase">
                      <Icon name="person" className="size-3.5" />
                      {organizationName} team
                    </p>
                    <p className="mt-1 max-w-[65ch] text-base/relaxed whitespace-pre-wrap">{item.content}</p>
                  </div>
                ) : (
                  <div className="border-l-2 border-rule-strong pl-5">
                    <p className="max-w-[65ch] text-base/relaxed whitespace-pre-wrap">{item.content}</p>
                    {item.grounded ? (
                      <div className="mt-3">
                        <p className={`flex items-center gap-2 text-sm ${replyToneClasses[getStatus("reply", "answered").tone]}`}>
                          <Icon name="check" className="size-4 shrink-0" />
                          <span>
                            <span className="font-bold">{getStatus("reply", "answered").label} from</span>{" "}
                            {item.citations.map((citation) => citation.source).join(", ") || "approved help articles"}
                          </span>
                        </p>
                        <Citations citations={item.citations} />
                        {session && (
                          <div className="mt-2 flex items-center gap-1 text-sm text-ink-2" role="group" aria-label="Rate this answer">
                            <span className="mr-1">{item.rating ? "Thanks for the feedback." : "Was this helpful?"}</span>
                            {([1, -1] as const).map((value) => (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={item.rating === value}
                                className={`rounded-xs border px-2 py-0.5 font-bold ${item.rating === value ? "border-ink bg-ink text-white" : "border-rule-strong hover:border-ink hover:text-ink"}`}
                                onClick={() => rate(item.id, value)}
                              >
                                {value === 1 ? "Yes" : "No"}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className={`mt-3 flex items-start gap-2 px-3 py-2 text-sm font-bold ${replyToneClasses[getStatus("reply", "staff").tone]}`}>
                        <Icon name="person" className="mt-0.5 size-4 shrink-0" />
                        {savedEmail
                          ? `With the ${organizationName} team. Their reply will appear here and be emailed to ${savedEmail}.`
                          : `With the ${organizationName} team. Their reply will appear here, so keep this page or come back later.`}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}

            {pending && (
              <li className="grid grid-cols-[3.5rem_1fr] gap-x-4">
                <span className="pt-0.5 font-mono text-sm font-bold text-ink-2">Now</span>
                <div className="border-l-2 border-ink pl-5">
                  <p className="text-xs font-bold tracking-wide text-ink-2 uppercase">You</p>
                  <p className="mt-1 text-lg/snug whitespace-pre-wrap">{pending.question}</p>
                  {pending.error ? (
                    <p className="mt-3 alert-error" role="alert">{pending.error}</p>
                  ) : (
                    <p className={`mt-3 text-[0.9375rem] font-bold motion-safe:animate-pulse ${replyToneClasses[getStatus("reply", "checking").tone]}`}>
                      {getStatus("reply", "checking").label}
                    </p>
                  )}
                </div>
              </li>
            )}
          </ol>

          {askForEmail && (
            <form className="mt-6 border border-dashed border-rule-strong bg-paper p-4" onSubmit={saveContact}>
              <label className="field-label" htmlFor="chat-contact">Want the reply by email too?</label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input id="chat-contact" className="field min-w-0 flex-1" type="email" autoComplete="email" required maxLength={320} placeholder="you@example.com" value={contactDraft} onChange={(event) => setContactDraft(event.target.value)} />
                <button className="btn btn-secondary" type="submit">Email me the reply</button>
              </div>
            </form>
          )}
          {contactNotice && <p className="mt-3 alert-info" role="status">{contactNotice}</p>}
        </div>
      )}

      <form className={`${hasConversation ? "mt-auto" : ""} border border-rule bg-paper ${compact ? "p-4" : "p-5 sm:p-6"}`} onSubmit={submit}>
        {identified ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
            <span>
              Asking as <span className="font-bold text-ink">{name}</span>
              {(savedEmail || email) && <> · {savedEmail || email}</>}
            </span>
            <span className="flex gap-1">
              {!session && (
                <button type="button" className="btn btn-quiet py-1 text-sm" onClick={() => setIdentified(false)}>
                  Change details
                </button>
              )}
              {session && (
                <button type="button" className="btn btn-quiet py-1 text-sm" onClick={startOver}>
                  New conversation
                </button>
              )}
            </span>
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
              <p id="chat-email-hint" className="field-hint">So the team can also reply by email.</p>
            </div>
          </div>
        )}

        <label className="field-label" htmlFor="chat-message">{session ? "Your message" : "Your question"}</label>
        <textarea
          id="chat-message"
          className={`field mt-1.5 resize-y ${compact ? "min-h-20" : "min-h-28"}`}
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
          {!compact && <p className="hidden text-sm text-ink-2 sm:block">Ctrl or ⌘ + Enter to send</p>}
          <button className="btn btn-primary px-6" type="submit" disabled={isSending || !message.trim() || !name.trim() || !turnstileReady}>
            {isSending ? "Sending" : turnstileReady ? (session ? "Send" : "Send question") : "Checking connection"}
            <Icon name="arrow" />
          </button>
        </div>
      </form>
    </div>
  );
}
