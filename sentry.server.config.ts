import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Without a DSN Sentry stays off, so local development and forks need no account.
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Every trace locally, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  // Chat request bodies hold customer names, emails, and questions; keep them and visitor identity out of Sentry.
  dataCollection: { userInfo: false, httpBodies: [] },
  // The chat route logs recoverable failures (Gemini down, n8n webhook failed, limiter offline)
  // with console.error; this turns each of them into a Sentry event instead of a buried log line.
  // serveTunnelIntegration answers the browser's tunnel requests (instrumentation-client.ts `tunnel: true`)
  // and forwards them to this DSN only, so it can't be used as an open proxy.
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] }), Sentry.serveTunnelIntegration()],
});
