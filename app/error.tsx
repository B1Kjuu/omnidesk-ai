"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import Wordmark from "@/components/ui/Wordmark";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col bg-platform">
      <header className="bg-signal">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-10">
          <Wordmark />
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-10">
        <p className="inline-block border-l-4 border-notice-edge bg-notice-wash px-3 py-1 text-sm font-bold">Service interrupted</p>
        <h1 className="mt-4 max-w-[20ch] text-4xl/tight font-bold tracking-[-0.02em] sm:text-5xl">This page could not load.</h1>
        <p className="mt-4 max-w-[55ch] text-lg/relaxed text-ink-2">
          The error has been reported{error.digest ? <> (reference <span className="font-mono">{error.digest}</span>)</> : null}. Try again, or head back to the start.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary px-6 py-3" onClick={reset}>Try again</button>
          <Link href="/" className="btn btn-secondary px-6 py-3 no-underline">Back to OmniDesk</Link>
        </div>
      </div>
    </main>
  );
}
