"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { T } from "@/lib/theme";
import Button from "@/components/ui/Button";

export default function ProfileError({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    console.error("Profile page crashed:", error);
  }, [error]);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: T.bg }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 text-center"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div
          className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4"
          style={{ backgroundColor: T.redBg, color: T.red }}
        >
          <AlertTriangle size={22} />
        </div>

        <h1 className="text-2xl font-serif mb-2" style={{ color: T.navy }}>
          Profile could not load
        </h1>

        <p className="text-sm leading-relaxed mb-5" style={{ color: T.textMuted }}>
          Something went wrong while loading your profile. Try refreshing, or go
          back to the feed.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="primary" icon={RefreshCw} onClick={reset}>
            Try again
          </Button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D5E2F2] bg-white text-[#0B1C2C] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4E8C]/35"
            aria-label="Back to feed"
            title="Back to feed"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
