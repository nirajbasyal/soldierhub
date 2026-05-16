"use client";

import { ArrowLeft, HeartHandshake } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/PostComposer";

export default function ComposePage() {
  const router = useRouter();

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen overflow-x-hidden pb-28 md:pb-10"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.95) 0%, rgba(234,240,248,0.92) 34%, rgba(248,247,244,0.96) 100%)",
        }}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 pt-4 md:px-6 md:pt-7">
          <div className="mb-3 flex items-center justify-between gap-3 md:mb-5">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-sm transition-all active:scale-95"
              style={{
                backgroundColor: "rgba(255,255,255,0.92)",
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
                backgroundColor: "rgba(179,25,66,0.1)",
                borderColor: "rgba(179,25,66,0.2)",
                color: "#B31942",
              }}
            >
              <HeartHandshake size={17} />
              Be kind
            </div>
          </div>

          <section
            className="flex-1 rounded-[34px] border p-2.5 shadow-sm md:p-4"
            style={{
              backgroundColor: "rgba(255,255,255,0.62)",
              borderColor: "rgba(213,226,242,0.95)",
              boxShadow: "0 22px 60px rgba(11,28,44,0.1)",
            }}
          >
            <PostComposer startOpen pageMode />
          </section>
        </div>
      </main>
    </AppShell>
  );
}
