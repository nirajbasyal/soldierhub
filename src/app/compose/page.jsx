"use client";

import { ArrowLeft, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/PostComposer";

export default function ComposePage() {
  const router = useRouter();

  return (
    <AppShell hideNav>
      <main className="min-h-screen pb-28 md:pb-10" style={{ backgroundColor: T.bg }}>
        <div className="mx-auto w-full max-w-3xl px-4 pt-5 md:pt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-sm transition-all active:scale-95"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.navy,
              }}
            >
              <ArrowLeft size={18} />
              Feed
            </button>

            <div
              className="inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-sm"
              style={{
                backgroundColor: "rgba(179,25,66,0.08)",
                borderColor: "rgba(179,25,66,0.18)",
                color: "#B31942",
              }}
            >
              <PenLine size={17} />
              New post
            </div>
          </div>

          <section
            className="rounded-[30px] border p-3 shadow-sm md:p-4"
            style={{
              backgroundColor: "rgba(255,255,255,0.72)",
              borderColor: T.border,
              boxShadow: "0 18px 46px rgba(11,28,44,0.08)",
            }}
          >
            <PostComposer startOpen />
          </section>
        </div>
      </main>
    </AppShell>
  );
}
