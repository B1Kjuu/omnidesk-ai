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
