import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Baseline security headers on every response. Framing rules live in proxy.ts (frame-ancestors),
  // because the website widget's embed page needs per-organization values.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HTTPS only, for two years, including subdomains (Vercel already redirects HTTP to HTTPS).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
      {
        // The widget script is loaded by other websites; let browsers cache it briefly so updates still roll out fast.
        source: "/widget.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT are set (on Vercel);
// otherwise the build runs exactly as before.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "joebeck-andrew-f-gusi",
  project: process.env.SENTRY_PROJECT ?? "omnidesk-ai",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
});
