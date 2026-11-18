import { hashSecretToken } from "@/lib/server/secretToken";
import { createClient } from "@/lib/supabase/server";

/** Accepts an invitation as the signed-in user. The database checks the email, expiry, and single use. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return Response.json({ error: "Sign in to accept this invitation." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token || token.length > 100) return Response.json({ error: "This invitation link is not valid." }, { status: 400 });

  const { data: organizationId, error } = await supabase.rpc("accept_invitation", { invitation_token_hash: hashSecretToken(token) });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ organizationId });
}
