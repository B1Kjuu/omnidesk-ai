import { headers } from "next/headers";
import Link from "next/link";
import CopyLinkButton from "@/components/dashboard/CopyLinkButton";
import CreateOrganizationForm from "@/components/dashboard/CreateOrganizationForm";
import NotificationEmailForm from "@/components/dashboard/NotificationEmailForm";
import WidgetSettings from "@/components/dashboard/WidgetSettings";
import { PageTitle } from "@/components/dashboard/SectionHeader";
import Icon from "@/components/ui/Icon";
import { publicOrigin } from "@/lib/publicOrigin";
import { getDesk } from "@/lib/dashboard/getDesk";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Organizations" };

/** Loaded separately from getDesk so the rest of the dashboard still works before the migration is applied. */
async function getRecipients(organizationIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").select("*").in("id", organizationIds);
  if (error) return null;
  const effective = await Promise.all(
    organizationIds.map(async (id) => {
      const { data: email } = await supabase.rpc("get_notification_recipient", { target_organization_id: id });
      return [id, email ?? null] as const;
    }),
  );
  const effectiveById = new Map(effective);
  return new Map(
    data.map((row) => [row.id, { configured: row.notification_email, effective: effectiveById.get(row.id) ?? null, widgetDomains: row.widget_domains ?? null }]),
  );
}

export default async function OrganizationsPage() {
  const desk = await getDesk();
  const hasOrganization = desk.organizations.length > 0;
  const recipients = hasOrganization ? await getRecipients(desk.organizations.map((organization) => organization.id)) : null;
  // The widget snippet must point at the public domain, not a preview or deployment URL.
  const requestHost = (await headers()).get("host");
  const origin = publicOrigin() ?? (requestHost ? `${requestHost.startsWith("localhost") ? "http" : "https"}://${requestHost}` : "");

  return (
    <>
      <PageTitle
        title="Organizations"
        description="Each organization has its own knowledge, conversations, and public chat page. Data never crosses between them."
      />

      {hasOrganization && (
        <ul className="mb-10 border border-rule bg-paper">
          {desk.organizations.map((organization) => (
            <li key={organization.id} className="border-t border-rule px-5 py-4 first:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold">{organization.name}</p>
                  <p className="truncate font-mono text-xs text-ink-2">{publicOrigin()?.replace(/^https?:\/\//, "") ?? ""}{organization.chatPath}</p>
                </div>
                <div className="flex items-center gap-1">
                  <CopyLinkButton path={organization.chatPath} origin={publicOrigin()} />
                  <Link className="btn btn-secondary py-1.5 text-sm no-underline" href={organization.chatPath} target="_blank">
                    Open chat page
                    <Icon name="external" className="size-3.5" />
                  </Link>
                </div>
              </div>
              {!organization.canManage ? (
                <p className="mt-4 border-t border-dashed border-rule-strong pt-4 text-sm text-ink-2">
                  You are an agent here. Owners and admins manage escalation emails and the website widget.
                </p>
              ) : recipients ? (
                <NotificationEmailForm
                  organizationId={organization.id}
                  configured={recipients.get(organization.id)?.configured ?? null}
                  effective={recipients.get(organization.id)?.effective ?? null}
                />
              ) : (
                <p className="mt-4 border-t border-dashed border-rule-strong pt-4 text-sm text-ink-2">
                  Escalation emails go to the organization creator. Apply the latest database migration to choose a different address.
                </p>
              )}
              {organization.canManage && <WidgetSettings
                organizationId={organization.id}
                handle={organization.chatPath.replace("/chat/", "")}
                origin={origin}
                domains={recipients?.get(organization.id)?.widgetDomains ?? null}
              />}
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
