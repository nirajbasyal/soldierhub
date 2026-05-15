import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.02 : 1.0,
    enableLogs: true,

    beforeSend(event) {
      if (event?.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      if (event?.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers["x-supabase-auth"];
      }

      if (event?.request?.cookies) {
        delete event.request.cookies;
      }

      return event;
    },
  });
}
