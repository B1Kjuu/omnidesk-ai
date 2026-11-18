import { describe, expect, it } from "vitest";
import { chunkFaq, chunkSource, chunkText } from "@/lib/server/ai/chunking";

describe("chunkFaq", () => {
  it("splits Q:/A: blocks into one passage per question", () => {
    const passages = chunkFaq("Q: How long do refunds take?\nA: 5 to 7 days.\n\nQ: Do you ship to Japan?\nA: Yes.");
    expect(passages).toEqual(["Q: How long do refunds take?\nA: 5 to 7 days.", "Q: Do you ship to Japan?\nA: Yes."]);
  });

  it("accepts Question:/Answer: labels", () => {
    expect(chunkFaq("Question: One?\nAnswer: A.\nQuestion: Two?\nAnswer: B.")).toHaveLength(2);
  });

  it("treats text without question markers as prose", () => {
    expect(chunkFaq("Refunds take 5 to 7 business days.")).toEqual(["Refunds take 5 to 7 business days."]);
  });
});

describe("chunkText", () => {
  it("keeps short text as a single passage", () => {
    expect(chunkText("  Short   policy.\n\n\n\nSecond line. ")).toEqual(["Short policy.\n\nSecond line."]);
  });

  it("returns nothing for empty text", () => {
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("splits long prose into bounded passages with overlap, losing no sentence", () => {
    const sentences = Array.from({ length: 60 }, (_, index) => `Sentence number ${index} explains part of the shipping policy in detail.`);
    const passages = chunkText(sentences.join(" "));
    expect(passages.length).toBeGreaterThan(2);
    for (const passage of passages) expect(passage.length).toBeLessThanOrEqual(1400 + 160);
    for (const sentence of sentences) expect(passages.some((passage) => passage.includes(sentence))).toBe(true);
  });

  it("hard-wraps a single unbroken run of text", () => {
    const passages = chunkText("x".repeat(5000));
    expect(passages.length).toBeGreaterThan(3);
    expect(passages.join("").replace(/[^x]/g, "").length).toBeGreaterThanOrEqual(5000);
  });
});

describe("chunkSource", () => {
  it("routes FAQs to per-question splitting and other types to prose splitting", () => {
    const faq = "Q: A?\nA: 1.\nQ: B?\nA: 2.";
    expect(chunkSource("faq", faq)).toHaveLength(2);
    expect(chunkSource("text", faq)).toHaveLength(1);
  });
});
