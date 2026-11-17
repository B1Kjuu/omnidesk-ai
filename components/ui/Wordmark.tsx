import Link from "next/link";

// The mark is a platform sign: a white square carrying the letter, set on the red field.
export default function Wordmark({ href = "/", tone = "onSignal" }: { href?: string; tone?: "onSignal" | "onPaper" }) {
  const square = tone === "onSignal" ? "bg-white text-signal" : "bg-signal text-white";
  const text = tone === "onSignal" ? "text-white" : "text-ink";

  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 no-underline ${text}`}>
      <span className={`grid size-7 place-items-center rounded-[2px] text-base leading-none font-extrabold ${square}`} aria-hidden="true">
        O
      </span>
      <span className="text-lg font-bold tracking-[-0.01em]">OmniDesk AI</span>
    </Link>
  );
}
