import { describeError } from "@/lib/server/describeError";
import "server-only";

/** The action the chat widgets render with (lib/useTurnstile.ts). */
export const TURNSTILE_ACTION = "chat";

/**
 * Frontend hostnames a token may come from. TURNSTILE_HOSTNAMES (comma-separated) wins; otherwise the
 * host this request arrived on, since the chat UI and /api/chat are served from the same origin.
 * Production values must never include localhost.
 */
function expectedHostnames(requestHost: string | null) {
  const configured = (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length > 0) return new Set(configured);
  const host = requestHost?.split(":")[0]?.trim().toLowerCase();
  return new Set(host ? [host] : []);
}

/** True when Cloudflare Turnstile is configured; without a secret the check is skipped (local dev). */
export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Canonical Siteverify: the token must be valid, single-use, issued for the chat action, and issued on
 * one of our own hostnames. Any network or parsing failure fails closed.
 */
export async function verifyTurnstile(token: string, remoteIp: string | null, requestHost: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  const hostnames = expectedHostnames(requestHost);
  if (!token || token.length > 2048 || hostnames.size === 0) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`siteverify returned HTTP ${response.status}`);

    const result: unknown = await response.json();
    if (!result || typeof result !== "object") return false;
    const outcome = result as { success?: unknown; action?: unknown; hostname?: unknown };
    return (
      outcome.success === true &&
      outcome.action === TURNSTILE_ACTION &&
      typeof outcome.hostname === "string" &&
      hostnames.has(outcome.hostname.toLowerCase())
    );
  } catch (error) {
    console.error(`Turnstile verification failed: ${describeError(error)}`);
    return false;
  }
}
