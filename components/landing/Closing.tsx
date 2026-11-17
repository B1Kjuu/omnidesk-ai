"use client";

import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/Icon";
import { gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";

export default function Closing() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const split = SplitText.create(".js-close-title", { type: "words", mask: "words" });
        const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 65%", once: true } });
        tl.from(split.words, { yPercent: 110, duration: 0.8, stagger: 0.08, ease: "power4.out" })
          .from(".js-close-copy", { y: 16, autoAlpha: 0, duration: 0.5 }, "-=0.4")
          .from(".js-close-cta", { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, "-=0.3");
        return () => split.revert();
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="close-title" className="bg-signal text-white">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-10 lg:py-36">
        <h2 id="close-title" className="js-close-title max-w-[12ch] text-6xl leading-[0.95] font-bold tracking-[-0.04em] text-wrap sm:text-8xl">
          Open your own desk.
        </h2>
        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <p className="js-close-copy max-w-[46ch] text-xl/relaxed text-white/90">
            Create an organization, add an FAQ, and send your first customer question in a few minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="js-close-cta h-12 rounded-xs bg-white px-6 text-base font-bold text-signal no-underline hover:bg-signal-wash">
              <Link href="/auth?mode=sign-up">
                Create an account
                <Icon name="arrow" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="js-close-cta h-12 rounded-xs border-white bg-transparent px-6 text-base font-bold text-white no-underline hover:bg-signal-deep hover:text-white">
              <Link href="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
