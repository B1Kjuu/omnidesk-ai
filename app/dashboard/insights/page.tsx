import DailyChart, { type DailyPoint } from "@/components/dashboard/insights/DailyChart";
import GapList from "@/components/dashboard/insights/GapList";
import { PageTitle, Panel } from "@/components/dashboard/SectionHeader";
import LocalTime from "@/components/ui/LocalTime";
import { getDesk } from "@/lib/dashboard/getDesk";
import { groupKnowledgeGaps } from "@/lib/server/insights/gaps";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Insights" };

const DAYS = 30;

type Insights = {
  questions: number;
  answered: number;
  escalated: number;
  medianFirstReplySeconds: number | null;
  awaitingFirstReply: number;
  helpful: number;
  notHelpful: number;
  daily: DailyPoint[];
  sources: Array<{ id: string; name: string; uses: number }>;
};

function formatDuration(seconds: number | null) {
  if (seconds === null) return "No replies yet";
  if (seconds < 60) return "Under a minute";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86_400) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86_400).toFixed(1)} days`;
}

/** One headline number. Text stays in ink; the number is the hero, the caption explains it. */
function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-rule bg-paper p-4">
      <p className="text-sm font-bold text-ink-2">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-ink-2">{detail}</p>
    </div>
  );
}

export default async function InsightsPage() {
  const desk = await getDesk();
  const supabase = await createClient();

  const reports = await Promise.all(
    desk.organizations.map(async (organization) => {
      const [{ data: insights, error }, { data: unanswered }, { data: unhelpful }] = await Promise.all([
        supabase.rpc("get_desk_insights", { target_organization_id: organization.id, days: DAYS }),
        supabase.rpc("list_unanswered_questions", { target_organization_id: organization.id, days: DAYS, max_rows: 300 }),
        supabase.rpc("list_unhelpful_answers", { target_organization_id: organization.id, max_rows: 10 }),
      ]);
      return {
        organization,
        insights: error || !insights ? null : (insights as unknown as Insights),
        gaps: groupKnowledgeGaps(unanswered ?? []).slice(0, 12),
        unhelpful: unhelpful ?? [],
      };
    }),
  );

  return (
    <>
      <PageTitle
        title="Insights"
        description={`The last ${DAYS} days: how much OmniDesk answered on its own, how fast your team replied, and which questions your knowledge does not cover yet.`}
      />
      {reports.length === 0 && <p className="border border-dashed border-rule-strong bg-paper p-5 text-ink-2">Create an organization first; its insights appear here.</p>}

      <div className="space-y-12">
        {reports.map(({ organization, insights, gaps, unhelpful }) => {
          if (!insights) {
            return (
              <section key={organization.id} className="border border-rule bg-paper p-5">
                <h2 className="text-lg font-bold">{organization.name}</h2>
                <p className="mt-2 text-sm text-ink-2">Apply the latest database migration to see insights.</p>
              </section>
            );
          }
          const handled = insights.answered + insights.escalated;
          const answeredShare = handled ? Math.round((insights.answered / handled) * 100) : null;
          const rated = insights.helpful + insights.notHelpful;
          const used = insights.sources.filter((source) => source.uses > 0);
          const unused = insights.sources.filter((source) => source.uses === 0);

          return (
            <section key={organization.id} aria-labelledby={`insights-${organization.id}`} className="space-y-6">
              {desk.multipleOrganizations && <h2 id={`insights-${organization.id}`} className="text-2xl font-bold">{organization.name}</h2>}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Tile label="Questions" value={String(insights.questions)} detail={`from customers in the last ${DAYS} days`} />
                <Tile
                  label="Answered by OmniDesk"
                  value={answeredShare === null ? "—" : `${answeredShare}%`}
                  detail={`${insights.answered} answered from knowledge, ${insights.escalated} handed to staff`}
                />
                <Tile
                  label="First staff reply"
                  value={formatDuration(insights.medianFirstReplySeconds)}
                  detail={insights.awaitingFirstReply ? `median · ${insights.awaitingFirstReply} still waiting` : "median time after a handoff"}
                />
                <Tile
                  label="Rated helpful"
                  value={rated ? `${Math.round((insights.helpful / rated) * 100)}%` : "—"}
                  detail={rated ? `${insights.helpful} yes, ${insights.notHelpful} no` : "no ratings yet"}
                />
              </div>

              <div className="border border-rule bg-paper p-5">
                {handled === 0 ? <p className="text-ink-2">No questions in this period yet.</p> : <DailyChart data={insights.daily} />}
              </div>

              <Panel title="Knowledge gaps">
                <p className="pt-2 text-sm text-ink-2">Questions OmniDesk could not answer, grouped by meaning. The biggest groups are the FAQs worth writing next.</p>
                <GapList organizationId={organization.id} gaps={gaps} canManage={organization.canManage} />
              </Panel>

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="Sources customers were answered from">
                  {used.length === 0 ? (
                    <p className="py-4 text-[0.9375rem] text-ink-2">No answers from knowledge in this period.</p>
                  ) : (
                    <ol className="py-2">
                      {used.map((source) => (
                        <li key={source.id} className="flex items-center gap-3 py-1.5">
                          <span className="min-w-0 flex-1 truncate">{source.name}</span>
                          <span className="font-mono text-sm font-bold">{source.uses}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {unused.length > 0 && (
                    <p className="border-t border-rule py-3 text-sm text-ink-2">
                      Never used in this period: {unused.map((source) => source.name).join(", ")}. Check they answer what customers actually ask.
                    </p>
                  )}
                </Panel>

                <Panel title="Answers rated not helpful">
                  {unhelpful.length === 0 ? (
                    <p className="py-4 text-[0.9375rem] text-ink-2">No answers rated unhelpful.</p>
                  ) : (
                    <ol>
                      {unhelpful.map((item) => (
                        <li key={item.message_id} className="border-b border-rule py-3 text-sm last:border-b-0">
                          {item.question && <p className="font-bold">&ldquo;{item.question}&rdquo;</p>}
                          <p className="mt-1 text-ink-2">{item.answer}</p>
                          <p className="mt-1 text-xs text-ink-2">
                            {item.source_name ? `From ${item.source_name} · ` : ""}<LocalTime iso={item.created_at} />
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </Panel>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
