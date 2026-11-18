import { PageTitle } from "@/components/dashboard/SectionHeader";
import WorkflowEventList from "@/components/dashboard/WorkflowEventList";
import { getDesk } from "@/lib/dashboard/getDesk";

export const instant = false;
export const metadata = { title: "Automation" };

export default async function AutomationPage() {
  const desk = await getDesk();

  return (
    <>
      <PageTitle
        title="Automation"
        description="Every staff handoff is sent to n8n, which emails your team. Failed deliveries keep their error so you can fix the workflow."
      />
      <div className="border border-rule bg-paper px-4 sm:px-5">
        <WorkflowEventList events={desk.workflowEvents} />
      </div>
    </>
  );
}
