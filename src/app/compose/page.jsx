"use client";

import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/PostComposer";

export default function ComposePage() {
  const router = useRouter();

  return (
    <AppShell hideNav>
      <main
        className="min-h-[100dvh] overflow-x-hidden pb-28 md:pb-10"
        style={{ backgroundColor: T.bg }}
      >
        <div className="sticky top-0 z-[80] border-b backdrop-blur-xl" style={{ borderColor: T.borderSoft }}>
          <div className="mx-auto flex h-[78px] w-full max-w-[860px] items-center justify-between px-5 sm:px-6 md:h-[86px] md:px-8">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="sh-tap flex h-11 w-11 items-center justify-center rounded-full transition active:scale-[0.96]"
              style={{ color: T.navy }}
              aria-label="Back to feed"
              title="Back to feed"
            >
              <ArrowLeft size={28} strokeWidth={2.2} />
            </button>

            <h1 className="min-w-0 flex-1 truncate px-3 text-center text-[24px] font-extrabold tracking-[-0.03em] md:text-[28px]" style={{ color: T.text }}>
              SoldierHub <span style={{ color: T.textSubtle }}>|</span> New Post
            </h1>

            <button
              type="button"
              className="sh-tap flex h-11 w-11 items-center justify-center rounded-full transition active:scale-[0.96]"
              style={{ color: "#B31942" }}
              aria-label="Do not post sensitive information"
              title="Do not post sensitive info. Be kind."
            >
              <AlertTriangle size={27} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[860px] px-4 pt-6 sm:px-6 md:px-8 md:pt-8">
          <PostComposer startOpen pageMode />
        </div>
      </main>
    </AppShell>
  );
}
