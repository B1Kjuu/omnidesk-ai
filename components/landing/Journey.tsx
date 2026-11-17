"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import RouteMap from "./RouteMap";

const captions = [
  { title: "A customer asks.", body: "Each organization has its own public chat page. The question is saved before anything else happens." },
  { title: "Only approved knowledge is searched.", body: "That organization's FAQs and nothing else. Row-level security keeps every other tenant's knowledge out of reach." },
  { title: "Answered, with its source.", body: "A match sends the question down the green line. The reply is written only from that FAQ and stores it as its source." },
  { title: "No match? It goes to staff.", body: "No guessing. A ticket opens and the conversation is flagged for the team." },
  { title: "The team is emailed.", body: "The handoff becomes a workflow event, delivered to n8n and on to Gmail. A failed delivery keeps its error." },
];

const TRUNK = "M60 220 H390";
const GREEN = "M390 220 C450 220 470 100 530 100 H650";
const YELLOW = "M390 220 C450 220 470 340 530 340 H690";

function Station({ x, y, label, className = "" }: { x: number; y: number; label: string; className?: string }) {
  return (
    <g className={className}>
      <circle cx={x} cy={y} r={15} className="fill-paper stroke-ink" strokeWidth={6} />
      <text x={x} y={y + 44} textAnchor="middle" className="fill-ink text-[15px] font-bold">
        {label}
      </text>
    </g>
  );
}

function Ticket({ className, text, tone }: { className: string; text: string; tone: "ink" | "notice" }) {
  return (
    <g className={`invisible ${className}`}>
      <rect x={-92} y={-19} width={184} height={38} rx={2} className={tone === "ink" ? "fill-ink" : "fill-notice"} />
      <text x={0} y={6} textAnchor="middle" className={`text-[14px] font-bold ${tone === "ink" ? "fill-white" : "fill-ink"}`}>
        {text}
      </text>
    </g>
  );
}

function Stamp({ className, x, y, text, tone }: { className: string; x: number; y: number; text: string; tone: "go" | "notice" | "ink" }) {
  const fill = tone === "go" ? "fill-go" : tone === "notice" ? "fill-notice" : "fill-ink";
  const ink = tone === "notice" ? "fill-ink" : "fill-white";
  const width = text.length * 8.4 + 28;
  return (
    <g className={className} transform={`translate(${x} ${y})`}>
      <rect x={-width / 2} y={-17} width={width} height={34} rx={2} className={fill} />
      <text x={0} y={5} textAnchor="middle" className={`text-[14px] font-bold ${ink}`}>
        {text}
      </text>
    </g>
  );
}

export default function Journey() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`(min-width: 1024px) and ${MOTION_OK}`, () => {
        const caps = gsap.utils.toArray<HTMLElement>(".js-caption");
        gsap.set(caps.slice(1), { autoAlpha: 0, y: 24 });
        gsap.set([".js-fill-trunk", ".js-fill-green", ".js-fill-yellow"], { drawSVG: "0%" });
        gsap.set([".js-stamp-answer", ".js-stamp-ticket", ".js-stamp-email"], { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%" });
        gsap.set(".js-token-b", { autoAlpha: 0 });

        const ride = (path: string, start: number, end: number) => ({
          motionPath: { path, align: path, alignOrigin: [0.5, 0.5] as [number, number], start, end },
        });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: ".js-journey-pin", start: "top top", end: "+=3600", pin: true, scrub: 0.8 },
        });

        const swap = (from: number, to: number, at: number) => {
          tl.to(caps[from], { autoAlpha: 0, y: -24, duration: 0.3, ease: "power2.in" }, at).to(caps[to], { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, at + 0.25);
        };

        // First question: answered from the Refund FAQ.
        tl.set(".js-token-a", { ...ride("#journey-green", 0, 0), autoAlpha: 1 }, 0)
          .to(".js-token-a", { ...ride("#journey-green", 0, 0.28), duration: 0.8 }, 0)
          .to(".js-fill-trunk", { drawSVG: "0% 52%", duration: 0.8 }, 0);
        swap(0, 1, 0.7);
        tl.to(".js-faq-refund", { fill: "#e5f3ea", stroke: "#0f7b3f", duration: 0.3 }, 1.0)
          .to(".js-token-a", { ...ride("#journey-green", 0.28, 0.55), duration: 0.8 }, 1.3)
          .to(".js-fill-trunk", { drawSVG: "0% 100%", duration: 0.8 }, 1.3);
        swap(1, 2, 2.0);
        tl.to(".js-token-a", { ...ride("#journey-green", 0.55, 1), duration: 0.9 }, 2.1)
          .to(".js-fill-green", { drawSVG: "0% 100%", duration: 0.9 }, 2.1)
          .to(".js-stamp-answer", { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 3.0);

        // Second question: no source, so it rides the staff line.
        tl.to(".js-faq-refund", { fill: "#ffffff", stroke: "#b9bec6", duration: 0.2 }, 3.3)
          .set(".js-token-b", ride("#journey-yellow", 0, 0), 3.3)
          .to(".js-token-b", { autoAlpha: 1, duration: 0.2 }, 3.3)
          .to(".js-token-b", { ...ride("#journey-yellow", 0, 0.27), duration: 0.7 }, 3.4)
          .to(".js-faq-card", { autoAlpha: 0.35, duration: 0.25 }, 4.0)
          .to(".js-token-b", { ...ride("#journey-yellow", 0.27, 0.55), duration: 0.6 }, 4.2);
        swap(2, 3, 4.4);
        tl.to(".js-token-b", { ...ride("#journey-yellow", 0.55, 0.81), duration: 0.7 }, 4.8)
          .to(".js-fill-yellow", { drawSVG: "0% 76%", duration: 0.7 }, 4.8)
          .to(".js-stamp-ticket", { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 5.5);
        swap(3, 4, 5.8);
        tl.to(".js-token-b", { ...ride("#journey-yellow", 0.81, 1), duration: 0.5 }, 6.0)
          .to(".js-fill-yellow", { drawSVG: "0% 100%", duration: 0.5 }, 6.0)
          .to(".js-stamp-email", { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 6.5)
          .to(".js-faq-card", { autoAlpha: 1, duration: 0.3 }, 6.5)
          .to(".js-progress", { scaleX: 1, duration: 6.9 }, 0);
      });
    },
    { scope: root },
  );

  return (
    <section id="route" aria-labelledby="route-title" className="border-b border-rule bg-paper">
      {/* Desktop with motion: the pinned journey. */}
      <div ref={root} className="hidden lg:block lg:motion-reduce:hidden">
        <div className="js-journey-pin flex h-screen flex-col justify-center">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,4fr)_minmax(0,8fr)] items-center gap-12 px-10">
            <div>
              <h2 id="route-title" className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] xl:text-6xl">The route a question takes</h2>
              <div className="relative mt-10 grid">
                {captions.map((caption, index) => (
                  <div key={caption.title} className={`js-caption col-start-1 row-start-1 ${index > 0 ? "invisible" : ""}`}>
                    <p className="font-mono text-sm font-bold text-signal-deep">Stop {index + 1} of {captions.length}</p>
                    <h3 className="mt-2 text-3xl/tight font-bold tracking-[-0.01em]">{caption.title}</h3>
                    <p className="mt-3 max-w-[38ch] text-lg/relaxed text-ink-2">{caption.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <svg viewBox="0 0 760 440" className="h-auto w-full overflow-visible" role="img" aria-label="Rail map: questions travel from the customer to a knowledge search, then split to an answer with its source or to staff and an email.">
              <path id="journey-green" d={`${TRUNK} ${GREEN.replace("M390 220", "")}`} fill="none" stroke="none" />
              <path id="journey-yellow" d={`${TRUNK} ${YELLOW.replace("M390 220", "")}`} fill="none" stroke="none" />

              {[TRUNK, GREEN, YELLOW].map((d) => (
                <path key={d} d={d} fill="none" className="stroke-rule" strokeWidth={10} strokeLinecap="round" />
              ))}
              <path className="js-fill-trunk stroke-ink" d={TRUNK} fill="none" strokeWidth={10} strokeLinecap="round" />
              <path className="js-fill-green stroke-go" d={GREEN} fill="none" strokeWidth={10} strokeLinecap="round" />
              <path className="js-fill-yellow stroke-notice" d={YELLOW} fill="none" strokeWidth={10} strokeLinecap="round" />

              <g>
                {[
                  { y: 34, label: "Refund FAQ", key: "refund" },
                  { y: 74, label: "Shipping policy", key: "shipping" },
                  { y: 114, label: "Returns FAQ", key: "returns" },
                ].map((card) => (
                  <g key={card.key} className="js-faq-card">
                    <rect x={160} y={card.y} width={140} height={32} rx={2} className={`${card.key === "refund" ? "js-faq-refund " : ""}fill-paper stroke-rule-strong`} strokeWidth={2} />
                    <text x={230} y={card.y + 21} textAnchor="middle" className="fill-ink text-[13px] font-bold">
                      {card.label}
                    </text>
                  </g>
                ))}
                <line x1={230} y1={150} x2={230} y2={200} className="stroke-rule-strong" strokeWidth={2} strokeDasharray="4 4" />
              </g>

              <Station x={60} y={220} label="Asked" />
              <Station x={230} y={220} label="Knowledge" />
              <Station x={390} y={220} label="Split" />
              <Station x={650} y={100} label="Answered" />
              <Station x={560} y={340} label="Ticket" />
              <Station x={690} y={340} label="Emailed" />

              <Stamp className="js-stamp-answer" x={650} y={40} text="Answered from Refund FAQ" tone="go" />
              <Stamp className="js-stamp-ticket" x={560} y={404} text="Ticket opened" tone="notice" />
              <Stamp className="js-stamp-email" x={700} y={404} text="Team emailed" tone="ink" />

              <Ticket className="js-token-a" text="Refund after 30 days?" tone="ink" />
              <Ticket className="js-token-b" text="Custom PO invoice?" tone="notice" />
            </svg>
          </div>
          <div className="mx-auto mt-12 w-full max-w-6xl px-10">
            <div className="h-1 bg-rule">
              <div className="js-progress h-full origin-left scale-x-0 bg-ink" />
            </div>
          </div>
        </div>
      </div>

      {/* Phones, tablets and reduced motion: the static route. */}
      <div className="lg:hidden lg:motion-reduce:block">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-10">
          <div>
            <h2 className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">The route a question takes</h2>
            <p className="mt-6 max-w-[40ch] text-lg/relaxed text-ink-2 sm:text-xl">
              One rule runs the whole line: answer from a source, or hand over to a person. Nothing in between.
            </p>
          </div>
          <RouteMap />
        </div>
      </div>
    </section>
  );
}
