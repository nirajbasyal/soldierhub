"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/composer/PostComposer";

const COMPOSE_SUBMIT_EVENT = "soldierhub-compose-submit";
const COMPOSE_STATE_EVENT = "soldierhub-compose-state";

export default function ComposePage() {
  const router = useRouter();
  const [composerState, setComposerState] = useState({ canPublish: false, submitting: false });

  useEffect(() => {
    // The previous full-screen expanded editor used browser contentEditable + execCommand.
    // It is intentionally disabled so the compose page uses one editor system only: TipTap.
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleComposerState = (event) => {
      setComposerState({
        canPublish: Boolean(event?.detail?.canPublish),
        submitting: Boolean(event?.detail?.submitting),
      });
    };

    window.addEventListener(COMPOSE_STATE_EVENT, handleComposerState);
    return () => window.removeEventListener(COMPOSE_STATE_EVENT, handleComposerState);
  }, []);

  const publishPost = () => {
    if (typeof window === "undefined" || composerState.submitting || !composerState.canPublish) return;
    window.dispatchEvent(new CustomEvent(COMPOSE_SUBMIT_EVENT));
  };

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

            <button
              type="button"
              onClick={publishPost}
              disabled={!composerState.canPublish || composerState.submitting}
              className="sh-tap inline-flex h-10 min-w-[104px] shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-extrabold text-white shadow-sm transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 md:h-11 md:min-w-[132px] md:px-4 md:text-base"
              style={{ backgroundColor: "#B31942", boxShadow: "0 14px 28px rgba(179,25,66,0.18)" }}
              aria-label="Publish post"
            >
              {composerState.submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {composerState.submitting ? "Posting" : "Publish"}
            </button>
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
