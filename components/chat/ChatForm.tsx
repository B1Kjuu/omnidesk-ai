"use client";

import { FormEvent, useState } from "react";

export default function ChatForm({ organizationId }: { organizationId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId, name, email, message }),
      });
      const result: { answer?: string; error?: string } = await response.json();

      if (!response.ok) {
        setStatus(result.error ?? "We could not send your message.");
        return;
      }

      setName("");
      setEmail("");
      setMessage("");
      setStatus(result.answer ?? "Thanks. Your message has been sent to the support team.");
    } catch {
      setStatus("We could not reach the support service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block text-sm font-medium text-slate-700">
        Name
        <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" type="email" maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        How can we help?
        <textarea className="mt-2 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2.5" required maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      {status && <p className="text-sm text-slate-700" role="status">{status}</p>}
      <button className="w-full rounded-lg bg-slate-950 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
