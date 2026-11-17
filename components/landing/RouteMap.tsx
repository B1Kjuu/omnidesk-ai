import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";

type Line = "ink" | "go" | "notice";

const lineColor: Record<Line, string> = { ink: "bg-ink", go: "bg-go", notice: "bg-notice" };
const markerColor: Record<Line, string> = {
  ink: "border-ink bg-paper text-ink",
  go: "border-go bg-paper text-go",
  notice: "border-ink bg-notice text-ink",
};

/** A length of track: a pale bed with a coloured fill that draws as the section scrolls past. */
function Track({ line, children, className = "" }: { line: Line; children: ReactNode; className?: string }) {
  return (
    <div className={`relative pl-16 ${className}`}>
      <span className="absolute inset-y-0 left-4.5 w-1 bg-rule" aria-hidden="true" />
      <span className={`route-fill absolute inset-y-0 left-4.5 w-1 ${lineColor[line]}`} aria-hidden="true" />
      {children}
    </div>
  );
}

function Station({ line, icon, title, children, last = false }: { line: Line; icon: IconName; title: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`relative ${last ? "" : "pb-14"}`}>
      <span className={`absolute top-0 -left-16 grid size-10 place-items-center rounded-full border-4 ${markerColor[line]}`}>
        <Icon name={icon} className="size-4" />
      </span>
      <h3 className="pt-1 text-2xl/tight font-bold tracking-[-0.01em] sm:text-3xl">{title}</h3>
      <div className="mt-2 max-w-[46ch] text-base/relaxed text-ink-2 sm:text-lg">{children}</div>
    </div>
  );
}

export default function RouteMap() {
  return (
    <div>
      <Track line="ink" className="pb-10">
        <Station line="ink" icon="inbox" title="A customer asks">
          Each organization has its own public chat page. The question is saved as a conversation before anything else happens.
        </Station>
        <Station line="ink" icon="book" title="Only approved knowledge is searched">
          That organization&apos;s FAQs are the only eligible sources. Another tenant&apos;s knowledge is unreachable at the database level.
        </Station>
        <Station line="ink" icon="flag" title="The line splits" last>
          A matching source sends the question one way. No match sends it the other. There is no third track.
        </Station>
      </Track>

      <div className="relative grid gap-y-10 sm:grid-cols-2 sm:gap-x-8">
        <span className="route-fill-x absolute top-0 left-4.5 hidden h-1 w-[calc(50%+1rem)] bg-notice sm:block" aria-hidden="true" />
        <Track line="go" className="pt-10">
          <Station line="go" icon="check" title="Answered, with its source" last>
            The reply is written only from the matched source, and the source is stored with it so anyone can check.
          </Station>
        </Track>
        <Track line="notice" className="pt-10">
          <Station line="notice" icon="person" title="Handed to staff">
            A ticket opens and the conversation is flagged for the team. Nothing is guessed.
          </Station>
          <Station line="notice" icon="bell" title="The team is emailed" last>
            The handoff becomes a workflow event, delivered to n8n and on to Gmail. A failed delivery keeps its error.
          </Station>
        </Track>
      </div>
    </div>
  );
}
