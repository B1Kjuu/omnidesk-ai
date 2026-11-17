import Link from "next/link";
import Wordmark from "@/components/ui/Wordmark";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col bg-board text-board-ink">
      <header className="bg-signal">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-10">
          <Wordmark />
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-10">
        <p className="font-mono text-2xl font-bold text-notice">404</p>
        <h1 className="mt-3 max-w-[18ch] text-5xl/none font-bold tracking-[-0.03em] sm:text-6xl">No train runs to this platform.</h1>
        <p className="mt-5 max-w-[50ch] text-lg/relaxed text-board-ink-2">
          The page does not exist, or the chat link is for an organization that has been removed.
        </p>
        <Link href="/" className="btn btn-primary mt-8 px-6 py-3 no-underline">Back to OmniDesk</Link>
      </div>
    </main>
  );
}
