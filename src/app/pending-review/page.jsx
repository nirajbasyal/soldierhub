"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, Mail, ShieldAlert, Sparkles, UserPlus } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Button from "@/components/ui/Button";
import Footer from "@/components/layout/Footer";

function PendingReviewContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuthModal, isLiveMode } = useApp();

  const email = params.get("email") || "";
  const name = params.get("name") || "";
  const found = params.get("found") === "1";

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: T.bg }}>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-md rounded-2xl border p-7 md:p-8 text-center"
          style={{ backgroundColor: T.card, borderColor: T.border }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: found ? T.goldBg : T.redBg }}
          >
            {found ? (
              <Clock size={28} style={{ color: T.gold }} strokeWidth={2} />
            ) : (
              <ShieldAlert size={28} style={{ color: T.red }} strokeWidth={2} />
            )}
          </div>

          <div
            className="text-xs font-medium tracking-wider uppercase mb-1"
            style={{ color: T.gold }}
          >
            <Sparkles size={12} className="inline mr-1 -mt-0.5" />
            Soldier Hub
          </div>
          <h1 className="text-3xl leading-tight mb-3 font-serif" style={{ color: T.navy }}>
            {found ? "Profile pending review" : "We couldn't find that account"}
          </h1>

          {found ? (
            <>
              <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
                {name ? (
                  <>
                    Thanks for joining,{" "}
                    <span style={{ color: T.text, fontWeight: 600 }}>{name}</span>.{" "}
                  </>
                ) : null}
                {isLiveMode ? (
                  <>
                    Check your email to confirm your address, then an admin will
                    review your profile shortly. You&apos;ll be able to post and
                    reply once verified.
                  </>
                ) : (
                  <>
                    An admin will review your profile shortly. You&apos;ll be
                    able to post and reply once verified.
                  </>
                )}
              </p>
              {email && (
                <div
                  className="mt-4 px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-2"
                  style={{ backgroundColor: T.surface, color: T.textMuted }}
                >
                  <Mail size={13} /> {email}
                </div>
              )}
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  variant="primary"
                  icon={ArrowLeft}
                  onClick={() => router.push("/")}
                >
                  Browse the feed
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
                No review request was found for{" "}
                {email ? (
                  <span style={{ color: T.text, fontWeight: 600 }}>{email}</span>
                ) : (
                  "that email"
                )}
                . You can sign up to submit your profile for review.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  variant="primary"
                  icon={UserPlus}
                  onClick={() => setAuthModal("signup")}
                >
                  Sign up instead
                </Button>
                <Button variant="ghost" onClick={() => router.push("/")}>
                  Back to feed
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function PendingReviewPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen" style={{ backgroundColor: T.bg }} />}
    >
      <PendingReviewContent />
    </Suspense>
  );
}
