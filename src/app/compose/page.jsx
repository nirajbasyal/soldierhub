"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/composer/PostComposer";

export default function ComposePage() {
  const router = useRouter();

  useEffect(() => {
    // The previous full-screen expanded editor used browser contentEditable + execCommand.
    // It is intentionally disabled so the compose page uses one editor system only: TipTap.
  }, []);

  return (
    <AppShell hideNav>
      <main
        className="compose-page min-h-[100dvh] overflow-x-hidden overflow-y-auto pb-24 md:pb-10"
        style={{ backgroundColor: T.bg, WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="sticky top-0 z-[80] border-b backdrop-blur-xl"
          style={{ borderColor: T.borderSoft, backgroundColor: "rgba(248,247,244,0.94)" }}
        >
          <div className="mx-auto flex h-[58px] w-full max-w-[860px] items-center justify-between gap-2 px-3 sm:px-6 md:h-[76px] md:px-8">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="sh-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.96]"
              style={{ backgroundColor: "rgba(255,255,255,0.94)", borderColor: T.border, color: T.navy }}
              aria-label="Back to feed"
              title="Back to feed"
            >
              <ArrowLeft size={22} strokeWidth={2.45} />
            </button>

            <h1
              className="min-w-0 flex-1 truncate text-center text-[19px] font-extrabold tracking-[-0.025em] md:text-[27px]"
              style={{ color: T.text }}
            >
              New Post
            </h1>

            <div
              className="flex min-w-0 max-w-[126px] shrink-0 items-center justify-end gap-1 rounded-full border px-2 py-1.5 text-right text-[9px] font-semibold leading-tight md:max-w-[260px] md:px-3 md:text-xs"
              style={{
                backgroundColor: "rgba(255,244,246,0.9)",
                borderColor: "rgba(179,25,66,0.16)",
                color: "#6E2333",
              }}
              title="Do not post sensitive info. Be kind."
            >
              <AlertTriangle size={12} className="shrink-0" style={{ color: "#B31942" }} />
              <span className="truncate md:hidden">No sensitive info</span>
              <span className="hidden truncate md:inline">Do not post sensitive info. Be kind.</span>
            </div>
          </div>
        </div>

        <div className="compose-shell mx-auto w-full max-w-[860px] px-3 pt-3 sm:px-6 md:px-8 md:pt-8">
          <PostComposer startOpen pageMode />
        </div>

        <style jsx global>{`
          @keyframes soldierhubAnonymousComposeNotice {
            0% {
              opacity: 0;
              max-height: 0;
              margin-top: 0;
              margin-bottom: 0;
              padding-top: 0;
              padding-bottom: 0;
              border-width: 0;
              transform: translateY(8px) scale(0.985);
            }
            12%,
            72% {
              opacity: 1;
              max-height: 120px;
              margin-top: 8px;
              margin-bottom: -2px;
              padding-top: 0.625rem;
              padding-bottom: 0.625rem;
              border-width: 1px;
              transform: translateY(0) scale(1);
            }
            100% {
              opacity: 0;
              max-height: 0;
              margin-top: 0;
              margin-bottom: 0;
              padding-top: 0;
              padding-bottom: 0;
              border-width: 0;
              transform: translateY(4px) scale(0.99);
            }
          }

          .compose-shell > div.relative.flex.flex-col > div[class*="sticky"][class*="bottom-2"][class*="z-40"] {
            order: 40;
          }

          .compose-shell > div.relative.flex.flex-col > div.mt-2.flex.items-start.gap-2.rounded-2xl.border {
            order: 35;
            position: relative;
            z-index: 55;
            pointer-events: none;
            overflow: hidden;
            max-height: 120px;
            margin-top: 8px !important;
            margin-bottom: -2px !important;
            box-shadow: 0 14px 30px rgba(179, 25, 66, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.75);
            animation: soldierhubAnonymousComposeNotice 4.6s ease-in-out forwards;
            will-change: opacity, max-height, margin, padding, transform;
          }
        `}</style>
      </main>
    </AppShell>
  );
}
