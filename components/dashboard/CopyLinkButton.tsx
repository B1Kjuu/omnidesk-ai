"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

/** Copies the public link. `origin` is the production domain; without it, the current address is used. */
export default function CopyLinkButton({ path, origin }: { path: string; origin?: string | null }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, origin || window.location.origin).toString());
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button type="button" className="btn btn-quiet py-1.5 text-sm" onClick={copy} aria-live="polite">
      <Icon name={state === "copied" ? "check" : "copy"} className="size-3.5" />
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy link"}
    </button>
  );
}
