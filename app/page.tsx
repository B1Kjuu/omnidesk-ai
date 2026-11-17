import Link from "next/link";
import DepartureBoard from "@/components/landing/DepartureBoard";
import RouteMap from "@/components/landing/RouteMap";
import Icon from "@/components/ui/Icon";
import Wordmark from "@/components/ui/Wordmark";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const engineering = [
  { part: "Tenant isolation", guarantee: "Every read and write is scoped to one organization by row-level security policies, not by application code alone.", built: "Supabase Postgres RLS" },
  { part: "Grounded answers", guarantee: "The model only sees the approved source that matched the question, and the source is stored with the reply.", built: "Gemini, called server-side" },
  { part: "Escalation", guarantee: "A question without supporting knowledge opens a ticket and flags the conversation for staff in the same request.", built: "Postgres functions" },
  { part: "Automation", guarantee: "Each escalation becomes an idempotent workflow event, delivered to a webhook and tracked to completion or failure.", built: "n8n on Azure, Gmail" },
  { part: "Accounts", guarantee: "Team members sign in, create organizations, and hold owner, admin, or agent roles.", built: "Supabase Auth" },
];

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

      <section id="route" aria-labelledby="route-title" className="border-b border-rule">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-32">
          <div className="lg:sticky lg:top-12 lg:self-start">
            <h2 id="route-title" className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">The route a question takes</h2>
            <p className="mt-6 max-w-[40ch] text-lg leading-relaxed text-ink-2 sm:text-xl">
              One rule runs the whole line: answer from a source, or hand over to a person. Nothing in between.
            </p>
          </div>

          <RouteMap />
        </div>
      </section>

      <section id="engineering" aria-labelledby="engineering-title" className="bg-platform">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-10 lg:py-28">
          <h2 id="engineering-title" className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">Underneath the timetable</h2>
          <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-ink-2">
            What each part of the system guarantees, and what it is built on.
          </p>

          <div className="mt-12 border-t-2 border-ink">
            <table className="w-full border-collapse text-left">
              <thead className="hidden md:table-header-group">
                <tr className="text-xs tracking-wide text-ink-2 uppercase">
                  <th scope="col" className="w-[22%] py-3 pr-6 font-bold">Part</th>
                  <th scope="col" className="py-3 pr-6 font-bold">What it guarantees</th>
                  <th scope="col" className="w-[24%] py-3 font-bold">Built with</th>
                </tr>
              </thead>
              <tbody>
                {engineering.map((row) => (
                  <tr key={row.part} className="grid border-t border-rule-strong py-5 md:table-row md:py-0">
                    <th scope="row" className="text-xl font-bold tracking-[-0.01em] md:py-6 md:pr-6 md:align-top">{row.part}</th>
                    <td className="mt-1 text-base leading-relaxed text-ink-2 md:mt-0 md:py-5 md:pr-6 md:align-top">{row.guarantee}</td>
                    <td className="mt-2 text-[0.9375rem] font-bold text-ink md:mt-0 md:py-5 md:align-top">{row.built}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="close-title" className="bg-signal text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:py-24">
          <div>
            <h2 id="close-title" className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-7xl">Open your own desk.</h2>
            <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-white/90">
              Create an organization, add an FAQ, and send your first customer question in a few minutes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn bg-white px-6 py-3 text-base text-signal no-underline hover:bg-signal-wash" href="/auth?mode=sign-up">
              Create an account
              <Icon name="arrow" />
            </Link>
            <Link className="btn border border-white px-6 py-3 text-base text-white no-underline hover:bg-signal-deep" href="/auth">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-ink-2 sm:px-10">
          <Wordmark tone="onPaper" />
          <p>A standalone portfolio project. Example board rows are illustrative.</p>
        </div>
      </footer>
    </main>
  );
}
