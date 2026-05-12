"use client";

import { useEffect, useMemo, useState } from "react";
import { timeAgo } from "@/lib/helpers";

export default function ClientTimeAgo({ date, value, timestamp, createdAt, created_at }) {
  const [mounted, setMounted] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  const resolvedDate = useMemo(
    () => date ?? value ?? timestamp ?? createdAt ?? created_at ?? null,
    [date, value, timestamp, createdAt, created_at]
  );

  useEffect(() => {
    setMounted(true);

    const timer = setInterval(() => {
      setNowTick((prev) => prev + 1);
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  if (!mounted) {
    return <span suppressHydrationWarning>...</span>;
  }

  return <span>{timeAgo(resolvedDate)}</span>;
}
