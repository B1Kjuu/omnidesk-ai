import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Icon from "@/components/ui/Icon";

// Each answer prints where it comes from, the same rule the product follows.
const questions = [
  {
    q: "Is the AI ever allowed to guess?",
    a: "No. The model only receives the approved source that matched the question. If nothing matches, or the model says the team should follow up, OmniDesk opens a ticket instead of replying with an invented answer.",
    source: "app/api/chat/route.ts",
  },
  {
    q: "How is one business's data kept away from another's?",
    a: "Every table carries an organization id, and Postgres row-level security policies only return rows for organizations the signed-in member belongs to. The public chat page writes through a server-only function, so customers never query the database directly.",
    source: "supabase/migrations/…initial_schema.sql",
  },
  {
    q: "How does retrieval work today?",
    a: "Approved FAQ chunks are scored by keyword overlap with the question and the best match is handed to the model. It is deliberately simple for the MVP; vector search with pgvector is the next milestone.",
    source: "app/api/chat/route.ts",
  },
  {
    q: "What happens if the n8n webhook is down?",
    a: "The ticket and the workflow event are still saved. The event is marked failed with the error message, and the dashboard flags it so the team can fix the workflow and nothing is silently lost.",
    source: "app/api/chat/route.ts",
  },
  {
    q: "Which model answers, and where do the keys live?",
    a: "Gemini 2.5 Flash, called from the server at a low temperature. The API key, the Supabase service key and the webhook URL are server-only environment variables and never reach the browser.",
    source: ".env.example",
  },
];

export default function ReviewerFaq() {
  return (
    <section aria-labelledby="faq-title" className="border-b border-rule bg-paper">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-32">
        <div>
          <h2 id="faq-title" className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">Questions reviewers ask</h2>
          <p className="mt-6 max-w-[40ch] text-lg/relaxed text-ink-2">
            Answered the way OmniDesk answers customers: with the source printed underneath.
          </p>
        </div>

        <Accordion type="single" collapsible defaultValue="item-0" className="border-t-4 border-ink">
          {questions.map((item, index) => (
            <AccordionItem key={item.q} value={`item-${index}`} className="border-rule-strong">
              <AccordionTrigger className="rounded-none py-5 text-lg font-bold hover:no-underline focus-visible:ring-0 **:data-[slot=accordion-trigger-icon]:size-5 **:data-[slot=accordion-trigger-icon]:text-ink">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <p className="max-w-[62ch] text-base/relaxed text-ink-2">{item.a}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-go">
                  <Icon name="check" className="size-4" />
                  <span>
                    <span className="font-bold">Answered from</span> <span className="font-mono">{item.source}</span>
                  </span>
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
