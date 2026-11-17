import type { ReactNode } from "react";

export default function SectionHeader({ id, title, description, children }: { id: string; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
      <div>
        <h2 id={id} className="text-2xl font-bold tracking-[-0.01em]">{title}</h2>
        <p className="mt-1 max-w-[70ch] text-[0.9375rem]/relaxed text-ink-2">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function PageTitle({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-[70ch] text-base/relaxed text-ink-2">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border border-rule bg-paper">
      <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-2">{children}</div>
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-8">
      <p className="font-bold">{title}</p>
      <div className="mt-1 max-w-[65ch] text-[0.9375rem]/relaxed text-ink-2">{children}</div>
    </div>
  );
}
