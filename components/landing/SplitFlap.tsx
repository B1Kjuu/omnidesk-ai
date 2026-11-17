"use client";

import { useEffect, useState } from "react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

function scrambleChar(target: string) {
  if (/[0-9]/.test(target)) return DIGITS[Math.floor(Math.random() * DIGITS.length)];
  if (/[a-z]/i.test(target)) {
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    return target === target.toLowerCase() ? letter.toLowerCase() : letter;
  }
  return target;
}

/**
 * Text that settles like a split-flap board: characters flip through random
 * glyphs and land left to right. The real text is always what renders unless a
 * flip is in progress, so nothing hides if scripts stall or motion is reduced.
 */
export default function SplitFlap({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const [flipping, setFlipping] = useState<{ source: string; shown: string } | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !/[A-Za-z0-9]/.test(text)) return;

    const perChar = 28;
    const settleBase = 180;
    const duration = settleBase + text.length * perChar;
    let start: number | null = null;
    let frame = 0;

    const step = (time: number) => {
      if (start === null) start = time;
      const elapsed = time - start - delay;
      const settled = elapsed < 0 ? -1 : Math.floor((elapsed - settleBase) / perChar);

      if (elapsed >= duration) {
        setFlipping(null);
        return;
      }
      setFlipping({
        source: text,
        shown: text
          .split("")
          .map((char, index) => (index <= settled ? char : scrambleChar(char)))
          .join(""),
      });
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      setFlipping(null);
    };
  }, [text, delay]);

  const shown = flipping && flipping.source === text ? flipping.shown : text;

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
