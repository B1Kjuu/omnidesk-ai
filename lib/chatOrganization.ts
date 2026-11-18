import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The organization behind a public chat handle: the short name (/chat/sunrise-outfitters) or the original id.
 * Returns null for an unknown or malformed handle.
 */
export const findChatOrganization = cache(async (handle: string) => {
  const value = decodeURIComponent(handle).toLowerCase();
  const column = uuidPattern.test(value) ? "id" : slugPattern.test(value) && value.length <= 40 ? "slug" : null;
  if (!column) return null;

  const { data, error } = await createAdminClient().from("organizations").select("id, name").eq(column, value).maybeSingle();
  if (error) throw new Error(`Could not load chat organization: ${error.message}`);
  return data;
});
