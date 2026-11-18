import { beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, ids } from "./harness";

describe("teams: invitations, roles, and the audit log", () => {
  let t: Awaited<ReturnType<typeof createTestDatabase>>;
  let org: string;
  const outsider = "c0000000-0000-4000-8000-000000000001";
  const tokenHash = "a".repeat(64);

  beforeAll(async () => {
    t = await createTestDatabase();
    await t.createUser(ids.ownerA, "owner@example.com");
    await t.createUser(ids.agentA, "Agent@Example.com");
    await t.createUser(outsider, "outsider@example.com");
    org = await t.createOrganization(ids.ownerA, "Desk");
    await t.as(ids.ownerA, () =>
      t.db.query(`insert into organization_invitations (organization_id, email, role, token_hash, invited_by) values ($1, 'agent@example.com', 'agent', $2, $3)`, [org, tokenHash, ids.ownerA]),
    );
  });

  it("only owners and admins can invite", async () => {
    await expect(
      t.as(outsider, () => t.db.query(`insert into organization_invitations (organization_id, email, role, token_hash, invited_by) values ($1, 'x@example.com', 'admin', $2, $3)`, [org, "b".repeat(64), outsider])),
    ).rejects.toThrow(/row-level security/);
  });

  it("an invitation only works for its email address", async () => {
    await expect(t.as(outsider, () => t.db.query(`select accept_invitation($1)`, [tokenHash]))).rejects.toThrow(/Sign in with that email/);
  });

  it("the invited person joins with the invited role (email match ignores case), once", async () => {
    await t.as(ids.agentA, () => t.db.query(`select accept_invitation($1)`, [tokenHash]));
    const role = await t.as(ids.agentA, () => t.db.query<{ role: string }>(`select role from organization_members where organization_id = $1 and user_id = $2`, [org, ids.agentA]));
    expect(role.rows[0].role).toBe("agent");
    await expect(t.as(ids.agentA, () => t.db.query(`select accept_invitation($1)`, [tokenHash]))).rejects.toThrow(/already used/);
  });

  it("agents can answer customers but cannot manage knowledge or the team", async () => {
    await expect(
      t.as(ids.agentA, () => t.db.query(`insert into knowledge_sources (organization_id, name, source_type, created_by) values ($1, 'x', 'faq', $2)`, [org, ids.agentA])),
    ).rejects.toThrow(/row-level security/);
    await expect(t.as(ids.agentA, () => t.db.query(`select set_member_role($1, $2, 'admin')`, [org, ids.agentA]))).rejects.toThrow(/Only owners and admins/);
  });

  it("staff replies must be written as yourself, and only as staff", async () => {
    const conversation = (await t.db.query<{ conversation_id: string }>(`select conversation_id from create_public_conversation($1, 'Ana', '', 'Hi')`, [org])).rows[0].conversation_id;
    await t.as(ids.agentA, () => t.db.query(`insert into messages (organization_id, conversation_id, sender_type, content, author_id) values ($1, $2, 'agent', 'On it', $3)`, [org, conversation, ids.agentA]));
    await expect(
      t.as(ids.agentA, () => t.db.query(`insert into messages (organization_id, conversation_id, sender_type, content, author_id) values ($1, $2, 'agent', 'Spoofed', $3)`, [org, conversation, ids.ownerA])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      t.as(ids.agentA, () => t.db.query(`insert into messages (organization_id, conversation_id, sender_type, content, author_id) values ($1, $2, 'assistant', 'Fake AI answer', $3)`, [org, conversation, ids.agentA])),
    ).rejects.toThrow(/row-level security/);
  });

  it("an organization always keeps at least one owner", async () => {
    await expect(t.as(ids.ownerA, () => t.db.query(`select set_member_role($1, $2, 'admin')`, [org, ids.ownerA]))).rejects.toThrow(/at least one owner/);
    await expect(t.as(ids.ownerA, () => t.db.query(`select remove_member($1, $2)`, [org, ids.ownerA]))).rejects.toThrow(/at least one owner/);
  });

  it("the audit log records human actions with the acting user, and is visible to admins only", async () => {
    await t.as(ids.ownerA, () => t.db.query(`select set_member_role($1, $2, 'admin')`, [org, ids.agentA]));
    await t.as(ids.ownerA, () => t.db.query(`update organizations set notification_email = 'team@example.com' where id = $1`, [org]));
    const events = await t.as(ids.ownerA, () => t.db.query<{ action: string; actor_email: string | null }>(`select action, actor_email from list_audit_events($1)`, [org]));
    const actions = events.rows.map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(["member.joined", "invitation.sent", "member.role_changed", "settings.updated", "reply.sent"]));
    expect(events.rows.find((row) => row.action === "member.role_changed")?.actor_email).toBe("owner@example.com");
    expect((await t.as(outsider, () => t.db.query(`select * from list_audit_events($1)`, [org]))).rows).toHaveLength(0);
  });

  it("deleting an organization removes everything cleanly despite the audit triggers", async () => {
    await t.as(ids.ownerA, () => t.db.query(`delete from organizations where id = $1`, [org]));
    expect((await t.db.query(`select 1 from organization_members where organization_id = $1`, [org])).rows).toHaveLength(0);
  });
});
