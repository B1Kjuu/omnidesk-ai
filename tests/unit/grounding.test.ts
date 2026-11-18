import { describe, expect, it, vi } from "vitest";
import { citationExcerpt, decideAnswer, keywordCandidates, MIN_SIMILARITY, STRONG_SIMILARITY, type Candidate } from "@/lib/server/ai/grounding";

const passage = (score: number, content = "Refunds take 5 to 7 business days.", method: Candidate["method"] = "semantic"): Candidate => ({
  id: `chunk-${score}`,
  sourceId: "refund-faq",
  content,
  score,
  method,
});

describe("decideAnswer", () => {
  it("escalates without calling the model when there is no knowledge", async () => {
    const generate = vi.fn();
    expect(await decideAnswer("Hi?", [], generate)).toEqual({ answered: false, reason: "no_knowledge" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("escalates without calling the model when nothing clears the similarity threshold", async () => {
    const generate = vi.fn();
    const decision = await decideAnswer("Weather in Tokyo?", [passage(MIN_SIMILARITY - 0.05)], generate);
    expect(decision).toEqual({ answered: false, reason: "below_threshold" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("answers with the passage the model cited", async () => {
    const candidates = [passage(0.8, "Refund policy"), passage(0.7, "Shipping policy")];
    const generate = vi.fn().mockResolvedValue({ answered: true, answer: "We ship to Japan.", source: 1 });
    const decision = await decideAnswer("Ship to Japan?", candidates, generate);
    expect(decision).toMatchObject({ answered: true, answer: "We ship to Japan.", reason: "grounded" });
    expect(decision.answered && decision.used.content).toBe("Shipping policy");
    expect(generate).toHaveBeenCalledWith("Ship to Japan?", ["Refund policy", "Shipping policy"]);
  });

  it("escalates when the model judges no passage answers the question", async () => {
    const generate = vi.fn().mockResolvedValue({ answered: false });
    expect(await decideAnswer("Is my product indestructible?", [passage(0.7)], generate)).toEqual({ answered: false, reason: "model_declined" });
  });

  it("quotes a strong match directly when the model is unavailable", async () => {
    const decision = await decideAnswer("Refund time?", [passage(STRONG_SIMILARITY + 0.01)], vi.fn().mockResolvedValue(null));
    expect(decision).toMatchObject({ answered: true, reason: "model_unavailable_strong_match" });
  });

  it("escalates a weak match when the model is unavailable, rather than guessing", async () => {
    expect(await decideAnswer("Refund time?", [passage(MIN_SIMILARITY + 0.02)], vi.fn().mockResolvedValue(null))).toEqual({
      answered: false,
      reason: "model_unavailable",
    });
  });

  it("treats a model error like an outage", async () => {
    const decision = await decideAnswer("Refund time?", [passage(0.7)], vi.fn().mockRejectedValue(new Error("429")));
    expect(decision).toEqual({ answered: false, reason: "model_unavailable" });
  });
});

describe("keywordCandidates", () => {
  const chunks = [
    { id: "1", source_id: "processing", content: "The processing of products will take 1-2 days." },
    { id: "2", source_id: "refunds", content: "Refunds are issued to the original payment method within 5 to 7 business days." },
  ];

  it("does not trust a single shared word (the 'is my product destructable?' bug)", () => {
    const [top] = keywordCandidates(chunks, "is my product destructable?");
    expect(top.score).toBe(0);
  });

  it("scores passages that share several question words", () => {
    const [top] = keywordCandidates(chunks, "how many business days do refunds take to the original payment method");
    expect(top.sourceId).toBe("refunds");
    expect(top.score).toBeGreaterThan(0.5);
  });
});

describe("citationExcerpt", () => {
  it("keeps short passages whole and trims long ones at a word boundary", () => {
    expect(citationExcerpt("Short passage.")).toBe("Short passage.");
    const excerpt = citationExcerpt(`${"word ".repeat(100)}end`, 50);
    expect(excerpt.length).toBeLessThanOrEqual(50);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt).not.toMatch(/\swor…$/);
  });
});
