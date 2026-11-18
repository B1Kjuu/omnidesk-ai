import { beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, ids } from "./harness";

describe("insights", () => {
  let t: Awaited<ReturnType<typeof createTestDatabase>>;
  let org: string;
  let report: Record<string, unknown>;

  beforeAll(async () => {
    t = await createTestDatabase();
    await t.createUser(ids.ownerA, "owner@example.com");
    org = await t.createOrganization(ids.ownerA, "Desk");
    const q = (sql: string, params: unknown[]) => t.db.query<Record<string, string>>(sql, params);

    const source = (await q(`insert into knowledge_sources (organization_id, name, source_type, status, created_by, content) values ($1, 'Refund FAQ', 'faq', 'ready', $2, 'x') returning id`, [org, ids.ownerA])).rows[0].id;
    await q(`insert into knowledge_sources (organization_id, name, source_type, status, created_by, content) values ($1, 'Unused FAQ', 'faq', 'ready', $2, 'y')`, [org, ids.ownerA]);

    // An answered question, rated not helpful.
    const answeredConversation = (await q(`select conversation_id from create_public_conversation($1, 'Ana', '', 'How long do refunds take?')`, [org])).rows[0].conversation_id;
    const answer = (await q(`insert into messages (organization_id, conversation_id, sender_type, content, source_references) values ($1, $2, 'assistant', '5-7 days', $3) returning id`, [org, answeredConversation, JSON.stringify([{ chunkId: ids.ownerA, sourceId: source }])])).rows[0].id;
    await q(`insert into ai_feedback (organization_id, message_id, rating) values ($1, $2, -1)`, [org, answer]);

    // An escalated question that staff answered 10 minutes after the handoff.
    const escalated = (await q(`select conversation_id from create_public_conversation($1, 'Ben', '', 'Do you ship to Canada?')`, [org])).rows[0].conversation_id;
    await q(`insert into messages (organization_id, conversation_id, sender_type, content) values ($1, $2, 'assistant', 'The team will reply.')`, [org, escalated]);
    await q(`insert into tickets (organization_id, conversation_id, category, created_at) values ($1, $2, 'knowledge_gap', now() - interval '10 minutes')`, [org, escalated]);
    await q(`insert into messages (organization_id, conversation_id, sender_type, content, author_id) values ($1, $2, 'agent', 'Only PH, SG, and JP for now.', $3)`, [org, escalated, ids.ownerA]);

    report = (await t.as(ids.ownerA, () => t.db.query<{ data: Record<string, unknown> }>(`select get_desk_insights($1, 30) as data`, [org]))).rows[0].data;
  });

  it("counts questions, answers, and handoffs", () => {
    expect(report).toMatchObject({ questions: 2, answered: 1, escalated: 1, helpful: 0, notHelpful: 1, awaitingFirstReply: 0 });
  });

  it("measures the median time to the first staff reply", () => {
    expect(Math.round(Number(report.medianFirstReplySeconds))).toBe(600);
  });

  it("returns a daily series covering the whole period, ending today", () => {
    const daily = report.daily as Array<{ answered: number; escalated: number }>;
    expect(daily.length).toBe(31);
    expect(daily.at(-1)).toMatchObject({ answered: 1, escalated: 1 });
  });

  it("shows which sources answered questions and which were never used", () => {
    expect(report.sources).toEqual([
      expect.objectContaining({ name: "Refund FAQ", uses: 1 }),
      expect.objectContaining({ name: "Unused FAQ", uses: 0 }),
    ]);
  });

  it("lists unanswered questions with the staff reply that can become an FAQ", async () => {
    const rows = await t.as(ids.ownerA, () => t.db.query(`select content, staff_reply from list_unanswered_questions($1)`, [org]));
    expect(rows.rows).toEqual([{ content: "Do you ship to Canada?", staff_reply: "Only PH, SG, and JP for now." }]);
  });

  it("lists answers rated not helpful with the question behind them", async () => {
    const rows = await t.as(ids.ownerA, () => t.db.query(`select question, answer, source_name from list_unhelpful_answers($1)`, [org]));
    expect(rows.rows).toEqual([{ question: "How long do refunds take?", answer: "5-7 days", source_name: "Refund FAQ" }]);
  });
});
