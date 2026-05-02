"use client";
import { T } from "@/lib/theme";

export default function PostSkeleton() {
  return (
    <div
      className="rounded-2xl border p-5 md:p-6"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-9 h-9 rounded-full animate-pulse"
          style={{ backgroundColor: T.surface }}
        />
        <div className="flex-1">
          <div
            className="h-3 w-32 rounded animate-pulse mb-1.5"
            style={{ backgroundColor: T.surface }}
          />
          <div
            className="h-2.5 w-20 rounded animate-pulse"
            style={{ backgroundColor: T.surface }}
          />
        </div>
      </div>
      <div
        className="h-5 w-3/4 rounded animate-pulse mb-2"
        style={{ backgroundColor: T.surface }}
      />
      <div
        className="h-3 w-full rounded animate-pulse mb-1.5"
        style={{ backgroundColor: T.surface }}
      />
      <div
        className="h-3 w-5/6 rounded animate-pulse"
        style={{ backgroundColor: T.surface }}
      />
    </div>
  );
}
