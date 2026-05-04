"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
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

          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => router.push("/")}
          >
            Back to feed
          </Button>
        </div>
      </div>
    </main>
  );
}