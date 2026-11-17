"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

const engineering = [
  { part: "Tenant isolation", guarantee: "Every read and write is scoped to one organization by row-level security policies, not by application code alone.", built: "Supabase Postgres RLS" },
  { part: "Grounded answers", guarantee: "The model only sees the approved source that matched the question, and the source is stored with the reply.", built: "Gemini, called server-side" },
  { part: "Escalation", guarantee: "A question without supporting knowledge opens a ticket and flags the conversation for staff in the same request.", built: "Postgres functions" },
  { part: "Automation", guarantee: "Each escalation becomes an idempotent workflow event, delivered to a webhook and tracked to completion or failure.", built: "n8n on Azure, Gmail" },
  { part: "Accounts", guarantee: "Team members sign in, create organizations, and hold owner, admin, or agent roles.", built: "Supabase Auth" },
];

export default function Timetable() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Table rows do not take transforms reliably, so each row's cells flip down together.
        gsap.set(".js-tt-row > *", { rotationX: -80, transformOrigin: "50% 0%", autoAlpha: 0 });
        ScrollTrigger.batch(".js-tt-row", {
          start: "top 88%",
          once: true,
          onEnter: (rows) =>
            gsap.to(
              rows.flatMap((row) => Array.from((row as HTMLElement).children)),
              { rotationX: 0, autoAlpha: 1, duration: 0.55, stagger: 0.09, ease: "power3.out", overwrite: true },
            ),
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="engineering" aria-labelledby="engineering-title" className="bg-platform">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-10 lg:py-32">
        <h2 id="engineering-title" className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">Underneath the timetable</h2>
        <p className="mt-5 max-w-[60ch] text-lg/relaxed text-ink-2">What each part of the system guarantees, and what it is built on.</p>

        <div className="mt-12 border-t-4 border-ink perspective-distant">
          <table className="w-full border-collapse text-left">
            <thead className="hidden md:table-header-group">
              <tr className="text-xs tracking-wide text-ink-2 uppercase">
                <th scope="col" className="w-[22%] py-3 pr-6 font-bold">Part</th>
                <th scope="col" className="py-3 pr-6 font-bold">What it guarantees</th>
                <th scope="col" className="w-[24%] py-3 font-bold">Built with</th>
              </tr>
            </thead>
            <tbody>
              {engineering.map((row) => (
                <tr key={row.part} className="js-tt-row grid border-t border-rule-strong py-5 md:table-row md:py-0">
                  <th scope="row" className="text-xl font-bold tracking-[-0.01em] md:py-6 md:pr-6 md:align-top">{row.part}</th>
                  <td className="mt-1 text-base/relaxed text-ink-2 md:mt-0 md:py-6 md:pr-6 md:align-top">{row.guarantee}</td>
                  <td className="mt-2 md:mt-0 md:py-6 md:align-top">
                    <span className="inline-block rounded-xs bg-ink px-2.5 py-1 text-sm font-bold text-white">{row.built}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
