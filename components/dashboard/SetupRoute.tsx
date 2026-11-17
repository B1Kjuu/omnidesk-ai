import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

type Step = { title: string; done: boolean; action: ReactNode };

export default function SetupRoute({
  hasOrganization,
  hasKnowledge,
  hasConversation,
  hasEscalation,
  chatHref,
}: {
  hasOrganization: boolean;
  hasKnowledge: boolean;
  hasConversation: boolean;
  hasEscalation: boolean;
  chatHref: string | null;
}) {
  const steps: Step[] = [
    { title: "Create an organization", done: hasOrganization, action: <Link href="/dashboard/organizations">Name your organization.</Link> },
    { title: "Add approved knowledge", done: hasKnowledge, action: <Link href="/dashboard/knowledge">Add an FAQ, such as your refund policy.</Link> },
    {
      title: "Ask a question as a customer",
      done: hasConversation,
      action: chatHref ? (
        <Link href={chatHref} target="_blank">Open your customer chat page and ask something your FAQ answers.</Link>
      ) : (
        "Available once an organization exists."
      ),
    },
    {
      title: "See a staff handoff",
      done: hasEscalation,
      action: chatHref ? <Link href={chatHref} target="_blank">Ask something your FAQ does not cover. It will appear in Escalations.</Link> : "Available once an organization exists.",
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  if (completed === steps.length) return null;
  const nextIndex = steps.findIndex((step) => !step.done);

  return (
    <section aria-labelledby="setup-title" className="border border-rule bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="setup-title" className="text-xl font-bold">Get your desk running</h2>
        <p className="font-mono text-sm text-ink-2">{completed} of {steps.length} done</p>
      </div>
      <ol className="mt-5 grid gap-6 md:grid-cols-4 md:gap-4">
        {steps.map((step, index) => {
          const isNext = index === nextIndex;
          return (
            <li key={step.title} className="relative flex gap-3 md:block">
              {index < steps.length - 1 && (
                <span
                  className={`absolute top-9 -bottom-6 left-4 w-0.5 md:top-4 md:right-0 md:bottom-auto md:left-9 md:h-0.5 md:w-auto ${step.done ? "bg-ink" : "bg-rule-strong"}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`relative grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${
                  step.done ? "border-ink bg-ink text-white" : isNext ? "border-signal bg-paper text-signal" : "border-rule-strong bg-paper text-ink-3"
                }`}
              >
                {step.done ? <Icon name="check" className="size-4" /> : index + 1}
              </span>
              <div className="md:mt-3 md:pr-4">
                <p className={`font-bold ${step.done ? "text-ink-2 line-through decoration-1" : ""}`}>{step.title}</p>
                {isNext && <p className="mt-1 text-sm/relaxed text-ink-2 [&_a]:font-bold [&_a]:text-signal-deep [&_a]:underline">{step.action}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
