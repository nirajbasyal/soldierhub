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
        className="min-h-[100dvh] overflow-x-hidden pb-28 md:pb-10"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.95) 0%, rgba(234,240,248,0.92) 34%, rgba(248,247,244,0.96) 100%)",
        }}
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-3 pt-2 md:px-6 md:pt-7">
          <div
            className="sticky top-0 z-[90] -mx-3 mb-3 flex items-center justify-between gap-3 px-3 py-2 backdrop-blur-xl md:static md:mx-0 md:mb-5 md:px-0 md:py-0 md:backdrop-blur-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(234,240,248,0.98) 0%, rgba(234,240,248,0.94) 82%, rgba(234,240,248,0) 100%)",
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

            <div
              className="inline-flex h-11 items-center rounded-full border px-4 text-sm font-extrabold shadow-sm md:hidden"
              style={{
                backgroundColor: T.redBg,
                borderColor: "rgba(179,25,66,0.16)",
                color: T.red,
                boxShadow: "0 10px 22px rgba(179,25,66,0.09)",
              }}
            >
              Be kind
            </div>

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

        <style>{`
          @media (max-width: 520px) {
            div[class*="sticky"][class*="bottom-2"][class*="z-40"][class*="rounded-[22px]"] {
              bottom: max(0.6rem, env(safe-area-inset-bottom)) !important;
              margin-top: 0.65rem !important;
              padding: 0.48rem 0.5rem !important;
              border-radius: 22px !important;
              background: rgba(248, 250, 253, 0.98) !important;
              box-shadow: 0 16px 34px rgba(11, 28, 44, 0.14) !important;
              backdrop-filter: blur(18px);
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"][class*="rounded-[22px]"] > div {
              display: flex !important;
              align-items: center !important;
              gap: 0.42rem !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"][class*="rounded-[22px]"] > div > button:first-child {
              flex: 0 0 88px !important;
              min-width: 88px !important;
              max-width: 88px !important;
              min-height: 46px !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 0.22rem !important;
              padding: 0.2rem 0.25rem !important;
              border-radius: 18px !important;
              background: rgba(238, 243, 247, 0.72) !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"][class*="rounded-[22px]"] > div > button:first-child > span:first-child {
              max-width: 78px !important;
              white-space: normal !important;
              overflow: visible !important;
              text-align: center !important;
              font-size: 9.5px !important;
              font-weight: 500 !important;
              line-height: 1.05 !important;
              letter-spacing: 0 !important;
              color: #314a66 !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"][class*="rounded-[22px]"] > div > button:first-child > span:nth-child(2) {
              width: 48px !important;
              height: 26px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"][class*="rounded-[22px]"] > div > div {
              flex: 1 1 auto !important;
              min-width: 0 !important;
              display: flex !important;
              gap: 0.38rem !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"][class*="rounded-[22px]"] > div > div > button:first-child {
              height: 44px !important;
              min-width: 58px !important;
              padding-left: 0.72rem !important;
              padding-right: 0.72rem !important;
              font-size: 11px !important;
            }

            div[class*="sticky"][class*="bottom-2"][class*="z-40"][class*="rounded-[22px]"] > div > div > button:last-child {
              flex: 1 1 auto !important;
              height: 44px !important;
              min-width: 92px !important;
              padding-left: 0.9rem !important;
              padding-right: 0.9rem !important;
              font-size: 12px !important;
            }
          }
        `}</style>
      </main>
    </AppShell>
  );
}
