import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Who may show this page inside an iframe. Only /embed/<handle> (the website widget) can be framed, and only by
 * the organization's allowed domains; an empty list means any site. Everything else, including the dashboard,
 * refuses framing entirely, which also blocks clickjacking.
 */
async function frameAncestors(pathname: string, supabaseUrl: string, anonKey: string) {
  const handle = pathname.match(/^\/embed\/([^/]+)\/?$/)?.[1];
  if (!handle) return "'self'";
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_widget_domains`, {
      method: "POST",
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" },
      body: JSON.stringify({ handle: decodeURIComponent(handle) }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return "*";
    const domains = ((await response.json()) as string[] | null) ?? [];
    if (domains.length === 0) return "*";
    return ["'self'", ...domains.map((domain) => (domain === "localhost" ? "http://localhost:*" : `https://${domain}`))].join(" ");
  } catch {
    // A lookup failure must not take the widget down on every customer site; the chat page is public anyway.
    return "*";
  }
}

export async function proxy(request: NextRequest) {
  // Production served on a per-deployment URL (omnidesk-abc123-team.vercel.app) sits behind Vercel's
  // login wall, and sessions and copied links would stick to it. Send visitors to the real domain.
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && productionHost && request.nextUrl.host !== productionHost) {
    const canonical = request.nextUrl.clone();
    canonical.protocol = "https:";
    canonical.host = productionHost;
    canonical.port = "";
    return NextResponse.redirect(canonical, 308);
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes an expiring session and writes the new cookies; verifies locally where possible.
  const [ancestors] = await Promise.all([frameAncestors(request.nextUrl.pathname, url, anonKey), supabase.auth.getClaims()]);
  response.headers.set("content-security-policy", `frame-ancestors ${ancestors}`);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|widget\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
