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
        className="compose-page min-h-[100dvh] overflow-x-hidden overflow-y-auto pb-24 md:pb-10"
        style={{ backgroundColor: T.bg, WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="sticky top-0 z-[80] border-b backdrop-blur-xl"
          style={{ borderColor: T.borderSoft, backgroundColor: "rgba(248,247,244,0.92)" }}
        >
          <div className="compose-header mx-auto flex h-[60px] w-full max-w-[860px] items-center justify-between gap-2 px-4 sm:px-6 md:h-[78px] md:px-8">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="sh-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.96]"
              style={{ backgroundColor: "rgba(255,255,255,0.92)", borderColor: T.border, color: T.navy }}
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

        <div className="compose-wrap mx-auto w-full max-w-[860px] px-3 pt-3 sm:px-6 md:px-8 md:pt-8">
          <PostComposer startOpen pageMode />
        </div>

        <style jsx global>{`
          @media (max-width: 520px) {
            html,
            body {
              overscroll-behavior-y: auto !important;
            }

            .compose-page {
              scroll-padding-bottom: 180px !important;
              -webkit-overflow-scrolling: touch !important;
            }

            .compose-header {
              height: 56px !important;
              padding-left: 12px !important;
              padding-right: 12px !important;
            }

            .compose-wrap {
              width: 100% !important;
              max-width: 100vw !important;
              padding-left: 10px !important;
              padding-right: 10px !important;
              padding-top: 8px !important;
              box-sizing: border-box !important;
            }

            .compose-wrap > div.relative.flex.flex-col {
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
              border-radius: 24px !important;
              padding: 14px !important;
              background: rgba(255, 255, 255, 0.8) !important;
              border-color: rgba(199, 210, 224, 0.9) !important;
              box-shadow: 0 10px 28px rgba(11, 28, 44, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.86) !important;
              backdrop-filter: blur(16px);
            }

            .compose-wrap > div.relative.flex.flex-col > div:first-child {
              margin-bottom: 10px !important;
              gap: 10px !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div:first-child [class*="rounded-full"]:first-child {
              width: 44px !important;
              height: 44px !important;
              min-width: 44px !important;
              font-size: 15px !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div:first-child .truncate.text-\[16px\] {
              font-size: 18px !important;
              line-height: 1.1 !important;
              letter-spacing: -0.02em !important;
              font-weight: 800 !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div:first-child .truncate.text-sm {
              margin-top: 1px !important;
              font-size: 13px !important;
              line-height: 1.15 !important;
              font-weight: 500 !important;
              color: #5f6672 !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 {
              margin: 0 0 10px 0 !important;
              max-width: 100% !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 div.overflow-x-auto {
              max-width: 100% !important;
              overflow-x: auto !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 div.flex.w-max {
              display: flex !important;
              gap: 8px !important;
              padding: 0 34px 0 0 !important;
              width: max-content !important;
              min-width: 0 !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 button {
              height: 38px !important;
              border-radius: 999px !important;
              padding-left: 13px !important;
              padding-right: 13px !important;
              font-size: 13px !important;
              font-weight: 700 !important;
              letter-spacing: -0.01em !important;
              white-space: nowrap !important;
              background-color: rgba(255,255,255,0.74) !important;
              border-color: rgba(150, 161, 176, 0.48) !important;
              color: #182230 !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 14px rgba(11,28,44,0.035) !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 button[style*="rgba"],
            .compose-wrap > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 button[aria-pressed="true"] {
              background: linear-gradient(135deg, rgba(126,164,197,0.96), rgba(103,148,190,0.92)) !important;
              border-color: rgba(90, 138, 181, 0.42) !important;
              color: #0b1c2c !important;
            }

            [aria-label="Post formatting toolbar"] {
              margin-bottom: 10px !important;
              border-radius: 999px !important;
              padding: 7px !important;
              background: rgba(238, 243, 248, 0.9) !important;
              border-color: rgba(150, 161, 176, 0.48) !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.82) !important;
            }

            [aria-label="Post formatting toolbar"] > div.grid {
              gap: 3px !important;
            }

            [aria-label="Post formatting toolbar"] button {
              height: 34px !important;
              min-width: 0 !important;
              border: 0 !important;
              background: transparent !important;
              box-shadow: none !important;
              color: #3f4650 !important;
            }

            [aria-label="Post formatting toolbar"] button svg {
              width: 18px !important;
              height: 18px !important;
            }

            [aria-label="Post formatting toolbar"] button span {
              display: none !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.relative.overflow-hidden.rounded-\[24px\] {
              border-radius: 22px !important;
              min-height: 205px !important;
              padding: 14px 14px 10px !important;
              background: rgba(248, 250, 253, 0.82) !important;
              border-color: rgba(150, 161, 176, 0.48) !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.88) !important;
              touch-action: pan-y !important;
            }

            div[contenteditable="true"][aria-label="Write your SoldierHub post"] {
              min-height: 155px !important;
              max-height: none !important;
              overflow-y: visible !important;
              padding-right: 6px !important;
              font-size: 16px !important;
              line-height: 1.6 !important;
              letter-spacing: -0.01em !important;
              color: #101828 !important;
              -webkit-user-select: text !important;
              user-select: text !important;
              touch-action: pan-y !important;
              overscroll-behavior: auto !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.relative.overflow-hidden.rounded-\[24px\] > div.pointer-events-none {
              top: 14px !important;
              left: 14px !important;
              right: 14px !important;
              font-size: 16px !important;
              line-height: 1.6 !important;
              letter-spacing: -0.01em !important;
              color: #6b7280 !important;
            }

            img[alt="Selected post preview"] {
              width: 100% !important;
              max-height: 38vh !important;
              object-fit: cover !important;
              background: #eef3f8 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] {
              position: sticky !important;
              bottom: max(0.45rem, env(safe-area-inset-bottom)) !important;
              z-index: 60 !important;
              margin-top: 10px !important;
              padding: 8px !important;
              border-radius: 22px !important;
              background: rgba(255, 255, 255, 0.92) !important;
              border-color: rgba(150, 161, 176, 0.48) !important;
              box-shadow: 0 10px 24px rgba(11, 28, 44, 0.12), inset 0 1px 0 rgba(255,255,255,0.88) !important;
              backdrop-filter: blur(18px);
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid {
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
              gap: 8px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child {
              height: 54px !important;
              border-radius: 18px !important;
              flex-direction: column !important;
              justify-content: center !important;
              gap: 3px !important;
              padding: 0 8px !important;
              text-align: center !important;
              background: rgba(255,255,255,0.78) !important;
              border-color: rgba(150,161,176,0.48) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:first-child {
              width: 100% !important;
              max-width: 100% !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              font-size: 10px !important;
              font-weight: 500 !important;
              line-height: 1.1 !important;
              letter-spacing: 0 !important;
              color: #101828 !important;
              text-align: center !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:nth-child(2) {
              width: 50px !important;
              height: 28px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(2) {
              display: none !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(3) {
              height: 54px !important;
              border-radius: 18px !important;
              font-size: 16px !important;
              font-weight: 800 !important;
              background: linear-gradient(135deg, #B31942, #D9485F) !important;
              box-shadow: 0 10px 20px rgba(179,25,66,0.16) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(3) svg {
              width: 18px !important;
              height: 18px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 {
              margin-top: 8px !important;
              min-height: 46px !important;
              border-radius: 18px !important;
              justify-content: center !important;
              background: linear-gradient(135deg, #4f7fab, #6aa3d8) !important;
              border: 0 !important;
              box-shadow: 0 8px 18px rgba(63,95,125,0.12) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 button {
              color: #ffffff !important;
              font-size: 15px !important;
              font-weight: 800 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 button span {
              background: transparent !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 > span {
              display: none !important;
            }
          }

          @media (min-width: 768px) {
            img[alt="Selected post preview"] {
              max-height: 340px !important;
              object-fit: cover !important;
              background: #eef3f8 !important;
            }
          }
        `}</style>
      </main>
    </AppShell>
  );
}
