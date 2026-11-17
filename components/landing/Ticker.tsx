"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

const departures = [
  { question: "Refund after 30 days", outcome: "Refund FAQ" },
  { question: "Delivery to Cebu", outcome: "Shipping policy" },
  { question: "Custom PO invoice", outcome: "To staff" },
  { question: "Damaged order swap", outcome: "Returns FAQ" },
  { question: "Student discount", outcome: "Pricing FAQ" },
  { question: "Price match", outcome: "To staff" },
  { question: "Gift card expiry", outcome: "Gift card terms" },
];

function Run() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden="true">
      {departures.map((item) => (
        <span key={item.question} className="flex items-center gap-4 pr-12 text-lg font-bold whitespace-nowrap sm:text-2xl">
          <span>{item.question}</span>
          <span className="font-mono text-base text-white/70 sm:text-lg">→</span>
          <span className={item.outcome === "To staff" ? "rounded-xs bg-notice px-2 py-0.5 text-ink" : ""}>{item.outcome}</span>
          <span className="ml-8 size-2 rounded-full bg-white/60" />
        </span>
      ))}
    </div>
  );
}

/** A station ticker of example departures. It drifts on its own and leans into the visitor's scroll speed. */
export default function Ticker() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const loop = gsap.to(".js-ticker-track", { xPercent: -50, ease: "none", duration: 40, repeat: -1 });
        const lean = gsap.quickTo(".js-ticker-track", "skewX", { duration: 0.4, ease: "power3" });

        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
          onUpdate: (self) => {
            const velocity = self.getVelocity();
            loop.timeScale(gsap.utils.clamp(1, 6, 1 + Math.abs(velocity) / 300));
            lean(gsap.utils.clamp(-8, 8, velocity / -250));
            gsap.to(loop, { timeScale: 1, duration: 0.8, overwrite: true, delay: 0.1 });
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="overflow-hidden border-y-4 border-ink bg-signal py-4 text-white" role="marquee" aria-label="Example departures: questions and where their answers came from">
      <div className="js-ticker-track flex w-max will-change-transform">
        <Run />
        <Run />
      </div>
    </div>
  );
}
