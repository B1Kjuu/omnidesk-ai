"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

const platforms = [
  { number: 1, name: "Sunrise Outfitters", knowledge: ["Refund FAQ", "Sizing guide", "Shipping policy"] },
  { number: 2, name: "Bayside Dental", knowledge: ["Opening hours", "Insurance FAQ", "Aftercare notes"] },
  { number: 3, name: "Northwind Books", knowledge: ["Pre-orders", "Gift cards", "Returns FAQ"] },
];

function Fence() {
  return (
    <div className="js-fence hidden w-3 shrink-0 self-stretch bg-[repeating-linear-gradient(180deg,var(--color-notice)_0_14px,var(--color-board)_14px_28px)] md:block" aria-hidden="true" />
  );
}

/** Tenant isolation drawn as station platforms: each organization's knowledge sits behind its own fence. */
export default function Platforms() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: ".js-platforms", start: "top 70%", once: true } });
        tl.from(".js-sign", { rotationX: -90, transformOrigin: "50% 0%", autoAlpha: 0, duration: 0.6, stagger: 0.12, ease: "power3.out" })
          .from(".js-fence", { scaleY: 0, transformOrigin: "50% 0%", duration: 0.5, stagger: 0.1, ease: "power2.out" }, "-=0.3")
          .from(".js-chip", { y: 10, autoAlpha: 0, duration: 0.3, stagger: 0.04 }, "-=0.2")
          .from(".js-asker", { scale: 0.6, autoAlpha: 0, duration: 0.35, ease: "back.out(2)" })
          .to(".js-asker", { x: 28, duration: 0.18, ease: "power2.in" })
          .to(".js-asker", { x: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" })
          .from(".js-blocked", { scale: 0.5, autoAlpha: 0, duration: 0.3, ease: "back.out(2.5)" }, "<");
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="platforms-title" className="led-field bg-board text-board-ink">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-10 lg:py-32">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 id="platforms-title" className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">
            One station. Separate platforms.
          </h2>
          <p className="max-w-[48ch] text-lg/relaxed text-board-ink-2">
            Every organization runs on its own platform. Row-level security in Postgres fences its knowledge, conversations and tickets, so a question
            asked on one platform can never be answered from another&apos;s FAQs.
          </p>
        </div>

        <div className="js-platforms mt-16 flex flex-col gap-6 perspective-distant md:flex-row md:gap-0">
          {platforms.map((platform, index) => (
            <div key={platform.number} className="contents">
              {index > 0 && <Fence />}
              <div className="flex-1 md:px-6 md:first:pl-0 md:last:pr-0">
                <div className="js-sign flex items-center gap-4">
                  <span className="grid size-16 shrink-0 place-items-center rounded-xs bg-paper font-mono text-4xl font-bold text-ink">{platform.number}</span>
                  <div>
                    <p className="text-xs font-bold tracking-wide text-board-ink-2 uppercase">Platform</p>
                    <p className="text-xl/tight font-bold">{platform.name}</p>
                  </div>
                </div>
                <ul className="mt-6 space-y-2">
                  {platform.knowledge.map((item) => (
                    <li key={item} className="js-chip flex items-center justify-between border border-board-rule bg-board-2 px-3 py-2 text-[0.9375rem]">
                      {item}
                      <span className="text-xs text-go-bright">Approved</span>
                    </li>
                  ))}
                </ul>
                {platform.number === 2 && (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <span className="js-asker rounded-xs bg-paper px-3 py-1.5 text-sm font-bold text-ink">&ldquo;Do you sell gift cards?&rdquo;</span>
                    <span className="js-blocked rounded-xs bg-signal px-2.5 py-1 text-xs font-bold text-white">Platform 3 is out of reach</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm text-board-ink-2">Example organizations. The fence is a database policy, not a filter in application code.</p>
      </div>
    </section>
  );
}
