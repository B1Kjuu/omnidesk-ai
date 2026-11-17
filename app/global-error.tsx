"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort boundary when the root layout itself fails, so it cannot rely on globals.css.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#ffffff", color: "#15171a" }}>
        <div style={{ background: "#d0261d", color: "#ffffff", padding: "14px 24px", fontWeight: 700 }}>OmniDesk</div>
        <main style={{ maxWidth: 560, padding: "64px 24px" }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.1, margin: 0 }}>The desk hit a problem.</h1>
          <p style={{ fontSize: 17, lineHeight: 1.5, color: "#4a515b" }}>
            The error has been reported. Try again, and if it keeps happening, come back in a few minutes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#d0261d", color: "#ffffff", border: 0, padding: "12px 20px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
