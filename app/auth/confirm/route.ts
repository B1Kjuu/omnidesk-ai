import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/** Only same-site paths, so a crafted link cannot bounce people to another domain. */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/dashboard";
}

/**
 * Landing point for every Supabase email link (sign-up confirmation, password reset).
 * Handles both link styles: PKCE `?code=` (default templates) and `?token_hash=&type=`
 * (the templates in supabase/templates, which also work when the link is opened in another browser).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let failed = true;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) console.error("Email link verification failed", error.message);
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("Email link code exchange failed", error.message);
    failed = Boolean(error);
  }

  if (failed) {
    return NextResponse.redirect(new URL("/auth?reason=link-invalid", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
