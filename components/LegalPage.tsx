import type { ReactNode } from "react";
import Link from "next/link";
import Wordmark from "@/components/ui/Wordmark";

/** Shared layout for the privacy policy and terms: readable measure, clear headings, back link. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col bg-paper">
      <header className="bg-signal">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-10">
          <Wordmark />
        </div>
      </header>
      <article className="mx-auto w-full max-w-[72ch] px-4 py-12 sm:py-16 [&_a]:font-bold [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1.5 [&_p]:mt-4 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
        <h1 className="text-4xl/tight font-bold tracking-[-0.02em]">{title}</h1>
        <p className="text-sm text-ink-2">Last updated {updated}</p>
        <div className="text-base/relaxed text-ink">{children}</div>
        <p className="mt-12 border-t border-rule pt-6 text-sm">
          <Link href="/">Back to OmniDesk AI</Link>
        </p>
      </article>
    </main>
  );
}
