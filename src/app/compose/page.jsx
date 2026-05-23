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
        <div className="sticky top-0 z-[80] border-b backdrop-blur-xl" style={{ borderColor: T.borderSoft, backgroundColor: "rgba(248,247,244,0.88)" }}>
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

        <style jsx global>{`
          @media (max-width: 520px) {
            main > div:nth-of-type(2) {
              padding-left: 16px !important;
              padding-right: 16px !important;
              padding-top: 20px !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col {
              border-radius: 32px !important;
              padding: 22px 22px 18px !important;
              background: rgba(255, 255, 255, 0.74) !important;
              border-color: rgba(199, 210, 224, 0.9) !important;
              box-shadow: 0 18px 46px rgba(11, 28, 44, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.86) !important;
              backdrop-filter: blur(18px);
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div:first-child {
              margin-bottom: 18px !important;
              gap: 14px !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div:first-child [class*="rounded-full"]:first-child {
              width: 56px !important;
              height: 56px !important;
              font-size: 18px !important;
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div:first-child .truncate.text-\[16px\] {
              font-size: 25px !important;
              line-height: 1.05 !important;
              letter-spacing: -0.035em !important;
              font-weight: 850 !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div:first-child .truncate.text-sm {
              margin-top: 3px !important;
              font-size: 19px !important;
              line-height: 1.1 !important;
              font-weight: 500 !important;
              color: #5f6672 !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 {
              margin-bottom: 18px !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 div.flex.w-max {
              display: grid !important;
              grid-template-columns: repeat(3, max-content) !important;
              gap: 12px !important;
              padding: 0 42px 0 0 !important;
              width: max-content !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 button {
              height: 52px !important;
              border-radius: 999px !important;
              padding-left: 22px !important;
              padding-right: 22px !important;
              font-size: 18px !important;
              font-weight: 750 !important;
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
              margin-bottom: 18px !important;
              border-radius: 999px !important;
              padding: 10px !important;
              background: rgba(238, 243, 248, 0.88) !important;
              border-color: rgba(150, 161, 176, 0.52) !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.82) !important;
            }

            [aria-label="Post formatting toolbar"] > div.grid {
              gap: 6px !important;
            }

            [aria-label="Post formatting toolbar"] button {
              height: 42px !important;
              border: 0 !important;
              background: transparent !important;
              box-shadow: none !important;
              color: #3f4650 !important;
              font-size: 19px !important;
            }

            [aria-label="Post formatting toolbar"] button svg {
              width: 24px !important;
              height: 24px !important;
            }

            [aria-label="Post formatting toolbar"] button span {
              display: none !important;
            }

            div[contenteditable="true"][aria-label="Write your SoldierHub post"] {
              min-height: 240px !important;
              max-height: none !important;
              overflow-y: visible !important;
              padding-right: 6px !important;
              font-size: 23px !important;
              line-height: 1.75 !important;
              letter-spacing: -0.025em !important;
              color: #101828 !important;
              -webkit-user-select: text !important;
              user-select: text !important;
              touch-action: manipulation !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.overflow-hidden.rounded-\[24px\] {
              border-radius: 26px !important;
              min-height: 350px !important;
              padding: 24px 24px 18px !important;
              background: rgba(248, 250, 253, 0.78) !important;
              border-color: rgba(150, 161, 176, 0.52) !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.88) !important;
            }

            main > div:nth-of-type(2) > div.relative.flex.flex-col > div.relative.overflow-hidden.rounded-\[24px\] > div.pointer-events-none {
              top: 25px !important;
              left: 24px !important;
              right: 24px !important;
              font-size: 22px !important;
              line-height: 1.75 !important;
              letter-spacing: -0.025em !important;
              color: #2b2f36 !important;
            }

            img[alt="Selected post preview"] {
              width: 100% !important;
              max-height: 54vh !important;
              object-fit: cover !important;
              background: #eef3f8 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] {
              position: static !important;
              margin-top: 22px !important;
              padding: 12px !important;
              border-radius: 28px !important;
              background: rgba(255, 255, 255, 0.68) !important;
              border-color: rgba(150, 161, 176, 0.52) !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.88) !important;
              backdrop-filter: blur(18px);
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid {
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
              gap: 12px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child {
              height: 82px !important;
              border-radius: 22px !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              gap: 8px !important;
              padding: 0 14px !important;
              text-align: left !important;
              background: rgba(255,255,255,0.68) !important;
              border-color: rgba(150,161,176,0.52) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:first-child {
              width: auto !important;
              max-width: 68px !important;
              white-space: normal !important;
              overflow: visible !important;
              text-overflow: clip !important;
              font-size: 13px !important;
              font-weight: 500 !important;
              line-height: 1.18 !important;
              letter-spacing: -0.01em !important;
              color: #101828 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:nth-child(2) {
              width: 62px !important;
              height: 34px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(2) {
              display: none !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(3) {
              height: 82px !important;
              border-radius: 22px !important;
              font-size: 21px !important;
              font-weight: 850 !important;
              background: linear-gradient(135deg, #B31942, #D9485F) !important;
              box-shadow: 0 14px 24px rgba(179,25,66,0.18) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(3) svg {
              width: 22px !important;
              height: 22px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 {
              margin-top: 12px !important;
              min-height: 74px !important;
              border-radius: 22px !important;
              justify-content: center !important;
              background: linear-gradient(135deg, #4f7fab, #6aa3d8) !important;
              border: 0 !important;
              box-shadow: 0 12px 24px rgba(63,95,125,0.16) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 button {
              color: #ffffff !important;
              font-size: 20px !important;
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
