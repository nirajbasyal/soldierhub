"use client";

import { useEffect } from "react";
import ProductionFallback from "@/components/ui/ProductionFallback";

export default function Error({ error, reset }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Soldier Hub route error:", error);
    }
  }, [error]);

  return <ProductionFallback variant="error" reset={reset} digest={error?.digest} />;
}
