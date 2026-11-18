import { beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, ids } from "./harness";

/**
 * The core promise of a multi-tenant support desk: one organization can never see or change another's data.
 * Every check runs as the `authenticated` or `anon` role, so row-level security is what is being tested.
 */
describe("tenant isolation (row-level security)", () => {
  let t: Awaited<ReturnType<typeof createTestDatabase>>;
  let orgA: string;
  let orgB: string;
  let conversationA: string;

  beforeAll(async () => {
    t = await createTestDatabase();
    await t.createUser(ids.ownerA, "owner-a@example.com");
    await t.createUser(ids.ownerB, "owner-b@example.com");
    orgA = await t.createOrganization(ids.ownerA, "Alpha Store");
    orgB = await t.createOrganization(ids.ownerB, "Beta Store");

    // Organization A's data, created the way the server does it (service role / superuser).
    const source = (await t.db.query<{ id: string }>(
      `insert into knowledge_sources (organization_id, name, source_type, status, created_by, content) values ($1, 'Secret pricing', 'text', 'ready', $2, 'Wholesale is 40% off') returning id`,
      [orgA, ids.ownerA],
    )).rows[0].id;
    await t.db.query(`insert into knowledge_chunks (organization_id, source_id, content) values ($1, $2, 'Wholesale is 40% off')`, [orgA, source]);
    conversationA = (await t.db.query<{ conversation_id: string }>(`select conversation_id from create_public_conversation($1, 'Ana', 'ana@example.com', 'Private question')`, [orgA])).rows[0].conversation_id;
    await t.db.query(`insert into tickets (organization_id, conversation_id, category) values ($1, $2, 'knowledge_gap')`, [orgA, conversationA]);
    await t.db.query(`insert into workflow_events (organization_id, event_type, idempotency_key) values ($1, 'conversation.escalated', 'k1')`, [orgA]);
  });

  const tables = ["knowledge_sources", "knowledge_chunks", "conversations", "messages", "customers", "tickets", "workflow_events", "organization_members", "audit_events"];

  it.each(tables)("a member of another organization reads none of %s", async (table) => {
    const rows = await t.as(ids.ownerB, () => t.db.query(`select 1 from ${table} where organization_id = $1`, [orgA]));
    expect(rows.rows).toHaveLength(0);
  });

  it.each(tables)("an anonymous visitor reads nothing from %s", async (table) => {
    const rows = await t.as(null, () => t.db.query(`select 1 from ${table}`));
    expect(rows.rows).toHaveLength(0);
  });

  it("the owner does see their own data (the policies are not simply blocking everything)", async () => {
    const rows = await t.as(ids.ownerA, () => t.db.query(`select 1 from knowledge_sources where organization_id = $1`, [orgA]));
    expect(rows.rows).toHaveLength(1);
  });

  it("another organization cannot add knowledge to it", async () => {
    await expect(
      t.as(ids.ownerB, () => t.db.query(`insert into knowledge_sources (organization_id, name, source_type, created_by) values ($1, 'Injected', 'faq', $2)`, [orgA, ids.ownerB])),
    ).rejects.toThrow(/row-level security/);
  });

  it("another organization cannot change its tickets, settings, or knowledge", async () => {
    const results = await t.as(ids.ownerB, async () => [
      await t.db.query(`update tickets set status = 'resolved' where organization_id = $1`, [orgA]),
      await t.db.query(`update organizations set notification_email = 'attacker@example.com' where id = $1`, [orgA]),
      await t.db.query(`delete from knowledge_sources where organization_id = $1`, [orgA]),
    ]);
    expect(results.map((result) => result.affectedRows)).toEqual([0, 0, 0]);
  });

  it("another organization cannot post a staff reply into its conversations", async () => {
    await expect(
      t.as(ids.ownerB, () =>
        t.db.query(`insert into messages (organization_id, conversation_id, sender_type, content, author_id) values ($1, $2, 'agent', 'Hi from B', $3)`, [orgA, conversationA, ids.ownerB]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("reporting and team functions return nothing for an organization you are not in", async () => {
    const [insights, members, audit, unanswered] = await t.as(ids.ownerB, async () => [
      (await t.db.query<{ data: unknown }>(`select get_desk_insights($1) as data`, [orgA])).rows[0].data,
      (await t.db.query(`select * from list_organization_members($1)`, [orgA])).rows,
      (await t.db.query(`select * from list_audit_events($1)`, [orgA])).rows,
      (await t.db.query(`select * from list_unanswered_questions($1)`, [orgA])).rows,
    ]);
    expect(insights).toBeNull();
    expect(members).toHaveLength(0);
    expect(audit).toHaveLength(0);
    expect(unanswered).toHaveLength(0);
  });

  it.each([
    ["match_knowledge_chunks", `select * from match_knowledge_chunks('${"00000000-0000-4000-8000-000000000000"}', '[${new Array(768).fill(0.1).join(",")}]', 5)`],
    ["hit_rate_limit", `select hit_rate_limit('test', 5, 60)`],
    ["create_public_conversation", `select * from create_public_conversation('00000000-0000-4000-8000-000000000000', 'x', '', 'y')`],
  ])("server-only function %s cannot be called by signed-in users", async (_name, sql) => {
    await expect(t.as(ids.ownerB, () => t.db.query(sql))).rejects.toThrow(/permission denied/);
  });

  it("organization B's own data is unaffected and visible to B", async () => {
    const rows = await t.as(ids.ownerB, () => t.db.query(`select name from organizations`));
    expect(rows.rows).toEqual([{ name: "Beta Store" }]);
    expect(orgB).toBeTruthy();
  });
});
