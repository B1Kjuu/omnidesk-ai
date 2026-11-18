import { PageTitle } from "@/components/dashboard/SectionHeader";
import TeamPanel from "@/components/dashboard/TeamPanel";
import { getDesk } from "@/lib/dashboard/getDesk";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Team" };

export default async function TeamPage() {
  const desk = await getDesk();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const currentUserId = claims?.claims.sub ?? "";

  const teams = await Promise.all(
    desk.organizations.map(async (organization) => {
      const [{ data: members, error }, { data: invitations }] = await Promise.all([
        supabase.rpc("list_organization_members", { target_organization_id: organization.id }),
        organization.canManage
          ? supabase
              .from("organization_invitations")
              .select("id, email, role, created_at, expires_at")
              .eq("organization_id", organization.id)
              .is("accepted_at", null)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      return { organization, members: error ? null : members ?? [], invitations: invitations ?? [] };
    }),
  );

  return (
    <>
      <PageTitle
        title="Team"
        description="Owners and admins manage knowledge, settings, and the team. Agents answer customers and handle escalations. Every organization keeps at least one owner."
      />
      {teams.length === 0 ? (
        <p className="border border-dashed border-rule-strong bg-paper p-5 text-ink-2">Create an organization first; its team appears here.</p>
      ) : (
        <div className="space-y-8">
          {teams.map(({ organization, members, invitations }) => (
            <TeamPanel
              key={organization.id}
              organization={{ id: organization.id, name: organization.name, role: organization.role, canManage: organization.canManage }}
              members={members}
              invitations={invitations}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </>
  );
}
