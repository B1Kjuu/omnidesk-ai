import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Link className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300" href="/">
            OmniDesk AI
          </Link>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/50 hover:text-white" href="/auth">
            Sign in
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-amber-300">AI support operations</p>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
              Answers grounded in your business knowledge.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              OmniDesk helps teams answer customers with approved information, keep every conversation organized, and escalate unanswered questions to a human.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-lg bg-amber-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-200" href="/auth">
                Open the workspace
              </Link>
              <Link className="rounded-lg border border-white/20 px-5 py-3 font-semibold text-slate-200 transition hover:border-white/50 hover:text-white" href="#features">
                Explore features
              </Link>
            </div>
          </div>

          <div id="features" className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <p className="text-sm font-medium text-slate-300">Built for support teams</p>
            <ul className="mt-6 space-y-5">
              {[
                ["Grounded answers", "Respond from approved FAQs and knowledge."],
                ["Human escalation", "Create tickets when the AI lacks evidence."],
                ["Workflow-ready", "Notify your team through n8n automation."],
              ].map(([title, description]) => (
                <li key={title} className="border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="border-t border-white/10 pt-5 text-sm text-slate-500">
          A standalone AI customer-support portfolio project.
        </footer>
      </div>
    </main>
  );
}
