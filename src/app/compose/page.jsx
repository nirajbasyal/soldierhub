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
        className="min-h-[100dvh] overflow-x-hidden overflow-y-auto pb-28 md:pb-10"
        style={{ backgroundColor: T.bg, WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="sticky top-0 z-[80] border-b backdrop-blur-xl"
          style={{ borderColor: T.borderSoft, backgroundColor: "rgba(248,247,244,0.92)" }}
        >
          <div className="mx-auto flex h-[58px] w-full max-w-[860px] items-center justify-between gap-2 px-4 sm:px-6 md:h-[76px] md:px-8">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="sh-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.96] md:h-11 md:w-11"
              style={{ backgroundColor: "rgba(255,255,255,0.9)", borderColor: T.border, color: T.navy }}
              aria-label="Back to feed"
              title="Back to feed"
            >
              <ArrowLeft size={22} strokeWidth={2.4} />
            </button>

            <h1
              className="min-w-0 flex-1 truncate text-center text-[19px] font-extrabold tracking-[-0.025em] md:text-[27px]"
              style={{ color: T.text }}
            >
              New Post
            </h1>

            <div
              className="flex min-w-[118px] max-w-[150px] shrink-0 items-center justify-end gap-1 rounded-full border px-2.5 py-1.5 text-right text-[9.5px] font-semibold leading-tight md:max-w-[260px] md:px-3 md:text-xs"
              style={{
                backgroundColor: "rgba(255,244,246,0.9)",
                borderColor: "rgba(179,25,66,0.16)",
                color: "#6E2333",
              }}
              title="Do not post sensitive info. Be kind."
            >
              <AlertTriangle size={13} className="shrink-0" style={{ color: "#B31942" }} />
              <span className="truncate md:hidden">No sensitive info</span>
              <span className="hidden truncate md:inline">Do not post sensitive info. Be kind.</span>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[860px] px-4 pt-3 sm:px-6 md:px-8 md:pt-8">
          <PostComposer startOpen pageMode />
        </div>

        <style jsx global>{`
          @media (max-width: 520px) {
            html,
            body {
              overscroll-behavior-y: auto !important;
            }

            main {
              scroll-padding-bottom: 190px !important;
              -webkit-overflow-scrolling: touch !important;
            }

            main > div:nth-of-type(2) {
              padding-left: 14px !important;
              padding-right: 14px !important;
              padding-top: 10px !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col {
              border-radius: 28px !important;
              padding: 16px 16px 14px !important;
              background: rgba(255, 255, 255, 0.76) !important;
              border-color: rgba(199, 210, 224, 0.9) !important;
              box-shadow: 0 14px 34px rgba(11, 28, 44, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.86) !important;
              backdrop-filter: blur(18px);
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div:first-child {
              margin-bottom: 12px !important;
              gap: 12px !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div:first-child [class*="rounded-full"]:first-child {
              width: 48px !important;
              height: 48px !important;
              font-size: 16px !important;
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div:first-child .truncate.text-\[16px\] {
              font-size: 22px !important;
              line-height: 1.05 !important;
              letter-spacing: -0.035em !important;
              font-weight: 850 !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div:first-child .truncate.text-sm {
              margin-top: 2px !important;
              font-size: 16px !important;
              line-height: 1.1 !important;
              font-weight: 500 !important;
              color: #5f6672 !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 {
              margin-bottom: 12px !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 div.flex.w-max {
              display: grid !important;
              grid-template-columns: repeat(3, max-content) !important;
              gap: 9px !important;
              padding: 0 38px 0 0 !important;
              width: max-content !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 button {
              height: 44px !important;
              border-radius: 999px !important;
              padding-left: 17px !important;
              padding-right: 17px !important;
              font-size: 15px !important;
              font-weight: 730 !important;
              letter-spacing: -0.02em !important;
              background-color: rgba(255,255,255,0.72) !important;
              border-color: rgba(150, 161, 176, 0.52) !important;
              color: #182230 !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(11,28,44,0.04) !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 button[style*="rgba"],
            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 button[aria-pressed="true"] {
              background: linear-gradient(135deg, rgba(126,164,197,0.96), rgba(103,148,190,0.92)) !important;
              border-color: rgba(90, 138, 181, 0.42) !important;
              color: #0b1c2c !important;
              box-shadow: 0 10px 22px rgba(63, 95, 125, 0.18), inset 0 1px 0 rgba(255,255,255,0.7) !important;
            }

            [aria-label="Post formatting toolbar"] {
              margin-bottom: 12px !important;
              border-radius: 999px !important;
              padding: 8px !important;
              background: rgba(238, 243, 248, 0.88) !important;
              border-color: rgba(150, 161, 176, 0.52) !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.82) !important;
            }

            [aria-label="Post formatting toolbar"] > div.grid {
              gap: 4px !important;
            }

            [aria-label="Post formatting toolbar"] button {
              height: 36px !important;
              border: 0 !important;
              background: transparent !important;
              box-shadow: none !important;
              color: #3f4650 !important;
              font-size: 17px !important;
            }

            [aria-label="Post formatting toolbar"] button svg {
              width: 21px !important;
              height: 21px !important;
            }

            [aria-label="Post formatting toolbar"] button span {
              display: none !important;
            }

            div[contenteditable="true"][aria-label="Write your SoldierHub post"] {
              min-height: 145px !important;
              max-height: none !important;
              overflow-y: visible !important;
              padding-right: 6px !important;
              font-size: 20px !important;
              line-height: 1.62 !important;
              letter-spacing: -0.025em !important;
              color: #101828 !important;
              -webkit-user-select: text !important;
              user-select: text !important;
              touch-action: auto !important;
              overscroll-behavior: auto !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.overflow-hidden.rounded-\[24px\] {
              border-radius: 24px !important;
              min-height: 225px !important;
              padding: 18px 18px 12px !important;
              background: rgba(248, 250, 253, 0.78) !important;
              border-color: rgba(150, 161, 176, 0.52) !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.88) !important;
              touch-action: pan-y !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.overflow-hidden.rounded-\[24px\] > div.pointer-events-none {
              top: 18px !important;
              left: 18px !important;
              right: 18px !important;
              font-size: 19px !important;
              line-height: 1.62 !important;
              letter-spacing: -0.025em !important;
              color: #2b2f36 !important;
            }

            img[alt="Selected post preview"] {
              width: 100% !important;
              max-height: 42vh !important;
              object-fit: cover !important;
              background: #eef3f8 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] {
              position: sticky !important;
              bottom: max(0.5rem, env(safe-area-inset-bottom)) !important;
              z-index: 60 !important;
              margin-top: 12px !important;
              padding: 10px !important;
              border-radius: 24px !important;
              background: rgba(255, 255, 255, 0.88) !important;
              border-color: rgba(150, 161, 176, 0.52) !important;
              box-shadow: 0 12px 28px rgba(11, 28, 44, 0.15), inset 0 1px 0 rgba(255,255,255,0.88) !important;
              backdrop-filter: blur(18px);
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid {
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
              gap: 10px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child {
              height: 62px !important;
              border-radius: 20px !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              gap: 8px !important;
              padding: 0 12px !important;
              text-align: left !important;
              background: rgba(255,255,255,0.74) !important;
              border-color: rgba(150,161,176,0.52) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:first-child {
              width: auto !important;
              max-width: 66px !important;
              white-space: normal !important;
              overflow: visible !important;
              text-overflow: clip !important;
              font-size: 12px !important;
              font-weight: 500 !important;
              line-height: 1.15 !important;
              letter-spacing: -0.01em !important;
              color: #101828 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:nth-child(2) {
              width: 56px !important;
              height: 31px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(2) {
              display: none !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(3) {
              height: 62px !important;
              border-radius: 20px !important;
              font-size: 18px !important;
              font-weight: 850 !important;
              background: linear-gradient(135deg, #B31942, #D9485F) !important;
              box-shadow: 0 12px 22px rgba(179,25,66,0.18) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(3) svg {
              width: 20px !important;
              height: 20px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 {
              margin-top: 10px !important;
              min-height: 54px !important;
              border-radius: 20px !important;
              justify-content: center !important;
              background: linear-gradient(135deg, #4f7fab, #6aa3d8) !important;
              border: 0 !important;
              box-shadow: 0 10px 20px rgba(63,95,125,0.14) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 button {
              color: #ffffff !important;
              font-size: 17px !important;
              font-weight: 850 !important;
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
