"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Footer from "@/components/layout/Footer";

function PendingReviewContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuthModal, isLiveMode } = useApp();

  const supabase = createClient();

  const queryEmail = params.get("email") || "";
  const queryName = params.get("name") || "";
  const foundFromUrl = params.get("found") === "1";

  const [checking, setChecking] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(queryEmail);
  const [currentName, setCurrentName] = useState(queryName);
  const [hasUserSession, setHasUserSession] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        if (!supabase) {
          setChecking(false);
          return;
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          setHasUserSession(false);
          setEmailVerified(false);
          setCurrentEmail(queryEmail);
          setCurrentName(queryName);
          setChecking(false);
          return;
        }

        setHasUserSession(true);
        setCurrentEmail(user.email || queryEmail);
        setCurrentName(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            queryName
        );

        setEmailVerified(Boolean(user.email_confirmed_at || user.confirmed_at));
      } catch (error) {
        console.error("Pending review check failed:", error);
      } finally {
        setChecking(false);
      }
    };

    checkUserStatus();
  }, [supabase, queryEmail, queryName]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      if (supabase) {
        await supabase.auth.signOut();
      }

      router.replace("/");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleResendConfirmation = async () => {
    try {
      if (!supabase) {
        setResendMessage("Supabase is not configured yet.");
        return;
      }

      if (!currentEmail) {
        setResendMessage("Email address was not found. Please sign up again.");
        return;
      }

      setResending(true);
      setResendMessage("");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: currentEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/pending-review?found=1&email=${encodeURIComponent(
            currentEmail
          )}`,
        },
      });

      if (error) {
        setResendMessage(error.message);
        return;
      }

      setResendMessage("Confirmation email sent again. Please check your inbox.");
    } catch (error) {
      console.error("Resend confirmation failed:", error);
      setResendMessage("Unable to resend confirmation email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const found = foundFromUrl || hasUserSession;

  if (checking) {
    return (
      <main className="min-h-screen flex flex-col" style={{ backgroundColor: T.bg }}>
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div
            className="w-full max-w-md rounded-2xl border p-7 md:p-8 text-center"
            style={{ backgroundColor: T.card, borderColor: T.border }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: T.goldBg }}
            >
              <Clock size={28} style={{ color: T.gold }} strokeWidth={2} />
            </div>

            <h1 className="text-2xl leading-tight mb-2 font-serif" style={{ color: T.navy }}>
              Checking your account
            </h1>

            <p className="text-sm" style={{ color: T.textMuted }}>
              Please wait while SoldierHub checks your review status.
            </p>
          </div>
        </div>

        <Footer />
      </main>
    );
  }

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
              emailVerified ? (
                <CheckCircle2 size={30} style={{ color: T.gold }} strokeWidth={2} />
              ) : (
                <Mail size={28} style={{ color: T.gold }} strokeWidth={2} />
              )
            ) : (
              <ShieldAlert size={28} style={{ color: T.red }} strokeWidth={2} />
            )}
          </div>

          <div
            className="text-xs font-medium tracking-wider uppercase mb-1"
            style={{ color: T.gold }}
          >
            <Sparkles size={12} className="inline mr-1 -mt-0.5" />
            SoldierHub
          </div>

          <h1 className="text-3xl leading-tight mb-3 font-serif" style={{ color: T.navy }}>
            {found
              ? emailVerified
                ? "Email verified. Admin review pending"
                : "Verify your email"
              : "We couldn't find that account"}
          </h1>

          {found ? (
            <>
              {currentName ? (
                <p className="text-sm mb-4" style={{ color: T.textMuted }}>
                  Thanks for joining,{" "}
                  <span style={{ color: T.text, fontWeight: 600 }}>{currentName}</span>.
                </p>
              ) : null}

              <div className="mt-5 space-y-3 text-left">
                <div
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: emailVerified ? T.goldBg : T.surface,
                    borderColor: emailVerified ? T.gold : T.border,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {emailVerified ? (
                      <CheckCircle2
                        size={20}
                        style={{ color: T.gold }}
                        className="mt-0.5 shrink-0"
                      />
                    ) : (
                      <Mail
                        size={20}
                        style={{ color: T.gold }}
                        className="mt-0.5 shrink-0"
                      />
                    )}

                    <div>
                      <p className="text-sm font-semibold" style={{ color: T.navy }}>
                        Step 1:{" "}
                        {emailVerified
                          ? "Your email has been verified"
                          : "Verify your email"}
                      </p>

                      <p className="text-xs leading-relaxed mt-1" style={{ color: T.textMuted }}>
                        {emailVerified
                          ? "Your email address has been successfully confirmed."
                          : "Please check your inbox and click the confirmation link sent to your email address."}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: T.surface,
                    borderColor: T.border,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Clock
                      size={20}
                      style={{ color: T.gold }}
                      className="mt-0.5 shrink-0"
                    />

                    <div>
                      <p className="text-sm font-semibold" style={{ color: T.navy }}>
                        Step 2: Wait for admin verification
                      </p>

                      <p className="text-xs leading-relaxed mt-1" style={{ color: T.textMuted }}>
                        {emailVerified
                          ? "Your SoldierHub profile is now waiting for admin review. Thank you for your patience. You will be able to post, comment, message, and sell once your account is approved."
                          : "After your email is verified, an admin will review your SoldierHub profile. Posting, commenting, messaging, and selling will unlock after approval."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {currentEmail && (
                <div
                  className="mt-4 px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-2"
                  style={{ backgroundColor: T.surface, color: T.textMuted }}
                >
                  <Mail size={13} /> {currentEmail}
                </div>
              )}

              {resendMessage && (
                <p className="mt-3 text-xs leading-relaxed" style={{ color: T.textMuted }}>
                  {resendMessage}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-2">
                {!emailVerified && isLiveMode && (
                  <Button
                    variant="primary"
                    icon={RefreshCw}
                    onClick={handleResendConfirmation}
                    disabled={resending}
                  >
                    {resending ? "Sending..." : "Resend confirmation email"}
                  </Button>
                )}

                <Button
                  variant={emailVerified ? "primary" : "ghost"}
                  icon={ArrowLeft}
                  onClick={() => router.push("/")}
                >
                  Browse the feed
                </Button>

                {emailVerified && (
                  <Button
                    variant="ghost"
                    icon={LogOut}
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    {loggingOut ? "Logging out..." : "Log out"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
                No review request was found for{" "}
                {currentEmail ? (
                  <span style={{ color: T.text, fontWeight: 600 }}>{currentEmail}</span>
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