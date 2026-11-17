import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { extractText } from "unpdf";

export const MAX_PDF_BYTES = 4 * 1024 * 1024; // Vercel functions accept request bodies up to ~4.5 MB.
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_TEXT_CHARS = 300_000;

export class ExtractionError extends Error {}

export async function extractPdfText(file: ArrayBuffer): Promise<string> {
  if (file.byteLength > MAX_PDF_BYTES) throw new ExtractionError("The PDF is larger than 4 MB.");
  let pages: string[];
  try {
    ({ text: pages } = await extractText(new Uint8Array(file), { mergePages: false }));
  } catch {
    throw new ExtractionError("The file could not be read as a PDF.");
  }
  const text = pages.map((page) => page.trim()).filter(Boolean).join("\n\n");
  if (text.length < 20) throw new ExtractionError("No text was found in the PDF. Scanned image PDFs are not supported yet.");
  return text.slice(0, MAX_TEXT_CHARS);
}

/** Private, loopback, link-local and metadata ranges a public URL must never resolve to (SSRF guard). */
function isPrivateAddress(address: string) {
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
    return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
  }
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new ExtractionError("Only http and https links can be added.");
  if (url.username || url.password) throw new ExtractionError("Links with a username or password are not allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new ExtractionError("That address is not a public website.");
  }
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((entry) => entry.address);
  if (addresses.length === 0) throw new ExtractionError("That website could not be found.");
  if (addresses.some(isPrivateAddress)) throw new ExtractionError("That address is not a public website.");
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

function htmlToText(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html.match(/<body[\s\S]*?<\/body>/i)?.[0] ?? html;
  const text = main
    .replace(/<(script|style|noscript|svg|template|iframe|nav|footer|header|form)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#?\w+);/g, (match, name: string) => entities[name.toLowerCase()] ?? (name.startsWith("#") ? String.fromCharCode(Number(name.slice(1).replace(/^x/i, "0x"))) : match))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title: title.replace(/&amp;/g, "&").replace(/\s+/g, " "), text };
}

/** Fetches one public web page and returns its readable text. Redirects are followed manually and re-checked. */
export async function fetchUrlText(rawUrl: string): Promise<{ text: string; title: string; finalUrl: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new ExtractionError("That is not a valid link. Include https://.");
  }

  for (let hop = 0; hop < 4; hop++) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "user-agent": "OmniDeskBot/1.0 (+knowledge import)", accept: "text/html,text/plain;q=0.9" },
    });

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      url = new URL(response.headers.get("location")!, url);
      continue;
    }
    if (!response.ok) throw new ExtractionError(`The website answered with HTTP ${response.status}.`);

    const type = response.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) throw new ExtractionError("That link is not a web page. Upload PDFs with the PDF option.");
    if (Number(response.headers.get("content-length") ?? 0) > MAX_HTML_BYTES) throw new ExtractionError("That page is too large to import.");

    const body = (await response.text()).slice(0, MAX_HTML_BYTES);
    const { text, title } = /text\/plain/i.test(type) ? { text: body.trim(), title: "" } : htmlToText(body);
    if (text.length < 40) throw new ExtractionError("No readable text was found on that page. Pages built entirely with JavaScript cannot be imported yet.");
    return { text: text.slice(0, MAX_TEXT_CHARS), title, finalUrl: url.toString() };
  }
  throw new ExtractionError("That link redirects too many times.");
}
