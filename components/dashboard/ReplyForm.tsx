"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

/** Staff reply box. The customer sees the reply in their chat, and by email if they left an address. */
export default function ReplyForm({ conversationId, customerName, customerEmail }: { conversationId: string; customerName: string; customerEmail: string | null }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputId = `reply-${conversationId}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSending(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const result = (await response.json().catch(() => ({}))) as { emailed?: boolean; reason?: string | null; error?: string };
      if (!response.ok) {
        setError(result.error ?? "The reply could not be sent.");
        return;
      }
      setContent("");
      setNotice(
        result.emailed
          ? `Sent. ${customerName} sees it in their chat, and it was emailed to ${customerEmail}.`
          : result.reason === "no_customer_email"
            ? `Saved. ${customerName} sees it when they return to the chat (no email was given).`
            : `Saved and shown in the chat, but the email could not be sent. Check Automation.`,
      );
      router.refresh();
    } catch {
      setError("The server could not be reached. Check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form className="mt-4" onSubmit={submit}>
      <label className="field-label" htmlFor={inputId}>Reply to {customerName}</label>
      <textarea
        id={inputId}
        className="field mt-1.5 min-h-24 resize-y"
        required
        maxLength={5000}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
        }}
        aria-describedby={`${inputId}-hint`}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p id={`${inputId}-hint`} className="text-sm text-ink-2">
          {customerEmail ? `Also emailed to ${customerEmail}.` : "No email given: they will see it when they return to the chat."}
        </p>
        <button className="btn btn-primary" type="submit" disabled={isSending || !content.trim()}>
          {isSending ? "Sending" : "Send reply"}
        </button>
      </div>
      {notice && <p className="mt-3 alert-info" role="status">{notice}</p>}
      {error && <p className="mt-3 alert-error" role="alert">{error}</p>}
    </form>
  );
}
