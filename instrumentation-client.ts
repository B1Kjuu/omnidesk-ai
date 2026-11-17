import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  dataCollection: { userInfo: false, httpBodies: [] },
  // Send events to a path on our own domain; the server forwards them to Sentry. Ad blockers drop
  // requests to *.ingest.sentry.io, but not to the site itself.
  tunnel: true,
  // Session Replay with all text and inputs masked: customers type names, emails, and questions here.
  integrations: [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
