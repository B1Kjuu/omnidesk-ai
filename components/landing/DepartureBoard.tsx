"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { askDesk, formatClock } from "@/lib/askDesk";
import { boardToneClasses, getStatus } from "@/lib/status";
import SplitFlap from "./SplitFlap";

type RowState = "answered" | "staff" | "checking" | "failed";

type Example = { question: string; state: RowState; sources: string[] };

type BoardRow = Example & {
  id: string;
  at: number | null; // absolute time; null until the clock is known
  offsetMinutes: number; // used for the opening rows before `at` is pinned
  fresh: boolean;
  answer?: string;
};

// Illustrative questions. The opening five are shown first; the rest arrive one by one.
const pool: Example[] = [
  { question: "Can I still get a refund after 30 days?", state: "answered", sources: ["Refund FAQ"] },
  { question: "Do you deliver to Cebu?", state: "answered", sources: ["Shipping policy"] },
  { question: "Can you invoice my company with a custom PO number?", state: "staff", sources: [] },
  { question: "My order arrived damaged. Can I swap it for a new one?", state: "answered", sources: ["Returns FAQ", "Shipping policy"] },
  { question: "Is there a student discount?", state: "answered", sources: ["Pricing FAQ"] },
  { question: "Will you match a competitor's price?", state: "staff", sources: [] },
  { question: "How long does a refund take to reach my card?", state: "answered", sources: ["Refund FAQ"] },
  { question: "Can I change the delivery address after ordering?", state: "answered", sources: ["Shipping policy"] },
  { question: "Can someone call me about a bulk order?", state: "staff", sources: [] },
  { question: "Do gift cards expire?", state: "answered", sources: ["Gift card terms"] },
];

const VISIBLE = 5;
const openingOffsets = [2, 4, 7, 9, 12];
const ROTATE_MS = 5200;

const statusIcon: Partial<Record<RowState, "check" | "person">> = { answered: "check", staff: "person" };

function rowTime(row: BoardRow, anchor: number | null) {
  if (row.at !== null) return formatClock(new Date(row.at));
  if (anchor === null) return "--:--";
  return formatClock(new Date(anchor - row.offsetMinutes * 60_000));
}

function sourceText(row: BoardRow) {
  if (row.state === "staff") return "No approved source";
  if (row.state === "checking") return "Searching";
  return row.sources.length > 0 ? row.sources.join(", ") : "None";
}

function RowStatus({ state, hangs, delay }: { state: RowState; hangs: boolean; delay: number }) {
  const status = getStatus("reply", state);
  const icon = statusIcon[state];

  return (
    <span
      className={`flex items-center gap-2 text-sm font-bold ${boardToneClasses[status.tone]} ${
        state === "staff" ? (hangs ? "-mr-4 px-3 py-1.5 sm:-mr-10 sm:pr-10" : "px-3 py-1.5") : ""
      } ${state === "checking" ? "motion-safe:animate-pulse" : ""}`}
    >
      {icon && <Icon name={icon} className="size-4 shrink-0" />}
      <SplitFlap text={status.label} delay={delay} />
    </span>
  );
}

function Row({ row, time, hangs, delay }: { row: BoardRow; time: string; hangs: boolean; delay: number }) {
  return (
    <li className={`border-t border-board-rule ${row.fresh ? "flap" : ""}`}>
      <div className="grid grid-cols-[3.25rem_1fr] items-center gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[4.5rem_1fr_12rem_9.5rem] sm:py-4 lg:grid-cols-[4.5rem_1fr_15rem_9.5rem]">
        <time className="font-mono text-base font-bold text-notice">
          <SplitFlap text={time} delay={delay} />
        </time>
        <p className="text-base leading-snug text-board-ink sm:text-lg">{row.question}</p>
        <p className="col-start-2 text-sm text-board-ink-2 sm:col-start-auto">
          <SplitFlap text={sourceText(row)} delay={delay + 60} />
        </p>
        <div className="col-start-2 flex sm:col-start-auto sm:justify-end">
          <RowStatus state={row.state} hangs={hangs} delay={delay + 120} />
        </div>
      </div>
      {row.answer && (
        <div className="grid grid-cols-[3.25rem_1fr] gap-x-4 pb-4 sm:grid-cols-[4.5rem_1fr]">
          <span aria-hidden="true" />
          <p className="max-w-[65ch] border-t border-dashed border-board-rule pt-3 text-[0.9375rem] leading-relaxed text-board-ink-2">
            <span className="mr-2 font-bold text-board-ink">Reply</span>
            {row.answer}
          </p>
        </div>
      )}
    </li>
  );
}

export default function DepartureBoard({ demoOrganizationId }: { demoOrganizationId: string | null }) {
  const boardRef = useRef<HTMLElement>(null);
  const [now, setNow] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [rows, setRows] = useState<BoardRow[]>(() =>
    pool.slice(0, VISIBLE).map((example, index) => ({ ...example, id: `ex-${index}`, at: null, offsetMinutes: openingOffsets[index], fresh: false })),
  );
  const nextIndex = useRef(VISIBLE);
  const [inView, setInView] = useState(true);
  const [liveRows, setLiveRows] = useState<BoardRow[]>([]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);

  // The board clock; the opening rows are pinned to the first reading.
  useEffect(() => {
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setAnchor((current) => current ?? time);
    };
    const first = requestAnimationFrame(tick);
    const timer = window.setInterval(tick, 15_000);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const node = boardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const paused = !inView || isSending || question.length > 0 || liveRows.length > 0;

  // New departures arrive while the board is visible; the oldest leaves.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const example = pool[nextIndex.current % pool.length];
      nextIndex.current += 1;
      setRows((current) => [{ ...example, id: `ex-${nextIndex.current}`, at: Date.now(), offsetMinutes: 0, fresh: true }, ...current].slice(0, VISIBLE));
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!demoOrganizationId || !question.trim()) return;

    const id = crypto.randomUUID();
    const asked = question.trim();
    setLiveRows((current) => [{ id, question: asked, state: "checking", sources: [], at: Date.now(), offsetMinutes: 0, fresh: true }, ...current]);
    setQuestion("");
    setIsSending(true);

    const result = await askDesk({ organizationId: demoOrganizationId, name: "Portfolio visitor", message: asked });
    setLiveRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        if (!result.ok) return { ...row, state: "failed", answer: result.error };
        return { ...row, state: result.reply.escalated ? "staff" : "answered", sources: result.reply.sources, answer: result.reply.answer };
      }),
    );
    setIsSending(false);
  }

  const allRows = [...liveRows, ...rows];
  const hangingId = allRows.find((row) => row.state === "staff")?.id;

  return (
    <section ref={boardRef} aria-labelledby="board-title" className="overflow-hidden bg-board text-board-ink">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-6 sm:px-10 sm:pt-12">
        <div className="flex items-start justify-between gap-6">
          <h1 id="board-title" className="max-w-[16ch] text-5xl leading-[0.98] font-bold tracking-[-0.035em] sm:text-7xl lg:text-[5rem]">
            Every answer leaves with its source.
          </h1>
          <time className="shrink-0 font-mono text-2xl font-bold text-notice sm:text-4xl" dateTime={now ? new Date(now).toISOString() : undefined}>
            {now ? formatClock(new Date(now)) : "--:--"}
          </time>
        </div>
        <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-board-ink-2 sm:text-xl">
          OmniDesk answers customers only from a business&apos;s approved knowledge. When that knowledge runs out, the question goes to a person instead of a guess.
        </p>

        <div className="mt-10 hidden grid-cols-[4.5rem_1fr_12rem_9.5rem] gap-x-4 pb-2 text-xs font-bold tracking-wide text-board-ink-2 uppercase sm:grid lg:grid-cols-[4.5rem_1fr_15rem_9.5rem]">
          <span>Time</span>
          <span>Customer question</span>
          <span>Answered from</span>
          <span className="text-right">Status</span>
        </div>
        <ol className="mt-8 sm:mt-0" aria-label="Departure board of customer questions" aria-live="off">
          {allRows.map((row, index) => (
            <Row
              key={row.id}
              row={row}
              time={rowTime(row, anchor)}
              hangs={row.id === hangingId}
              delay={row.fresh ? 0 : index * 90}
            />
          ))}
        </ol>

        <div className="border-t-2 border-board-ink py-5">
          {demoOrganizationId ? (
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[4.5rem_1fr_auto] sm:items-center sm:gap-x-4">
              <span className="hidden font-mono text-base font-bold text-notice sm:block">Now</span>
              <label className="sr-only" htmlFor="desk-question">Ask the demo desk a question</label>
              <input
                id="desk-question"
                className="w-full rounded-[2px] border border-board-rule bg-board-2 px-4 py-3 text-lg text-board-ink placeholder:text-board-ink-2 focus:border-board-ink focus:outline-none"
                placeholder="Ask the demo desk, for example: How long do refunds take?"
                maxLength={500}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <button className="btn btn-primary px-6 py-3 text-base" type="submit" disabled={isSending || !question.trim()}>
                {isSending ? "Sending" : "Ask the desk"}
                <Icon name="arrow" />
              </button>
              <p className="text-sm text-board-ink-2 sm:col-start-2">
                Live demo desk with a few approved FAQs. Rows below your question are illustrative; your question is answered for real.
              </p>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-base text-board-ink-2">Example rows are illustrative. Open your own desk to run it on your knowledge.</p>
              <Link href="/auth?mode=sign-up" className="btn btn-primary px-6 py-3 text-base no-underline">
                Open your own desk
                <Icon name="arrow" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
