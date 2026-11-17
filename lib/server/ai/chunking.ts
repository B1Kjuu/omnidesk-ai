/**
 * Splits knowledge into passages small enough to retrieve precisely, large enough to keep context.
 * FAQs split per question; prose splits on paragraphs, then sentences, with a little overlap so an
 * answer that straddles a boundary is still found.
 */
const TARGET_CHARS = 900;
const MAX_CHARS = 1400;
const OVERLAP_CHARS = 150;
const MAX_CHUNKS = 400;

function normalize(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(paragraph: string) {
  return paragraph.match(/[^.!?。]+(?:[.!?。]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [paragraph];
}

/** Hard-wraps a single unbroken run (no sentence breaks) so no passage exceeds MAX_CHARS. */
function hardSplit(text: string) {
  const parts: string[] = [];
  for (let start = 0; start < text.length; start += TARGET_CHARS) parts.push(text.slice(start, start + TARGET_CHARS));
  return parts;
}

export function chunkText(raw: string): string[] {
  const text = normalize(raw);
  if (!text) return [];
  if (text.length <= MAX_CHARS) return [text];

  const units = text
    .split(/\n\n+/)
    .flatMap((paragraph) => (paragraph.length <= TARGET_CHARS ? [paragraph] : splitSentences(paragraph)))
    .flatMap((unit) => (unit.length <= MAX_CHARS ? [unit] : hardSplit(unit)));

  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (current && current.length + unit.length + 1 > TARGET_CHARS) {
      chunks.push(current.trim());
      // Carry the tail of the previous passage forward, starting at a word boundary.
      const tail = current.slice(-OVERLAP_CHARS);
      current = `${tail.slice(tail.indexOf(" ") + 1)} ${unit}`;
    } else {
      current = current ? `${current}\n${unit}` : unit;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.slice(0, MAX_CHUNKS);
}

/**
 * FAQs written as "Q: … A: …" (or "Question:/Answer:") become one passage per question.
 * Anything else is treated as prose.
 */
export function chunkFaq(raw: string): string[] {
  const text = normalize(raw);
  const blocks = text.split(/\n(?=\s*(?:Q|Question)\s*[:.)-])/i).map((block) => block.trim()).filter(Boolean);
  if (blocks.length < 2) return chunkText(text);
  return blocks.flatMap((block) => (block.length <= MAX_CHARS ? [block] : chunkText(block))).slice(0, MAX_CHUNKS);
}

export function chunkSource(sourceType: string, text: string) {
  return sourceType === "faq" ? chunkFaq(text) : chunkText(text);
}
