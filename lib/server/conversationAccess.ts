import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Customers have no account. Their browser keeps a random token for each conversation; the database
 * keeps only its SHA-256 hash. Possessing the conversation id alone never grants access to the thread.
 */
export function newConversationToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashConversationToken(token) };
}

export function hashConversationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns the conversation if the token matches, otherwise null. Constant-time comparison. */
export async function findCustomerConversation(admin: SupabaseClient<Database>, conversationId: string, token: string) {
  if (!uuidPattern.test(conversationId) || !token || token.length > 100) return null;

  const { data } = await admin
    .from("conversations")
    .select("id, organization_id, customer_id, status, customer_token_hash")
    .eq("id", conversationId)
    .maybeSingle();
  if (!data?.customer_token_hash) return null;

  const expected = Buffer.from(data.customer_token_hash, "hex");
  const given = Buffer.from(hashConversationToken(token), "hex");
  return expected.length === given.length && timingSafeEqual(expected, given) ? data : null;
}
