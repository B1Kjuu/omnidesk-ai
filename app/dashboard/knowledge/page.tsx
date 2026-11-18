import CreateKnowledgeSourceForm from "@/components/dashboard/CreateKnowledgeSourceForm";
import KnowledgeSourceList from "@/components/dashboard/KnowledgeSourceList";
import { PageTitle } from "@/components/dashboard/SectionHeader";
import { getDesk } from "@/lib/dashboard/getDesk";

export const instant = false;
export const metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const desk = await getDesk();

  return (
    <>
      <PageTitle title="Knowledge" description="The only material OmniDesk may answer from. If it is not written here, the question goes to staff." />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="border border-rule bg-paper px-4 sm:px-5">
          <KnowledgeSourceList
            sources={desk.sources}
            showOrganization={desk.multipleOrganizations}
            manageableOrganizationIds={desk.managedOrganizations.map((organization) => organization.id)}
          />
        </div>
        <div className="lg:sticky lg:top-8 lg:self-start">
          {desk.organizations.length > 0 && desk.managedOrganizations.length === 0 ? (
            <p className="border border-dashed border-rule-strong bg-paper p-5 text-[0.9375rem] text-ink-2">
              You are an agent: you can see the knowledge customers are answered from. Owners and admins add and edit it.
            </p>
          ) : (
            <CreateKnowledgeSourceForm organizations={desk.managedOrganizations.length > 0 ? desk.managedOrganizations : desk.organizations} />
          )}
        </div>
      </div>
    </>
  );
}
