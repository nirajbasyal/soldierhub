"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/helpers";

export default function ClientTimeAgo({ date }) {
  const [mounted, setMounted] = useState(false);
  const [nowTick, setNowTick] = useState(0);

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

  return <span>{timeAgo(date)}</span>;
}