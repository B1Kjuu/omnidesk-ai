import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Limit = { bucket: string; max: number; windowSeconds: number };

/** The caller's IP on Vercel, hashed so raw addresses are never stored. */
export async function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`omnidesk:${ip}`));
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Counts one hit against every limit and returns the first one exceeded, or null.
 * Fails open: if the database call errors (for example the migration is not applied yet),
 * the request is allowed and the error is logged, so a limiter fault never takes the desk down.
 */
export async function firstExceededLimit(admin: SupabaseClient<Database>, limits: Limit[]) {
  const results = await Promise.all(
    limits.map(async (limit) => {
      const { data, error } = await admin.rpc("hit_rate_limit", {
        bucket_key: limit.bucket,
        max_hits: limit.max,
        window_seconds: limit.windowSeconds,
      });
      if (error) {
        console.error("Rate limiter unavailable, allowing request", error);
        return null;
      }
      return data === false ? limit : null;
    }),
  );
  return results.find((limit) => limit !== null) ?? null;
}
