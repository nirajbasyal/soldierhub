// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const IGNORED_BROWSER_ERRORS = [
  "Failed to fetch",
  "Load failed",
  "NetworkError when attempting to fetch resource",
  "The operation was aborted",
  "AbortError",
  "Lock broken by another request",
  "Lock \"lock:sb-",
  "ChunkLoadError",
  "Loading chunk",
];

Sentry.init({
  dsn: "https://77552e0c6b99538e4b2bb012d1f1654f@o4511391652315136.ingest.us.sentry.io/4511480968314880",

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,

  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: false,

  beforeSend(event, hint) {
    const message = String(
      event?.exception?.values?.[0]?.value ||
        event?.message ||
        hint?.originalException?.message ||
        hint?.originalException ||
        ""
    );

    if (IGNORED_BROWSER_ERRORS.some((ignored) => message.includes(ignored))) {
      return null;
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
