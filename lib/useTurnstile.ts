"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile() {
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not load")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile script failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile bot check for the public chat. Invisible unless Cloudflare wants an interaction.
 * Disabled (always ready, empty token) when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set.
 * Tokens are single use, so `consume()` hands one over and immediately asks for the next.
 */
export function useTurnstile(theme: "light" | "dark" = "light") {
  // Callback ref (state) rather than useRef, so render code never touches a ref object.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);
  const enabled = SITE_KEY !== "";

  useEffect(() => {
    if (!enabled || !container) return;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return;
        widgetId.current = turnstile.render(container, {
          sitekey: SITE_KEY,
          action: "chat", // must match TURNSTILE_ACTION in lib/server/turnstile.ts
          theme,
          appearance: "interaction-only",
          "refresh-expired": "auto",
          callback: (value: string) => {
            setFailed(false);
            setToken(value);
          },
          "expired-callback": () => setToken(""),
          "error-callback": () => {
            setToken("");
            setFailed(true);
          },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [enabled, container, theme]);

  const consume = useCallback(() => {
    const current = token;
    setToken("");
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    return current;
  }, [token]);

  return {
    mount: setContainer,
    ready: !enabled || token !== "",
    failed,
    consume,
  };
}
