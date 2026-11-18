"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import LocalTime from "@/components/ui/LocalTime";
import { createClient } from "@/lib/supabase/browser";

type Member = { user_id: string; email: string; role: string; joined_at: string };
type Invitation = { id: string; email: string; role: string; created_at: string; expires_at: string };
type Props = {
  organization: { id: string; name: string; role: string; canManage: boolean };
  /** null when the teams migration has not been applied yet. */
  members: Member[] | null;
  invitations: Invitation[];
  currentUserId: string;
};

const roleLabel: Record<string, string> = { owner: "Owner", admin: "Admin", agent: "Agent" };

function hasExpired(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

export default function TeamPanel({ organization, members, invitations, currentUserId }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"agent" | "admin">("agent");
  const [inviteLink, setInviteLink] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const isOwner = organization.role === "owner";

  async function run(key: string, action: () => PromiseLike<{ error: { message: string } | null }>, success: string) {
    setError("");
    setNotice("");
    setBusy(key);
    const { error: actionError } = await action();
    setBusy(null);
    if (actionError) {
      setError(actionError.message);
      return;
    }
    setNotice(success);
    router.refresh();
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setInviteLink("");
    setBusy("invite");
    try {
      const response = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: organization.id, email: email.trim(), role }),
      });
      const result = (await response.json().catch(() => ({}))) as { link?: string; emailed?: boolean; error?: string };
      if (!response.ok || !result.link) {
        setError(result.error ?? "The invitation could not be created.");
        return;
      }
      setInviteLink(result.link);
      setNotice(result.emailed ? `Invitation emailed to ${email.trim()}. You can also share the link below.` : `Invitation created. Email is not configured, so share this link with ${email.trim()}.`);
      setEmail("");
      router.refresh();
    } catch {
      setError("The server could not be reached. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  if (members === null) {
    return (
      <section className="border border-rule bg-paper p-5">
        <h2 className="text-lg font-bold">{organization.name}</h2>
        <p className="mt-2 text-sm text-ink-2">Apply the latest database migration to manage this team.</p>
      </section>
    );
  }

  return (
    <section className="border border-rule bg-paper" aria-labelledby={`team-${organization.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-5 py-3.5">
        <h2 id={`team-${organization.id}`} className="text-lg font-bold">{organization.name}</h2>
        <p className="text-sm text-ink-2">You are {roleLabel[organization.role]?.toLowerCase() ?? organization.role} here</p>
      </div>

      <ul className="px-5">
        {members.map((member) => {
          const isSelf = member.user_id === currentUserId;
          // Mirrors the database rules so people only see controls that can succeed.
          const canEditRole = organization.canManage && !isSelf && (member.role !== "owner" || isOwner);
          const canRemove = isSelf ? true : organization.canManage && (member.role !== "owner" || isOwner);
          return (
            <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule py-3 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate font-bold">
                  {member.email} {isSelf && <span className="font-normal text-ink-2">(you)</span>}
                </p>
                <p className="text-sm text-ink-2">
                  Joined <LocalTime iso={member.joined_at} />
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canEditRole ? (
                  <>
                    <label className="sr-only" htmlFor={`role-${organization.id}-${member.user_id}`}>Role for {member.email}</label>
                    <select
                      id={`role-${organization.id}-${member.user_id}`}
                      className="field w-auto py-1.5 text-sm"
                      value={member.role}
                      disabled={busy !== null}
                      onChange={(event) =>
                        run(
                          `role-${member.user_id}`,
                          () => createClient().rpc("set_member_role", { target_organization_id: organization.id, target_user_id: member.user_id, new_role: event.target.value }),
                          `${member.email} is now ${roleLabel[event.target.value]?.toLowerCase()}.`,
                        )
                      }
                    >
                      {isOwner && <option value="owner">Owner</option>}
                      <option value="admin">Admin</option>
                      <option value="agent">Agent</option>
                    </select>
                  </>
                ) : (
                  <span className="rounded-xs bg-platform px-2 py-1 text-sm font-bold">{roleLabel[member.role] ?? member.role}</span>
                )}
                {canRemove && (
                  <button
                    type="button"
                    className="btn btn-danger py-1.5 text-sm"
                    disabled={busy !== null}
                    onClick={() => {
                      const prompt = isSelf ? `Leave ${organization.name}? You will lose access to its desk.` : `Remove ${member.email} from ${organization.name}?`;
                      if (!window.confirm(prompt)) return;
                      void run(
                        `remove-${member.user_id}`,
                        () => createClient().rpc("remove_member", { target_organization_id: organization.id, target_user_id: member.user_id }),
                        isSelf ? `You left ${organization.name}.` : `${member.email} was removed.`,
                      );
                    }}
                  >
                    {isSelf ? "Leave" : "Remove"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {organization.canManage && (
        <div className="border-t border-rule px-5 py-4">
          {invitations.length > 0 && (
            <>
              <h3 className="text-sm font-bold tracking-wide text-ink-2 uppercase">Pending invitations</h3>
              <ul className="mt-2 mb-5">
                {invitations.map((invitation) => {
                  const expired = hasExpired(invitation.expires_at);
                  return (
                    <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                      <span>
                        <span className="font-bold">{invitation.email}</span> as {roleLabel[invitation.role]?.toLowerCase()}
                        <span className="text-ink-2"> · {expired ? "expired" : <>expires <LocalTime iso={invitation.expires_at} /></>}</span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-quiet py-1 text-sm"
                        disabled={busy !== null}
                        onClick={() =>
                          run(`revoke-${invitation.id}`, () => createClient().from("organization_invitations").delete().eq("id", invitation.id), `Invitation for ${invitation.email} revoked.`)
                        }
                      >
                        Revoke
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <form onSubmit={invite}>
            <p className="field-label">Invite someone</p>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor={`invite-email-${organization.id}`}>Email</label>
              <input
                id={`invite-email-${organization.id}`}
                className="field min-w-0 flex-1"
                type="email"
                required
                maxLength={320}
                placeholder="teammate@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label className="sr-only" htmlFor={`invite-role-${organization.id}`}>Role</label>
              <select id={`invite-role-${organization.id}`} className="field w-auto" value={role} onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "agent")}>
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary" type="submit" disabled={busy !== null}>
                {busy === "invite" ? "Inviting" : "Send invite"}
              </button>
            </div>
            <p className="field-hint">The link works once, for that email address only, and expires in 7 days.</p>
          </form>

          {inviteLink && (
            <div className="mt-3 flex items-center gap-2 border border-rule bg-platform p-2">
              <code className="min-w-0 flex-1 truncate font-mono text-xs">{inviteLink}</code>
              <button
                type="button"
                className="btn btn-quiet py-1 text-sm"
                onClick={() => navigator.clipboard.writeText(inviteLink).then(() => setNotice("Invitation link copied."), () => setError("Copy failed. Select the link and copy it manually."))}
              >
                <Icon name="copy" className="size-3.5" />
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      {(notice || error) && (
        <div className="px-5 pb-4">
          {notice && <p className="alert-info" role="status">{notice}</p>}
          {error && <p className="alert-error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
