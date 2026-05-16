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

            <button
              type="button"
              onClick={publishPost}
              disabled={!canPublish || isSubmitting}
              className="sh-tap inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-sm disabled:cursor-not-allowed disabled:opacity-100"
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
      </main>
    </AppShell>
  );
}
