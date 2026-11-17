"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

export default function CopyLinkButton({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
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
