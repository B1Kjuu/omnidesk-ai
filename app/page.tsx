import Link from "next/link";
import Closing from "@/components/landing/Closing";
import DepartureBoard from "@/components/landing/DepartureBoard";
import Journey from "@/components/landing/Journey";
import Platforms from "@/components/landing/Platforms";
import ReviewerFaq from "@/components/landing/ReviewerFaq";
import Ticker from "@/components/landing/Ticker";
import Timetable from "@/components/landing/Timetable";
import Wordmark from "@/components/ui/Wordmark";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function Home() {
  const configuredDemo = process.env.DEMO_ORGANIZATION_ID ?? "";
  const demoOrganizationId = uuidPattern.test(configuredDemo) ? configuredDemo : null;

  return (
    <main className="flex-1">
      <header className="bg-signal">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-10" aria-label="Main">
          <Wordmark />
          <div className="flex items-center gap-1 sm:gap-2">
            <a className="hidden px-3 py-2 text-[0.9375rem] font-bold text-white no-underline hover:underline sm:inline" href="#route">How it works</a>
            <a className="hidden px-3 py-2 text-[0.9375rem] font-bold text-white no-underline hover:underline sm:inline" href="#engineering">Engineering</a>
            <Link className="btn border border-white px-4 py-2 text-white no-underline hover:bg-white hover:text-signal" href="/auth">
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <DepartureBoard demoOrganizationId={demoOrganizationId} />
      <Ticker />
      <Journey />
      <Platforms />
      <Timetable />
      <ReviewerFaq />
      <Closing />

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-ink-2 sm:px-10">
          <Wordmark tone="onPaper" />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <a href="https://github.com/B1Kjuu/omnidesk-ai" target="_blank" rel="noopener noreferrer" className="hover:text-ink">GitHub</a>
            <a href="https://github.com/B1Kjuu/omnidesk-ai/issues" target="_blank" rel="noopener noreferrer" className="hover:text-ink">Contact</a>
          </nav>
          <p className="w-full sm:w-auto">© 2026 B1Kjuu. A portfolio project; example board rows and organizations are illustrative.</p>
        </div>
      </footer>
    </main>
  );
}
