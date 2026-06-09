"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { T } from "@/lib/theme";

function SkeletonLine({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-full ${className}`}
      style={{ backgroundColor: "rgba(220,232,247,0.92)" }}
    />
  );
}

export default function InlineLoadingState({
  title = "Loading",
  subtitle = "Getting this ready...",
  icon: Icon = Sparkles,
  rows = 3,
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(253,254,255,0.98), rgba(244,248,253,0.94))",
        borderColor: "#D5E2F2",
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: T.blueSoft, color: T.blue }}
        >
          <Icon size={20} strokeWidth={2.25} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black leading-tight" style={{ color: T.navy }}>
                {title}
              </p>
              <p className="mt-1 text-xs leading-5" style={{ color: T.textMuted }}>
                {subtitle}
              </p>
            </div>
            <LoaderCircle size={18} className="shrink-0 animate-spin" style={{ color: T.blue }} />
          </div>

          <div className="mt-4 space-y-2">
            {Array.from({ length: rows }).map((_, index) => (
              <SkeletonLine
                key={index}
                className={index === rows - 1 ? "h-3 w-2/3" : "h-3 w-full"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
