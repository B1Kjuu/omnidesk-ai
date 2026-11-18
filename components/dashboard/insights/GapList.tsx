"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LocalTime from "@/components/ui/LocalTime";
import type { KnowledgeGap } from "@/lib/server/insights/gaps";

type Draft = { question: string; answer: string; grounded: boolean };

/**
 * Knowledge gaps: unanswered questions grouped by meaning. Admins turn one into an FAQ: Gemini drafts it from
 * what staff already replied (never from thin air), staff edit it, and publishing indexes it like any FAQ.
 */
export default function GapList({ organizationId, gaps, canManage }: { organizationId: string; gaps: KnowledgeGap[]; canManage: boolean }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<{ id: string; text: string; tone: "info" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  async function startDraft(gap: KnowledgeGap) {
    setOpenId(gap.id);
    setDraft(null);
    setStatus(null);
    setBusy(true);
    try {
      const response = await fetch("/api/insights/draft-faq", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId, questions: gap.examples, staffReplies: gap.staffReplies }),
      });
      const result = (await response.json().catch(() => ({}))) as Partial<Draft> & { error?: string };
      if (!response.ok) {
        setStatus({ id: gap.id, text: result.error ?? "The draft could not be created.", tone: "error" });
        setDraft({ question: gap.label, answer: "", grounded: false });
        return;
      }
      setDraft({ question: result.question ?? gap.label, answer: result.answer ?? "", grounded: Boolean(result.grounded) });
    } finally {
      setBusy(false);
    }
  }

  async function publish(gap: KnowledgeGap) {
    if (!draft?.question.trim() || !draft.answer.trim()) return;
    setBusy(true);
    setStatus(null);
    const form = new FormData();
    form.set("organizationId", organizationId);
    form.set("type", "faq");
    form.set("name", draft.question.trim().slice(0, 120));
    form.set("content", `Q: ${draft.question.trim()}\nA: ${draft.answer.trim()}`);
    try {
      const response = await fetch("/api/knowledge", { method: "POST", body: form });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setStatus({ id: gap.id, text: result.error ?? "The FAQ could not be published.", tone: "error" });
        return;
      }
      setStatus({ id: gap.id, text: "Published. The next customer who asks this gets an instant, cited answer.", tone: "info" });
      setDraft(null);
      setOpenId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (gaps.length === 0) {
    return <p className="py-4 text-[0.9375rem] text-ink-2">No unanswered questions in this period. Your knowledge covered everything customers asked.</p>;
  }

  return (
    <ol>
      {gaps.map((gap) => (
        <li key={gap.id} className="border-b border-rule py-4 last:border-b-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 basis-72">
              <p className="font-bold">&ldquo;{gap.label}&rdquo;</p>
              <p className="mt-1 text-sm text-ink-2">
                Asked {gap.count} {gap.count === 1 ? "time" : "times"} · last <LocalTime iso={gap.lastAskedAt} />
                {gap.staffReplies.length > 0 ? " · staff have replied" : " · no staff reply yet"}
              </p>
              {gap.examples.length > 1 && (
                <ul className="mt-2 space-y-0.5 text-sm text-ink-2">
                  {gap.examples.filter((example) => example !== gap.label).slice(0, 3).map((example) => <li key={example}>&ldquo;{example}&rdquo;</li>)}
                </ul>
              )}
            </div>
            {canManage && openId !== gap.id && (
              <button type="button" className="btn btn-secondary py-1.5 text-sm" disabled={busy} onClick={() => startDraft(gap)}>
                Turn into an FAQ
              </button>
            )}
          </div>

          {openId === gap.id && (
            <div className="mt-4 border border-rule bg-platform p-4">
              {!draft ? (
                <p className="text-sm font-bold text-ink-2 motion-safe:animate-pulse">Drafting from staff replies</p>
              ) : (
                <>
                  <p className="text-sm text-ink-2">
                    {draft.grounded
                      ? "Drafted only from what your team already replied. Check it before publishing."
                      : "No staff reply covers this yet, so write the answer yourself. OmniDesk does not invent facts."}
                  </p>
                  <label className="field-label mt-3 block" htmlFor={`gap-q-${gap.id}`}>Question</label>
                  <input id={`gap-q-${gap.id}`} className="field mt-1.5" maxLength={300} value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} />
                  <label className="field-label mt-3 block" htmlFor={`gap-a-${gap.id}`}>Approved answer</label>
                  <textarea id={`gap-a-${gap.id}`} className="field mt-1.5 min-h-24 resize-y" maxLength={5000} value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.target.value })} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary" disabled={busy || !draft.question.trim() || !draft.answer.trim()} onClick={() => publish(gap)}>
                      {busy ? "Publishing" : "Publish to knowledge"}
                    </button>
                    <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => { setOpenId(null); setDraft(null); }}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {status?.id === gap.id && <p className={`mt-3 ${status.tone === "error" ? "alert-error" : "alert-info"}`} role="status">{status.text}</p>}
        </li>
      ))}
    </ol>
  );
}
