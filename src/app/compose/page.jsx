"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/PostComposer";

export default function ComposePage() {
  const router = useRouter();

  useEffect(() => {
    const disableMultipleImageSelection = () => {
      document
        .querySelectorAll('input[type="file"][accept*="image"]')
        .forEach((input) => input.removeAttribute("multiple"));
    };

    disableMultipleImageSelection();

    const observer = new MutationObserver(disableMultipleImageSelection);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

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
          @keyframes soldierhubAnonymousNotice {
            0% {
              opacity: 0;
              transform: translateY(-8px) scale(0.985);
            }
            12% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            72% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateY(-5px) scale(0.99);
            }
          }

          .compose-wrap > div.relative.flex.flex-col > div.relative.overflow-hidden.rounded-\[24px\] {
            overflow: visible !important;
          }

          .compose-wrap div[contenteditable="true"][aria-label="Write your SoldierHub post"] {
            display: block !important;
            height: auto !important;
            max-height: none !important;
            overflow-x: hidden !important;
            overflow-y: visible !important;
            white-space: pre-wrap !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
            position: relative !important;
            z-index: 1 !important;
          }

          .compose-wrap img[alt="Selected post preview"] {
            display: block !important;
            position: relative !important;
            z-index: 1 !important;
            margin-top: 0 !important;
          }

          .compose-wrap [aria-label="Remove selected photo"] {
            z-index: 90 !important;
            width: 40px !important;
            height: 40px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(255, 255, 255, 0.98) !important;
            border: 1px solid rgba(190, 202, 216, 0.95) !important;
            color: #0b1c2c !important;
            box-shadow: 0 12px 26px rgba(11, 28, 44, 0.22) !important;
            pointer-events: auto !important;
          }

          .compose-wrap [aria-label="Remove selected photo"] svg {
            width: 18px !important;
            height: 18px !important;
          }

          @media (max-width: 520px) {
            html,
            body {
              overscroll-behavior-y: auto !important;
            }

            .compose-page {
              scroll-padding-bottom: 190px !important;
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
              background: rgba(255, 255, 255, 0.84) !important;
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
              overflow-y: hidden !important;
              padding-bottom: 1px !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 div.flex.w-max {
              display: grid !important;
              grid-auto-flow: column !important;
              grid-template-rows: repeat(2, 32px) !important;
              grid-auto-columns: max-content !important;
              column-gap: 7px !important;
              row-gap: 7px !important;
              padding: 0 34px 0 0 !important;
              width: max-content !important;
              min-width: 0 !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.relative.-mx-1.mb-3 button {
              height: 32px !important;
              border-radius: 999px !important;
              padding-left: 11px !important;
              padding-right: 11px !important;
              font-size: 11px !important;
              font-weight: 650 !important;
              letter-spacing: -0.005em !important;
              white-space: nowrap !important;
              background-color: rgba(255, 255, 255, 0.9) !important;
              border-color: rgba(190, 202, 216, 0.9) !important;
              color: #334155 !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.96), 0 4px 10px rgba(11,28,44,0.025) !important;
            }

            [aria-label="Post formatting toolbar"] {
              margin-bottom: 10px !important;
              border-radius: 999px !important;
              padding: 7px !important;
              background: rgba(248, 250, 253, 0.96) !important;
              border-color: rgba(190, 202, 216, 0.9) !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.9) !important;
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
              overflow: visible !important;
              background: rgba(248, 250, 253, 0.88) !important;
              border-color: rgba(190, 202, 216, 0.9) !important;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.9) !important;
              touch-action: pan-y !important;
            }

            div[contenteditable="true"][aria-label="Write your SoldierHub post"] {
              display: block !important;
              min-height: 155px !important;
              height: auto !important;
              max-height: none !important;
              overflow-x: hidden !important;
              overflow-y: visible !important;
              padding-right: 6px !important;
              font-size: 16px !important;
              line-height: 1.6 !important;
              letter-spacing: -0.01em !important;
              color: #101828 !important;
              white-space: pre-wrap !important;
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
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

            .compose-wrap > div.relative.flex.flex-col > div.relative.overflow-hidden.rounded-\[24px\] > div.mt-3.overflow-hidden.rounded-\[22px\].border {
              position: relative !important;
              clear: both !important;
              z-index: 1 !important;
              margin-top: 14px !important;
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
              background: rgba(255, 255, 255, 0.94) !important;
              border-color: rgba(190, 202, 216, 0.9) !important;
              box-shadow: 0 10px 24px rgba(11, 28, 44, 0.12), inset 0 1px 0 rgba(255,255,255,0.9) !important;
              backdrop-filter: blur(18px);
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid {
              grid-template-columns: minmax(0, 1.14fr) 46px minmax(0, 0.94fr) !important;
              gap: 8px !important;
              align-items: center !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child {
              height: 56px !important;
              min-width: 0 !important;
              border-radius: 18px !important;
              display: inline-flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 4px !important;
              padding: 0 7px !important;
              text-align: center !important;
              background: rgba(255,255,255,0.88) !important;
              border-color: rgba(190,202,216,0.9) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:first-child {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              font-size: 9.5px !important;
              font-weight: 500 !important;
              line-height: 1.05 !important;
              letter-spacing: 0 !important;
              color: #334155 !important;
              text-align: center !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:nth-child(2) {
              position: relative !important;
              display: inline-flex !important;
              width: 50px !important;
              height: 28px !important;
              margin: 0 auto !important;
              align-items: center !important;
              border-radius: 999px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:nth-child(2) > span:first-child,
            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:nth-child(2) > span:nth-child(2) {
              top: 50% !important;
              transform: translateY(-50%) !important;
              line-height: 1 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child > span:nth-child(2) > span:last-child {
              left: 3px !important;
              top: 3px !important;
              width: 22px !important;
              height: 22px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child[aria-pressed="false"] > span:nth-child(2) > span:last-child {
              transform: translateX(0) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:first-child[aria-pressed="true"] > span:nth-child(2) > span:last-child {
              transform: translateX(22px) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(2) {
              display: inline-flex !important;
              height: 56px !important;
              width: 46px !important;
              border-radius: 18px !important;
              padding: 0 !important;
              align-items: center !important;
              justify-content: center !important;
              background: rgba(255,255,255,0.9) !important;
              border-color: rgba(190,202,216,0.9) !important;
              color: #0b1c2c !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(2) svg {
              width: 19px !important;
              height: 19px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(3) {
              height: 56px !important;
              border-radius: 18px !important;
              font-size: 14px !important;
              font-weight: 800 !important;
              background: linear-gradient(135deg, #B31942, #D9485F) !important;
              box-shadow: 0 10px 20px rgba(179,25,66,0.16) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.grid > button:nth-child(3) svg {
              width: 17px !important;
              height: 17px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 {
              margin-top: 8px !important;
              min-height: 44px !important;
              border-radius: 18px !important;
              justify-content: center !important;
              background: linear-gradient(135deg, #4f7fab, #6aa3d8) !important;
              border: 0 !important;
              box-shadow: 0 8px 18px rgba(63,95,125,0.12) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 button {
              color: #ffffff !important;
              font-size: 14px !important;
              font-weight: 800 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 button span {
              background: transparent !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div.mt-2 > span {
              display: none !important;
            }

            .compose-wrap > div.relative.flex.flex-col > div.mt-2.flex.items-start.gap-2.rounded-2xl.border {
              position: absolute !important;
              top: 12px !important;
              left: 12px !important;
              right: 12px !important;
              z-index: 75 !important;
              margin-top: 0 !important;
              padding: 9px 11px !important;
              border-radius: 18px !important;
              font-size: 11px !important;
              line-height: 1.35 !important;
              box-shadow: 0 14px 30px rgba(179, 25, 66, 0.16), inset 0 1px 0 rgba(255,255,255,0.72) !important;
              pointer-events: none !important;
              animation: soldierhubAnonymousNotice 4.4s ease-in-out forwards;
            }

            .compose-wrap > div.relative.flex.flex-col > div.mt-2.flex.items-start.gap-2.rounded-2xl.border svg {
              width: 14px !important;
              height: 14px !important;
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
