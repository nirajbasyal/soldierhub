"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Footer from "@/components/layout/Footer";

const ADMIN_CONTACT_EMAIL = "niraj.basyal2054@gmail.com";

function PendingReviewContent() {
  const router = useRouter();
  const params = useSearchParams();

  const { setAuthModal, isLiveMode, requestRereview } = useApp();

  const supabase = createClient();

  const queryEmail = params.get("email") || "";
  const queryName = params.get("name") || "";
  const foundFromUrl = params.get("found") === "1";
  const statusFromUrl = params.get("status") || "pending";

  const [checking, setChecking] = useState(true);
  const [profileStatus, setProfileStatus] = useState(statusFromUrl);
  const [emailVerified, setEmailVerified] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(queryEmail);
  const [currentName, setCurrentName] = useState(queryName);
  const [hasUserSession, setHasUserSession] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const [rereviewPhone, setRereviewPhone] = useState("");
  const [rereviewing, setRereviewing] = useState(false);
  const [rereviewMessage, setRereviewMessage] = useState("");

  const isRejected = profileStatus === "rejected";
  const isRevoked = profileStatus === "revoked";
  const isApproved = profileStatus === "verified";
  const isAccessBlocked = isRejected || isRevoked;

  const phoneInvalid =
    rereviewPhone.trim().length > 0 && rereviewPhone.trim().length !== 10;

  const safeSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setHasUserSession(false);
    setEmailVerified(false);
  };

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        setProfileStatus(statusFromUrl || "pending");

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

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, personal_email, full_name, phone, status, verification_status")
          .eq("id", user.id)
          .maybeSingle();

        const liveStatus =
          profile?.status ||
          profile?.verification_status ||
          statusFromUrl ||
          "pending";

        const profileEmail =
          profile?.email || profile?.personal_email || user.email || queryEmail;

        const profileName =
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          queryName;

        setProfileStatus(liveStatus);
        setCurrentEmail(profileEmail);
        setCurrentName(profileName);
        setRereviewPhone(profile?.phone || "");
        setHasUserSession(true);
        setEmailVerified(Boolean(user.email_confirmed_at || user.confirmed_at));

        if (liveStatus !== statusFromUrl) {
          router.replace(
            `/pending-review?email=${encodeURIComponent(
              profileEmail || ""
            )}&name=${encodeURIComponent(
              profileName || ""
            )}&found=1&status=${encodeURIComponent(liveStatus)}`
          );
        }
      } catch (error) {
        console.error("Pending review check failed:", error);
      } finally {
        setChecking(false);
      }
    };

    checkUserStatus();
  }, [supabase, queryEmail, queryName, statusFromUrl, router]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await safeSignOut();
      router.replace("/");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleBackToFeed = async () => {
    try {
      if (isAccessBlocked) {
        await safeSignOut();
      }

      router.replace("/");
    } catch (error) {
      console.error("Back to feed failed:", error);
      router.replace("/");
    }
  };

  const handleRequestRereview = async () => {
    try {
      setRereviewMessage("");

      if (!hasUserSession) {
        setRereviewMessage(
          "Please sign in with this same account first, then request re-review."
        );
        setAuthModal("login");
        return;
      }

      const cleanPhone = rereviewPhone.trim();

      if (cleanPhone && cleanPhone.length !== 10) {
        setRereviewMessage("Please enter a valid 10-digit phone number.");
        return;
      }

      setRereviewing(true);

      const result = await requestRereview({
        phone: cleanPhone,
      });

      if (result?.ok === false) {
        setRereviewMessage(
          result.error || "Could not request re-review. Please contact admin."
        );
        return;
      }

      setProfileStatus("pending");
      setRereviewMessage(
        "Re-review request submitted. Your profile is pending admin review again."
      );

      router.replace(
        `/pending-review?email=${encodeURIComponent(
          currentEmail || ""
        )}&name=${encodeURIComponent(
          currentName || ""
        )}&found=1&status=pending`
      );
    } catch (error) {
      console.error("Request re-review failed:", error);
      setRereviewMessage("Could not request re-review. Please contact admin.");
    } finally {
      setRereviewing(false);
    }
  };

  const handleContactAdmin = () => {
    const subject = encodeURIComponent("SoldierHub account access request");
    const body = encodeURIComponent(
      `Hello,\n\nI need help with my SoldierHub account.\n\nEmail: ${
        currentEmail || ""
      }\nName: ${currentName || ""}\nStatus: ${
        profileStatus || ""
      }\n\nThank you.`
    );

    window.location.href = `mailto:${ADMIN_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const handleResendConfirmation = async () => {
    try {
      if (!supabase) {
        setResendMessage("Supabase is not configured yet.");
        return;
      }

      if (!currentEmail) {
        setResendMessage("Email address was not found. Please sign in again.");
        return;
      }

      setResending(true);
      setResendMessage("");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: currentEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/pending-review?found=1&status=pending&email=${encodeURIComponent(
            currentEmail
          )}&name=${encodeURIComponent(currentName || "")}`,
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

  const found = foundFromUrl || hasUserSession || isAccessBlocked;

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
            style={{
              backgroundColor: isAccessBlocked || !found ? T.redBg : T.goldBg,
            }}
          >
            {isAccessBlocked || !found ? (
              <ShieldAlert size={28} style={{ color: T.red }} strokeWidth={2} />
            ) : isApproved ? (
              <CheckCircle2 size={30} style={{ color: T.gold }} strokeWidth={2} />
            ) : emailVerified ? (
              <CheckCircle2 size={30} style={{ color: T.gold }} strokeWidth={2} />
            ) : (
              <Mail size={28} style={{ color: T.gold }} strokeWidth={2} />
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
            {isRejected
              ? "Profile verification not approved"
              : isRevoked
              ? "Account access removed"
              : found
              ? isApproved
                ? "Account approved"
                : emailVerified
                ? "Email verified. Admin review pending"
                : "Verify your email"
              : "We couldn't find that account"}
          </h1>

          {isAccessBlocked ? (
            <>
              {currentName ? (
                <p className="text-sm mb-4" style={{ color: T.textMuted }}>
                  Account name:{" "}
                  <span style={{ color: T.text, fontWeight: 600 }}>{currentName}</span>
                </p>
              ) : null}

              <div
                className="mt-5 rounded-xl border p-4 text-left"
                style={{
                  backgroundColor: T.redBg,
                  borderColor: T.red,
                }}
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    size={20}
                    style={{ color: T.red }}
                    className="mt-0.5 shrink-0"
                  />

                  <div>
                    <p className="text-sm font-semibold" style={{ color: T.navy }}>
                      {isRejected
                        ? "Admin did not approve this profile during verification."
                        : "For security reasons, admin removed access to this profile."}
                    </p>

                    <p className="text-xs leading-relaxed mt-2" style={{ color: T.textMuted }}>
                      You can request another review using the same account. Add or update your phone number if you want admin to have another way to verify your account, or contact admin for help.
                    </p>

                    <p className="text-xs leading-relaxed mt-2" style={{ color: T.textMuted }}>
                      Admin contact:{" "}
                      <span style={{ color: T.text, fontWeight: 600 }}>
                        {ADMIN_CONTACT_EMAIL}
                      </span>
                    </p>
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

              <div className="mt-5 rounded-xl border p-4 text-left" style={{ borderColor: T.border }}>
                <p className="text-sm font-semibold mb-2" style={{ color: T.navy }}>
                  Request re-review
                </p>

                <p className="text-xs leading-relaxed mb-3" style={{ color: T.textMuted }}>
                  Add or update optional information below. This will move your account back to
                  pending admin review.
                </p>

                <label className="block">
                  <span className="block text-xs font-medium mb-1.5" style={{ color: T.textMuted }}>
                    Phone number optional
                  </span>

                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: phoneInvalid ? T.red : T.textSubtle }}
                    >
                      <Phone size={16} />
                    </span>

                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={rereviewPhone}
                      onChange={(e) => {
                        const numbersOnly = e.target.value.replace(/\D/g, "");
                        setRereviewPhone(numbersOnly);
                      }}
                      placeholder="9151234567"
                      className="w-full h-11 rounded-xl border text-sm outline-none pl-10 pr-3"
                      style={{
                        backgroundColor: T.card,
                        borderColor: phoneInvalid ? T.red : T.border,
                        color: T.text,
                      }}
                    />
                  </div>

                  {phoneInvalid && (
                    <p className="mt-1 text-xs font-medium" style={{ color: T.red }}>
                      Please enter a valid 10-digit phone number.
                    </p>
                  )}
                </label>

                {rereviewMessage && (
                  <p className="mt-3 text-xs leading-relaxed" style={{ color: T.textMuted }}>
                    {rereviewMessage}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <Button
                  variant="primary"
                  icon={RefreshCw}
                  onClick={handleRequestRereview}
                  disabled={rereviewing || phoneInvalid}
                >
                  {rereviewing ? "Submitting..." : "Request re-review"}
                </Button>

                <Button variant="ghost" icon={Mail} onClick={handleContactAdmin}>
                  Contact admin
                </Button>

                <Button variant="ghost" icon={ArrowLeft} onClick={handleBackToFeed}>
                  Back to feed
                </Button>
              </div>
            </>
          ) : found ? (
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
                        {emailVerified ? "Your email has been verified" : "Verify your email"}
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
                    backgroundColor: isApproved ? T.goldBg : T.surface,
                    borderColor: isApproved ? T.gold : T.border,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {isApproved ? (
                      <CheckCircle2
                        size={20}
                        style={{ color: T.gold }}
                        className="mt-0.5 shrink-0"
                      />
                    ) : (
                      <Clock
                        size={20}
                        style={{ color: T.gold }}
                        className="mt-0.5 shrink-0"
                      />
                    )}

                    <div>
                      <p className="text-sm font-semibold" style={{ color: T.navy }}>
                        Step 2:{" "}
                        {isApproved
                          ? "Admin verification approved"
                          : "Wait for admin verification"}
                      </p>

                      <p className="text-xs leading-relaxed mt-1" style={{ color: T.textMuted }}>
                        {isApproved
                          ? "Your SoldierHub account has been approved. You can now browse the feed and use verified member features."
                          : emailVerified
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
                  variant={emailVerified || isApproved ? "primary" : "ghost"}
                  icon={ArrowLeft}
                  onClick={() => router.push("/")}
                >
                  Browse the feed
                </Button>

                {emailVerified && !isApproved && (
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
                . Please sign in with your existing account or contact admin.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <Button variant="primary" icon={Mail} onClick={() => setAuthModal("login")}>
                  Sign in
                </Button>

                <Button variant="ghost" icon={Mail} onClick={handleContactAdmin}>
                  Contact admin
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
