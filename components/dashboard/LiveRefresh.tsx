"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

// Tables whose changes should update counts and lists. RLS decides which rows this user hears about.
const WATCHED = ["conversations", "messages", "tickets", "workflow_events", "knowledge_sources"] as const;

/**
 * Keeps the dashboard current without a reload: Supabase Realtime pushes a change, and the
 * server components re-render with fresh data. Also refreshes when the tab regains focus,
 * which covers missed events (laptop asleep, socket dropped).
 */
export default function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timer: number | undefined;
    // A single escalation touches several tables at once; one refresh is enough.
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => router.refresh(), 400);
    };

    const supabase = createClient();
    let channel = supabase.channel("desk-live");
    for (const table of WATCHED) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
