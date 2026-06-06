"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, LogOut, Mail, Phone, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Footer from "@/components/layout/Footer";

const ADMIN_CONTACT_EMAIL = "support@soldierhub.com";

function StatusIcon({ type = "pending" }) {
  const isDanger = type === "danger";
  const isSuccess = type === "success";
  const Icon = isDanger ? ShieldAlert : isSuccess ? CheckCircle2 : type === "mail" ? Mail : Clock;

  return (
    <div
      className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border sm:h-16 sm:w-16"
      style={{
        backgroundColor: isDanger ? "#FFF1F4" : isSuccess ? "#EEF7F2" : "#EEF4FB",
        borderColor: isDanger ? "rgba(179,25,66,0.18)" : isSuccess ? "rgba(34,120,83,0.16)" : "rgba(63,95,125,0.18)",
      }}
    >
      <Icon size={28} strokeWidth={2.25} style={{ color: isDanger ? T.red : isSuccess ? "#227853" : T.navy }} />
    </div>
  );
}

function StepCard({ icon: Icon, title, body, tone = "neutral" }) {
  const isSuccess = tone === "success";
  const isDanger = tone === "danger";

  return (
    <div
      className="rounded-2xl border p-4 text-left sm:p-5"
      style={{
        backgroundColor: isDanger ? "#FFF6F8" : isSuccess ? "#F2F8F5" : "#F7FAFD",
        borderColor: isDanger ? "rgba(179,25,66,0.22)" : isSuccess ? "rgba(34,120,83,0.2)" : "rgba(63,95,125,0.18)",
      }}
    >
      <div className="flex gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          style={{
            backgroundColor: "rgba(255,255,255,0.78)",
            borderColor: isDanger ? "rgba(179,25,66,0.18)" : isSuccess ? "rgba(34,120,83,0.18)" : "rgba(63,95,125,0.18)",
            color: isDanger ? T.red : isSuccess ? "#227853" : T.navy,
          }}
        >
          <Icon size={18} strokeWidth={2.35} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-snug" style={{ color: T.text }}>{title}</p>
          <p className="mt-1.5 text-[13px] leading-6 sm:text-sm" style={{ color: T.textMuted }}>{body}</p>
        </div>
      </div>
    </div>
  );
}

function EmailBadge({ email }) {
  if (!email) return null;
  return (
    <div
      className="mt-4 flex min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm"
      style={{ backgroundColor: "#F3F7FB", borderColor: "rgba(63,95,125,0.12)", color: T.textMuted }}
    >
      <Mail size={15} className="shrink-0" />
      <span className="min-w-0 truncate">{email}</span>
    </div>
  );
}

function LoadingCard() {
  return (
    <main className="flex min-h-screen flex-col" style={{ backgroundColor: "#EAF2FA" }}>
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <section className="w-full max-w-[520px] rounded-[28px] border px-5 py-8 text-center shadow-sm sm:px-8" style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: "rgba(63,95,125,0.16)" }}>
          <StatusIcon type="pending" />
          <h1 className="mt-5 text-3xl font-black tracking-[-0.03em]" style={{ color: T.navy }}>Checking your account</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: T.textMuted }}>Please wait while Soldier Hub checks your review status.</p>
        </section>
      </div>
      <Footer />
    </main>
  );
}

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
  const phoneInvalid = rereviewPhone.trim().length > 0 && rereviewPhone.trim().length !== 10;

  const safeSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setHasUserSession(false);
    setEmailVerified(false);
  };

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        setProfileStatus(statusFromUrl || "pending");
        if (!supabase) return;

        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setHasUserSession(false);
          setEmailVerified(false);
          setCurrentEmail(queryEmail);
          setCurrentName(queryName);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, personal_email, full_name, phone, verification_status")
          .eq("id", user.id)
          .maybeSingle();

        const liveStatus = profile?.verification_status || statusFromUrl || "pending";
        const profileEmail = profile?.email || profile?.personal_email || user.email || queryEmail;
        const profileName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || queryName;

        setProfileStatus(liveStatus);
        setCurrentEmail(profileEmail);
        setCurrentName(profileName);
        setRereviewPhone(profile?.phone || "");
        setHasUserSession(true);
        setEmailVerified(Boolean(user.email_confirmed_at || user.confirmed_at));

        if (liveStatus !== statusFromUrl) {
          router.replace(`/pending-review?email=${encodeURIComponent(profileEmail || "")}&name=${encodeURIComponent(profileName || "")}&found=1&status=${encodeURIComponent(liveStatus)}`);
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
      if (isAccessBlocked) await safeSignOut();
      router.replace("/");
    } catch {
      router.replace("/");
    }
  };

  const handleRequestRereview = async () => {
    try {
      setRereviewMessage("");
      if (!hasUserSession) {
        setRereviewMessage("Please sign in with this same account first, then request re-review.");
        setAuthModal("login");
        return;
      }
      const cleanPhone = rereviewPhone.trim();
      if (cleanPhone && cleanPhone.length !== 10) {
        setRereviewMessage("Please enter a valid 10-digit phone number.");
        return;
      }
      setRereviewing(true);
      const result = await requestRereview({ phone: cleanPhone });
      if (result?.ok === false) {
        setRereviewMessage(result.error || "Could not request re-review. Please contact admin.");
        return;
      }
      setProfileStatus("pending");
      setRereviewMessage("Re-review request submitted. Your profile is pending admin review again.");
      router.replace(`/pending-review?email=${encodeURIComponent(currentEmail || "")}&name=${encodeURIComponent(currentName || "")}&found=1&status=pending`);
    } catch (error) {
      console.error("Request re-review failed:", error);
      setRereviewMessage("Could not request re-review. Please contact admin.");
    } finally {
      setRereviewing(false);
    }
  };

  const handleContactAdmin = () => {
    const subject = encodeURIComponent("Soldier Hub account access request");
    const body = encodeURIComponent(`Hello,\n\nI need help with my Soldier Hub account.\n\nEmail: ${currentEmail || ""}\nName: ${currentName || ""}\nStatus: ${profileStatus || ""}\n\nThank you.`);
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
          emailRedirectTo: `${window.location.origin}/pending-review?found=1&status=pending&email=${encodeURIComponent(currentEmail)}&name=${encodeURIComponent(currentName || "")}`,
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
  if (checking) return <LoadingCard />;

  const title = isRejected ? "Profile not approved" : isRevoked ? "Access removed" : found ? isApproved ? "Account approved" : emailVerified ? "Email verified. Review pending" : "Verify your email" : "Account not found";
  const subtitle = isAccessBlocked ? "You can request another review or contact admin for help." : found ? isApproved ? "Your Soldier Hub account is ready." : emailVerified ? "Your profile is waiting for admin review." : "One more step before admin review starts." : "Please sign in with your existing account or contact admin.";

  return (
    <main className="flex min-h-screen flex-col" style={{ backgroundColor: "#EAF2FA" }}>
      <div className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-10">
        <section className="w-full max-w-[560px] rounded-[30px] border px-5 py-7 text-center shadow-sm sm:px-8 sm:py-9" style={{ backgroundColor: "rgba(255,255,255,0.97)", borderColor: "rgba(63,95,125,0.16)" }}>
          <StatusIcon type={isAccessBlocked || !found ? "danger" : isApproved || emailVerified ? "success" : "mail"} />
          <div className="mt-5 text-xs font-black tracking-[0.18em]" style={{ color: T.navy }}><Sparkles size={13} className="mr-1 inline -mt-0.5" />Soldier Hub</div>
          <h1 className="mx-auto mt-3 max-w-[430px] text-[34px] font-black leading-[1.05] tracking-[-0.045em] sm:text-[42px]" style={{ color: T.navy }}>{title}</h1>
          <p className="mx-auto mt-3 max-w-[430px] text-[15px] leading-6" style={{ color: T.textMuted }}>{currentName ? <>Thanks for joining, <span className="font-extrabold" style={{ color: T.text }}>{currentName}</span>. {subtitle}</> : subtitle}</p>

          {isAccessBlocked ? (
            <>
              <div className="mt-6 space-y-3">
                <StepCard icon={ShieldAlert} tone="danger" title={isRejected ? "Admin did not approve this profile" : "Access was removed"} body={isRejected ? "This profile was not approved during verification. You may request another review using the same account." : "For security reasons, access to this profile was removed. You may contact admin or request another review."} />
                <StepCard icon={Mail} title="Need help?" body={`Contact the Soldier Hub admin team at ${ADMIN_CONTACT_EMAIL}. You may also add an optional phone number below if you would like to be contacted for additional verification before requesting re-review.`} />
              </div>
              <EmailBadge email={currentEmail} />
              <div className="mt-5 rounded-2xl border p-4 text-left sm:p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(63,95,125,0.18)" }}>
                <p className="text-[15px] font-extrabold" style={{ color: T.text }}>Request re-review</p>
                <p className="mt-1.5 text-[13px] leading-6" style={{ color: T.textMuted }}>Add optional information below. This will move your account back to pending admin review.</p>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-bold" style={{ color: T.textMuted }}>Phone number optional</span>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: phoneInvalid ? T.red : T.textSubtle }}><Phone size={17} /></span>
                    <input type="tel" inputMode="numeric" maxLength={10} value={rereviewPhone} onChange={(e) => setRereviewPhone(e.target.value.replace(/\D/g, ""))} placeholder="9151234567" className="h-12 w-full rounded-2xl border bg-white pl-11 pr-3 text-[16px] outline-none" style={{ borderColor: phoneInvalid ? T.red : "rgba(63,95,125,0.22)", color: T.text }} />
                  </div>
                  {phoneInvalid ? <p className="mt-1.5 text-xs font-semibold" style={{ color: T.red }}>Please enter a valid 10-digit phone number.</p> : null}
                </label>
                {rereviewMessage ? <p className="mt-3 text-xs leading-6" style={{ color: T.textMuted }}>{rereviewMessage}</p> : null}
              </div>
              <div className="mt-6 flex flex-col gap-2.5">
                <Button variant="primary" icon={RefreshCw} onClick={handleRequestRereview} disabled={rereviewing || phoneInvalid}>{rereviewing ? "Submitting..." : "Request re-review"}</Button>
                <Button variant="ghost" icon={Mail} onClick={handleContactAdmin}>Contact admin</Button>
                <Button variant="ghost" icon={ArrowLeft} onClick={handleBackToFeed}>Browse the feed</Button>
              </div>
            </>
          ) : found ? (
            <>
              <div className="mt-6 space-y-3">
                <StepCard icon={emailVerified ? CheckCircle2 : Mail} tone={emailVerified ? "success" : "neutral"} title={emailVerified ? "Step 1: Email verified" : "Step 1: Verify your email"} body={emailVerified ? "Your email address has been successfully confirmed." : "Please check your inbox and click the confirmation link sent to your email address."} />
                <StepCard icon={isApproved ? CheckCircle2 : Clock} tone={isApproved ? "success" : "neutral"} title={isApproved ? "Step 2: Admin verification approved" : "Step 2: Wait for admin verification"} body={isApproved ? "Your Soldier Hub account has been approved. You can now browse the feed and use verified member features." : emailVerified ? "Your Soldier Hub profile is waiting for admin review. Once approved, you will be able to post, comment, message, and use verified member features." : "After your email is verified, an admin will review your Soldier Hub profile. Posting, commenting, and messaging will unlock after approval."} />
              </div>
              <EmailBadge email={currentEmail} />
              {resendMessage ? <p className="mt-3 text-xs leading-6" style={{ color: T.textMuted }}>{resendMessage}</p> : null}
              <div className="mt-6 flex flex-col gap-2.5">
                {!emailVerified && isLiveMode ? <Button variant="primary" icon={RefreshCw} onClick={handleResendConfirmation} disabled={resending}>{resending ? "Sending..." : "Resend confirmation email"}</Button> : null}
                <Button variant={emailVerified || isApproved ? "primary" : "ghost"} icon={ArrowLeft} onClick={() => router.push("/")}>Browse the feed</Button>
                {emailVerified && !isApproved ? <Button variant="ghost" icon={LogOut} onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Logging out..." : "Log out"}</Button> : null}
              </div>
            </>
          ) : (
            <>
              <EmailBadge email={currentEmail} />
              <div className="mt-6 flex flex-col gap-2.5">
                <Button variant="primary" icon={Mail} onClick={() => setAuthModal("login")}>Sign in</Button>
                <Button variant="ghost" icon={Mail} onClick={handleContactAdmin}>Contact admin</Button>
                <Button variant="ghost" icon={ArrowLeft} onClick={() => router.push("/")}>Browse the feed</Button>
              </div>
            </>
          )}
        </section>
      </div>
      <Footer />
    </main>
  );
}

export default function PendingReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: "#EAF2FA" }} />}>
      <PendingReviewContent />
    </Suspense>
  );
}
