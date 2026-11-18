import { describe, expect, it } from "vitest";
import { isPrivateAddress } from "@/lib/server/ai/extract";
import { describeError } from "@/lib/server/describeError";
import { hashSecretToken, newSecretToken } from "@/lib/server/secretToken";
import { groupKnowledgeGaps, type UnansweredQuestion } from "@/lib/server/insights/gaps";

describe("isPrivateAddress (SSRF guard for URL imports)", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])(
    "blocks %s",
    (address) => expect(isPrivateAddress(address)).toBe(true),
  );

  it.each(["8.8.8.8", "172.32.0.1", "104.18.2.3", "2606:4700::1111"])("allows public %s", (address) => expect(isPrivateAddress(address)).toBe(false));
});

describe("secret tokens", () => {
  it("are random, URL-safe, and stored only as a SHA-256 hash", () => {
    const first = newSecretToken();
    const second = newSecretToken();
    expect(first.token).not.toBe(second.token);
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSecretToken(first.token)).toBe(first.hash);
  });
});

describe("describeError", () => {
  it("turns Supabase error objects into readable text instead of [object Object]", () => {
    expect(describeError({ message: "duplicate key", code: "23505", details: "Key (slug) exists." })).toBe("duplicate key | code 23505 | Key (slug) exists.");
    expect(describeError(new Error("boom"))).toBe("boom");
    expect(describeError("plain")).toBe("plain");
  });
});

describe("groupKnowledgeGaps", () => {
  const vector = (angle: number) => `[${Array.from({ length: 8 }, (_, index) => (index === 0 ? Math.cos(angle) : index === 1 ? Math.sin(angle) : 0)).join(",")}]`;
  const question = (id: string, content: string, angle: number | null, minutesAgo: number, reply: string | null = null): UnansweredQuestion => ({
    message_id: id,
    conversation_id: `c-${id}`,
    content,
    created_at: new Date(Date.UTC(2026, 10, 18, 12, 0) - minutesAgo * 60_000).toISOString(),
    embedding: angle === null ? null : vector(angle),
    staff_reply: reply,
  });

  it("groups questions with similar meaning and ranks the biggest gap first", () => {
    const gaps = groupKnowledgeGaps([
      question("1", "Do you ship to Canada?", 0, 1, "Not yet."),
      question("2", "Delivery to Toronto?", 0.2, 2),
      question("3", "Can I pay with Bitcoin?", 1.4, 3),
      question("4", "International shipping to Canada?", 0.1, 4),
    ]);
    expect(gaps.map((gap) => gap.count)).toEqual([3, 1]);
    expect(gaps[0].staffReplies).toEqual(["Not yet."]);
    expect(gaps[0].examples).toContain("Delivery to Toronto?");
  });

  it("groups questions without embeddings only when the wording matches", () => {
    const gaps = groupKnowledgeGaps([question("1", "Bulk order?", null, 1), question("2", "bulk  ORDER", null, 2), question("3", "Gift wrap?", null, 3)]);
    expect(gaps.map((gap) => gap.count)).toEqual([2, 1]);
  });
});
