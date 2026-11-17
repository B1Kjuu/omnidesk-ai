import "server-only";

/**
 * The public address customers should get, e.g. https://omnidesk-ai-one.vercel.app.
 * SITE_URL wins; on Vercel, the project's production domain (a system variable) is used.
 * Never a per-deployment URL, which Vercel puts behind a login.
 */
export function publicOrigin() {
  const configured = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return production ? `https://${production}` : null;
}
