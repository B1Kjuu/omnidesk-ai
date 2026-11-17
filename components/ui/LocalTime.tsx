"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Server output is UTC; the browser re-renders in the viewer's own time zone.
export default function LocalTime({ iso, className = "" }: { iso: string; className?: string }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const date = new Date(iso);
  const label = date.toLocaleString(isClient ? undefined : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: isClient ? undefined : "UTC",
  });

  return (
    <time dateTime={iso} className={`font-mono ${className}`}>
      {label}
    </time>
  );
}
