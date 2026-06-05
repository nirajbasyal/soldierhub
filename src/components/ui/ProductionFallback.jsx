"use client";

import Link from "next/link";
import { AlertTriangle, Home, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { T } from "@/lib/theme";

const VARIANT_COPY = {
  error: {
    eyebrow: "Temporary app issue",
    title: "Something did not load correctly.",
    description:
      "Soldier Hub is still available. Try refreshing the page, or return home and continue from the main feed.",
    icon: AlertTriangle,
  },
  globalError: {
    eyebrow: "Recovery mode",
    title: "Soldier Hub hit a temporary issue.",
    description:
      "This screen keeps the app from showing a blank page. Refresh once, or go back home and try again.",
    icon: AlertTriangle,
  },
  notFound: {
    eyebrow: "Page not found",
    title: "This page is not available.",
    description:
      "The link may be old, moved, or mistyped. You can return to the Fort Bliss community feed.",
    icon: ShieldCheck,
  },
  loading: {
    eyebrow: "Loading Soldier Hub",
    title: "Getting the community page ready.",
    description:
      "This should only take a moment. We are loading the latest Fort Bliss community information.",
    icon: Loader2,
  },
};

export default function ProductionFallback({
  variant = "error",
  reset,
  digest,
  showRefresh = true,
}) {
  const copy = VARIANT_COPY[variant] || VARIANT_COPY.error;
  const Icon = copy.icon;
  const isLoading = variant === "loading";

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(220, 232, 247, 0.85), transparent 30%), #EAF0F8",
        color: T.textPrimary,
      }}
    >
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center justify-center">
        <div
          className="w-full rounded-[2rem] border p-5 shadow-[0_24px_70px_rgba(7,27,51,0.12)] sm:p-8"
          style={{ backgroundColor: T.card, borderColor: T.borderSoft }}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3" aria-label="Go to Soldier Hub home">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-sm"
                style={{ backgroundColor: T.brandNavy, borderColor: "rgba(207,218,232,0.9)" }}
              >
                <img
                  src="/brand/soldierhub-app-icon.svg"
                  alt="Soldier Hub app icon"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-base font-black leading-tight" style={{ color: T.brandNavy }}>
                  Soldier Hub
                </p>
                <p className="text-xs font-semibold" style={{ color: T.textMuted }}>
                  Fort Bliss community
                </p>
              </div>
            </Link>

            <span
              className="rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]"
              style={{ backgroundColor: T.brandBlueSoft, borderColor: T.borderSoft, color: T.brandBlue }}
            >
              Safe fallback
            </span>
          </div>

          <div
            className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl border"
            style={{ backgroundColor: T.surfaceSoft, borderColor: T.borderSoft, color: T.brandBlue }}
          >
            <Icon className={isLoading ? "h-7 w-7 animate-spin" : "h-7 w-7"} aria-hidden="true" />
          </div>

          <p
            className="mb-3 text-xs font-black uppercase tracking-[0.22em]"
            style={{ color: T.brandBlue }}
          >
            {copy.eyebrow}
          </p>

          <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl" style={{ color: T.brandNavy }}>
            {copy.title}
          </h1>

          <p className="mt-4 max-w-2xl text-base font-medium leading-7 sm:text-lg" style={{ color: T.textSecondary }}>
            {copy.description}
          </p>

          {digest ? (
            <p
              className="mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold"
              style={{ backgroundColor: T.surface, borderColor: T.borderSoft, color: T.textMuted }}
            >
              Error reference: {digest}
            </p>
          ) : null}

          {!isLoading ? (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {showRefresh ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof reset === "function") {
                      reset();
                      return;
                    }

                    if (typeof window !== "undefined") {
                      window.location.reload();
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
                  style={{ backgroundColor: T.brandNavy }}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </button>
              ) : null}

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition hover:-translate-y-0.5"
                style={{ backgroundColor: T.surfaceSoft, borderColor: T.border, color: T.brandNavy }}
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Back to home
              </Link>
            </div>
          ) : null}

          <div
            className="mt-7 rounded-2xl border px-4 py-3 text-xs font-semibold leading-5"
            style={{ backgroundColor: T.backgroundSoft, borderColor: T.borderSoft, color: T.textMuted }}
          >
            Soldier Hub is an independent, unofficial community platform. It is not affiliated with,
            endorsed by, or operated by the U.S. Government, DoD, Army, Fort Bliss, or any installation.
          </div>
        </div>
      </section>
    </main>
  );
}
