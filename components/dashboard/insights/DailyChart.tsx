"use client";

import { useState } from "react";

export type DailyPoint = { day: string; answered: number; escalated: number };

// Validated with the dataviz palette checker against white: both pass lightness, 3:1 contrast,
// and colour-blind separation (ΔE 9.6). Identity is never colour-only: legend, tooltip, and table view.
const ANSWERED = "#0f7b3f";
const ESCALATED = "#b8860b";

const HEIGHT = 140;
const GAP = 2;

function formatDay(day: string, style: "short" | "long" = "short") {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString([], { month: "short", day: "numeric", timeZone: "UTC", ...(style === "long" ? { weekday: "short" } : {}) });
}

/** Stacked daily bars: answered by OmniDesk (bottom) and handed to staff (top). */
export default function DailyChart({ data }: { data: DailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((point) => point.answered + point.escalated));
  const step = 100 / data.length;
  const barWidth = step * 0.62;
  const scale = (value: number) => (value / max) * HEIGHT;
  const point = active === null ? null : data[active];

  return (
    <figure>
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-bold">Questions per day</span>
        <span className="flex gap-4 text-sm text-ink-2" aria-hidden="true">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-xs" style={{ background: ANSWERED }} />Answered by OmniDesk</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-xs" style={{ background: ESCALATED }} />Handed to staff</span>
        </span>
      </figcaption>

      <div className="relative mt-4">
        <svg viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" className="h-36 w-full overflow-visible" role="img" aria-label={`Questions per day over the last ${data.length} days. A table view follows.`}>
          {[0.5, 1].map((fraction) => (
            <line key={fraction} x1="0" x2="100" y1={HEIGHT - HEIGHT * fraction} y2={HEIGHT - HEIGHT * fraction} stroke="#d9dce1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {data.map((entry, index) => {
            const x = index * step + (step - barWidth) / 2;
            const answeredHeight = scale(entry.answered);
            const escalatedHeight = scale(entry.escalated);
            const gap = answeredHeight > 0 && escalatedHeight > 0 ? GAP : 0;
            return (
              <g key={entry.day} opacity={active === null || active === index ? 1 : 0.45}>
                {answeredHeight > 0 && <rect x={x} y={HEIGHT - answeredHeight} width={barWidth} height={answeredHeight} fill={ANSWERED} />}
                {escalatedHeight > 0 && <rect x={x} y={HEIGHT - answeredHeight - gap - escalatedHeight} width={barWidth} height={escalatedHeight} fill={ESCALATED} />}
                {/* Full-height hit target, larger than the mark. */}
                <rect
                  x={index * step}
                  y="0"
                  width={step}
                  height={HEIGHT}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${formatDay(entry.day, "long")}: ${entry.answered} answered, ${entry.escalated} handed to staff`}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
          <line x1="0" x2="100" y1={HEIGHT} y2={HEIGHT} stroke="#b9bec6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>

        {point && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full border border-rule bg-paper px-3 py-2 text-sm whitespace-nowrap shadow-[0_4px_12px_rgba(21,23,26,0.12)]"
            style={{ left: `${Math.min(92, Math.max(8, (active! + 0.5) * step))}%` }}
          >
            <p className="font-bold">{formatDay(point.day, "long")}</p>
            <p className="text-ink-2"><span className="font-bold text-ink">{point.answered}</span> answered by OmniDesk</p>
            <p className="text-ink-2"><span className="font-bold text-ink">{point.escalated}</span> handed to staff</p>
          </div>
        )}

        <div className="mt-1.5 flex justify-between text-xs text-ink-2" aria-hidden="true">
          <span>{formatDay(data[0].day)}</span>
          <span>{formatDay(data[data.length - 1].day)}</span>
        </div>
        <p className="mt-1 text-xs text-ink-2" aria-hidden="true">Peak: {max} {max === 1 ? "question" : "questions"} in a day</p>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">Show as a table</summary>
        <table className="mt-2 w-full max-w-md text-left">
          <thead className="text-ink-2"><tr><th className="py-1 font-bold">Day</th><th className="py-1 text-right font-bold">Answered</th><th className="py-1 text-right font-bold">To staff</th></tr></thead>
          <tbody>
            {data.filter((entry) => entry.answered + entry.escalated > 0).map((entry) => (
              <tr key={entry.day} className="border-t border-rule"><td className="py-1">{formatDay(entry.day, "long")}</td><td className="py-1 text-right font-mono">{entry.answered}</td><td className="py-1 text-right font-mono">{entry.escalated}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
