import Link from "next/link";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import CreateOrganizationForm from "@/components/dashboard/CreateOrganizationForm";
import { PageTitle } from "@/components/dashboard/SectionHeader";
import Icon from "@/components/ui/Icon";
import { getDesk } from "@/lib/dashboard/getDesk";

export const instant = false;

export default async function OrganizationsPage() {
  const desk = await getDesk();
  const hasOrganization = desk.organizations.length > 0;

  return (
    <>
      <PageTitle
        title="Organizations"
        description="Each organization has its own knowledge, conversations, and public chat page. Data never crosses between them."
      />

      {hasOrganization && (
        <ul className="mb-10 border border-rule bg-paper">
          {desk.organizations.map((organization) => (
            <li key={organization.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-4 first:border-t-0">
              <div className="min-w-0">
                <p className="text-lg font-bold">{organization.name}</p>
                <p className="truncate font-mono text-xs text-ink-2">/chat/{organization.id}</p>
              </div>
              <div className="flex items-center gap-1">
                <CopyLinkButton path={`/chat/${organization.id}`} />
                <Link className="btn btn-secondary py-1.5 text-sm no-underline" href={`/chat/${organization.id}`} target="_blank">
                  Open chat page
                  <Icon name="external" className="size-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border border-rule bg-paper p-5">
        <CreateOrganizationForm isFirst={!hasOrganization} />
      </div>
    </>
  );
}
