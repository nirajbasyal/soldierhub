"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/PostComposer";

const COMPOSE_SUBMIT_EVENT = "soldierhub-compose-submit";
const COMPOSE_STATE_EVENT = "soldierhub-compose-state";

export default function ComposePage() {
  const router = useRouter();
  const [canPublish, setCanPublish] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleComposeState = (event) => {
      setCanPublish(Boolean(event.detail?.canPublish));
      setIsSubmitting(Boolean(event.detail?.submitting));
    };

    window.addEventListener(COMPOSE_STATE_EVENT, handleComposeState);

    return () => {
      window.removeEventListener(COMPOSE_STATE_EVENT, handleComposeState);
    };
  }, []);

  const publishPost = () => {
    if (typeof window === "undefined" || !canPublish || isSubmitting) return;
    window.dispatchEvent(new CustomEvent(COMPOSE_SUBMIT_EVENT));
  };

  return (
    <AppShell hideNav>
      <main
        className="min-h-[100dvh] overflow-x-hidden pb-24 md:pb-10"
        style={{ backgroundColor: T.bg }}
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[820px] flex-col px-4 pt-2 sm:px-5 md:px-7 md:pt-7 xl:px-8">
          <div
            className="sticky top-0 z-[80] -mx-4 mb-3 flex items-center justify-between gap-3 px-4 py-2 backdrop-blur-xl sm:-mx-5 sm:px-5 md:static md:mx-0 md:mb-5 md:px-0 md:py-0 md:backdrop-blur-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(248,247,244,0.98) 0%, rgba(248,247,244,0.92) 80%, rgba(248,247,244,0) 100%)",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/")}
              className="sh-tap inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-sm"
              style={{
                backgroundColor: "rgba(255,255,255,0.94)",
                borderColor: T.border,
                color: T.navy,
              }}
            >
              <ArrowLeft size={18} />
              Feed
            </button>

            <button
              type="button"
              onClick={publishPost}
              disabled={!canPublish || isSubmitting}
              className="sh-tap hidden h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-sm disabled:cursor-not-allowed disabled:opacity-100 md:inline-flex"
              style={{
                backgroundColor: canPublish && !isSubmitting ? "#B31942" : "#E5EAF1",
                borderColor: canPublish && !isSubmitting ? "rgba(179,25,66,0.22)" : "#D5E2F2",
                color: canPublish && !isSubmitting ? "#FFFFFF" : "#7A8491",
                boxShadow:
                  canPublish && !isSubmitting
                    ? "0 12px 26px rgba(179,25,66,0.2)"
                    : "0 8px 18px rgba(11,28,44,0.06)",
              }}
            >
              <Send size={16} />
              {isSubmitting ? "Publishing…" : "Publish post"}
            </button>
          </div>

          <section
            className="flex-1 rounded-[28px] border p-2.5 shadow-sm md:rounded-[34px] md:p-4"
            style={{
              backgroundColor: "rgba(255,255,255,0.78)",
              borderColor: "rgba(213,226,242,0.95)",
              boxShadow: "0 18px 46px rgba(11,28,44,0.08)",
            }}
          >
            <PostComposer startOpen pageMode />
          </section>
        </div>

        <style jsx global>{`
          @media (max-width: 520px) {
            main section > div.relative.flex.flex-col {
              border-radius: 24px !important;
              padding: 13px !important;
              box-shadow: 0 10px 28px rgba(11, 28, 44, 0.06) !important;
            }

            button[aria-label="Close post composer"] {
              display: flex !important;
              right: 12px !important;
              top: 12px !important;
              z-index: 30 !important;
              width: 38px !important;
              height: 38px !important;
              border-radius: 999px !important;
              background: rgba(255, 255, 255, 0.96) !important;
              box-shadow: 0 10px 24px rgba(11, 28, 44, 0.12) !important;
            }

            button[aria-label="Close post composer"] + div {
              padding-right: 46px !important;
            }

            [aria-label="Post formatting toolbar"] {
              border-radius: 18px !important;
              padding: 7px !important;
            }

            [aria-label="Post formatting toolbar"] > div {
              display: grid !important;
              grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
              gap: 6px !important;
              width: 100% !important;
            }

            [aria-label="Post formatting toolbar"] button {
              height: 38px !important;
              justify-content: center !important;
              padding-left: 6px !important;
              padding-right: 6px !important;
              border-radius: 999px !important;
              font-size: 11px !important;
            }

            div[contenteditable="true"][aria-label="Write your SoldierHub post"] {
              min-height: 170px !important;
              max-height: none !important;
              overflow-y: visible !important;
              font-size: 17px !important;
              line-height: 1.72 !important;
              padding-bottom: 8px !important;
              -webkit-user-select: text !important;
              user-select: text !important;
              touch-action: manipulation !important;
            }

            div[contenteditable="true"][aria-label="Write your SoldierHub post"] + * {
              font-size: 17px !important;
            }

            img[alt="Selected post preview"] {
              width: 100% !important;
              max-height: 54vh !important;
              object-fit: contain !important;
              background: #eef3f8 !important;
            }

            img[alt="Selected post preview"]:where([style]) {
              aspect-ratio: auto !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] {
              bottom: max(0.55rem, env(safe-area-inset-bottom)) !important;
              margin-top: 0.85rem !important;
              padding: 9px !important;
              border-radius: 22px !important;
              background: rgba(248, 250, 253, 0.985) !important;
              box-shadow: 0 14px 34px rgba(11, 28, 44, 0.14) !important;
              backdrop-filter: blur(18px);
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div {
              display: grid !important;
              grid-template-columns: 1fr !important;
              align-items: stretch !important;
              gap: 8px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div > button:first-child {
              width: 100% !important;
              min-width: 0 !important;
              height: 48px !important;
              border: 1px solid rgba(207, 218, 232, 0.95) !important;
              border-radius: 16px !important;
              padding: 7px 10px !important;
              background: linear-gradient(180deg, #ffffff 0%, #f4f8fd 100%) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div > button:first-child > span:first-child {
              max-width: none !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              font-size: 13px !important;
              line-height: 1.1 !important;
              font-weight: 850 !important;
              letter-spacing: -0.01em !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div > div {
              display: grid !important;
              grid-template-columns: minmax(78px, 0.86fr) minmax(70px, 0.74fr) minmax(118px, 1.4fr) !important;
              gap: 8px !important;
              min-width: 0 !important;
              width: 100% !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div > div > button {
              height: 50px !important;
              border-radius: 16px !important;
              min-width: 0 !important;
              justify-content: center !important;
              font-weight: 900 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div > div > button:first-child {
              width: 100% !important;
              padding-left: 8px !important;
              padding-right: 8px !important;
              background: #ffffff !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div > div > button:first-child span {
              display: inline !important;
              font-size: 12px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div > div > button:nth-child(2) {
              display: inline-flex !important;
              padding-left: 8px !important;
              padding-right: 8px !important;
              background: #ffffff !important;
              color: #465669 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"] > div > div > button:last-child {
              width: 100% !important;
              padding-left: 10px !important;
              padding-right: 10px !important;
              font-size: 13px !important;
              letter-spacing: -0.01em !important;
            }
          }

          @media (min-width: 768px) {
            img[alt="Selected post preview"] {
              max-height: 360px !important;
              object-fit: contain !important;
              background: #eef3f8 !important;
            }

            img[alt="Selected post preview"]:where([style]) {
              aspect-ratio: auto !important;
            }
          }
        `}</style>
      </main>
    </AppShell>
  );
}
