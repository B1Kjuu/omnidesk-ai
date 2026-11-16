export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        OmniDesk AI
      </p>
      <div className="space-y-4">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
          Grounded customer support for growing businesses.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-slate-600">
          The application shell is ready. Authentication, tenant-scoped
          knowledge, and the first end-to-end chat flow come next.
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="size-2 rounded-full bg-amber-500" aria-hidden />
        MVP foundation in progress
      </div>
    </main>
  );
}
