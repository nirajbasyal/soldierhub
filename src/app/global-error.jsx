"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import ProductionFallback from "@/components/ui/ProductionFallback";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);

    if (process.env.NODE_ENV !== "production") {
      console.error("Soldier Hub global error:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#EAF0F8" }}>
        <ProductionFallback variant="globalError" reset={reset} digest={error?.digest} />
      </body>
    </html>
  );
}
