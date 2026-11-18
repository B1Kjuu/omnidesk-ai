/**
 * The site's public base URL for metadata, sitemap, and social previews.
 * SITE_URL wins; on Vercel the project's production domain; locally http://localhost:3000.
 */
export function siteUrl() {
  const configured = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return production ? `https://${production}` : "http://localhost:3000";
}
