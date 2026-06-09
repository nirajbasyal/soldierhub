"use client";

import { Shield, Sparkles } from "lucide-react";
import { T } from "@/lib/theme";

function SkeletonLine({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-full ${className}`}
      style={{ backgroundColor: "rgba(220,232,247,0.92)" }}
    />
  );
}

function SkeletonCard({ rows = 3 }) {
  return (
    <div
      className="rounded-[1.5rem] border p-4"
      style={{ backgroundColor: "rgba(253,254,255,0.92)", borderColor: "#D5E2F2" }}
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-2xl" style={{ backgroundColor: "#DCE8F7" }} />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-3 w-1/2" />
          <SkeletonLine className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonLine key={index} className={index === rows - 1 ? "h-3 w-2/3" : "h-3 w-full"} />
        ))}
      </div>
    </div>
  );
}

export default function PageLoadingState({
  title = "Loading",
  subtitle = "Getting things ready...",
  mode = "page",
}) {
  const isAdmin = mode === "admin";
  const Icon = isAdmin ? Shield : Sparkles;

  return (
    <main className="min-h-screen px-4 py-6" style={{ backgroundColor: T.bg }} aria-busy="true" aria-live="polite">
      <section className="mx-auto w-full max-w-3xl">
        <div
          className="rounded-[2rem] border p-4 shadow-sm md:p-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(253,254,255,0.98), rgba(244,248,253,0.94))",
            borderColor: T.border,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: T.blueSoft, color: T.blue }}
            >
              <Icon size={22} strokeWidth={2.3} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black leading-tight" style={{ color: T.navy }}>
                {title}
              </p>
              <p className="mt-1 text-sm leading-5" style={{ color: T.textMuted }}>
                {subtitle}
              </p>
            </div>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#DCE8F7] border-t-[#1E4E8C]" />
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={2} />
          {isAdmin ? <SkeletonCard rows={4} /> : null}
        </div>
      </section>
    </main>
  );
}
