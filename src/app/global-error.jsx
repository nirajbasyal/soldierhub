"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);

    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <html>
      <body style={{ backgroundColor: "#F6F3EC", margin: 0 }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: "100%",
              backgroundColor: "#fff",
              border: "1px solid #E5DFD0",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "#FBEAE7",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={26} color="#B43A2E" strokeWidth={2} />
            </div>
            <h1
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 28,
                margin: 0,
                color: "#0B1C2C",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "#5C6470",
                margin: "12px 0 24px",
              }}
            >
              An unexpected error happened. Try refreshing the page.
            </p>
            <button
              onClick={reset}
              style={{
                height: 44,
                padding: "0 20px",
                borderRadius: 12,
                backgroundColor: "#0B1C2C",
                color: "#fff",
                border: "none",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
