"use client";

/** Asks the host page's widget script (public/widget.js) to close the panel. */
export default function WidgetCloseButton() {
  return (
    <button
      type="button"
      onClick={() => window.parent.postMessage({ type: "omnidesk:close" }, "*")}
      className="grid size-9 shrink-0 place-items-center rounded-xs text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
      aria-label="Close chat"
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
