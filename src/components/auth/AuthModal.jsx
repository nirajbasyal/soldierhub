"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { resetPasswordForEmail } from "@/lib/supabase/auth";
import { shouldStopAuthAction } from "@/lib/rateLimit/authActionLimiter";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function RequiredLabel({ children }) {
  return (
    <span>
      {children} <span style={{ color: T.red }}>*</span>
    </span>
  );
}

function AuthSubtitle({ tab }) {
  if (tab === "signup") {
    return "Create your account and wait for admin verification before posting.";
  }

  if (tab === "forgot") {
    return "Enter your email and we will send a secure password reset link.";
  }

  return "Sign in to post, comment, and use verified community features.";
}

function FieldShell({ children, invalid = false, compact = false }) {
  return (
    <div
      className={`relative border transition-colors ${compact ? "rounded-xl sm:rounded-2xl" : "rounded-2xl"}`}
      style={{
        backgroundColor: "rgba(248,250,253,0.96)",
        borderColor: invalid ? "rgba(179,25,66,0.36)" : "rgba(207,218,232,0.9)",
      }}
    >
      {children}
    </div>
  );
}

function EmailField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  invalid = false,
  errorText = "Please enter valid email address.",
  compact = false,
}) {
  return (
    <label className="block">
      <span
        className={`${compact ? "mb-1" : "mb-1.5"} block text-xs font-bold`}
        style={{ color: T.textMuted }}
      >
        {required ? <RequiredLabel>{label}</RequiredLabel> : label}
      </span>

      <FieldShell invalid={invalid} compact={compact}>
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: invalid ? T.red : T.textSubtle }}
        >
          <Mail size={16} strokeWidth={2.25} />
        </span>

        <input
          type="email"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${compact ? "h-10 rounded-xl sm:h-12 sm:rounded-2xl" : "h-12 rounded-2xl"} w-full border-0 bg-transparent pl-10 pr-3 text-sm outline-none placeholder:text-[#A8ABB2]`}
          style={{ color: T.text }}
        />
      </FieldShell>

      {invalid && (
        <p className="mt-1 text-xs font-semibold" style={{ color: T.red }}>
          {errorText}
        </p>
      )}
    </label>
  );
}

function PhoneField({
  label,
  value,
  onChange,
  placeholder,
  invalid = false,
  errorText = "Please enter a valid 10-digit phone number.",
  compact = false,
}) {
  return (
    <label className="block">
      <span
        className={`${compact ? "mb-1" : "mb-1.5"} block text-xs font-bold`}
        style={{ color: T.textMuted }}
      >
        {label}
      </span>

      <FieldShell invalid={invalid} compact={compact}>
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: invalid ? T.red : T.textSubtle }}
        >
          <Phone size={16} strokeWidth={2.25} />
        </span>

        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${compact ? "h-10 rounded-xl sm:h-12 sm:rounded-2xl" : "h-12 rounded-2xl"} w-full border-0 bg-transparent pl-10 pr-3 text-sm outline-none placeholder:text-[#A8ABB2]`}
          style={{ color: T.text }}
        />
      </FieldShell>

      {invalid && (
        <p className="mt-1 text-xs font-semibold" style={{ color: T.red }}>
          {errorText}
        </p>
      )}
    </label>
  );
}

export default function AuthModal() {
  const {
    authModal,
    setAuthModal,
    users,
    pendingUsers,
    handleLogin,
    handleSignup,
    isLiveMode,
    pushToast,
  } = useApp();

  const [tab, setTab] = useState(authModal || "login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [bio, setBio] = useState("");
  const [showBio, setShowBio] = useState(false);

  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showCommunityAgreement, setShowCommunityAgreement] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const trimmedEmail = email.trim().toLowerCase();

  const emailIsInvalid =
    trimmedEmail.length > 0 && !isValidEmail(trimmedEmail);

  const phoneIsInvalid =
    tab === "signup" && phone.length > 0 && phone.length !== 10;

  const passwordsDoNotMatch =
    tab === "signup" &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  useEffect(() => {
    if (authModal) {
      setTab(authModal);
      setError("");
      setResetSent(false);
      setLegalAccepted(false);
      setShowCommunityAgreement(false);
    }
  }, [authModal]);

  const close = () => {
    setShowCommunityAgreement(false);
    setAuthModal(null);
  };

  const sendPasswordReset = async () => {
    setError("");
    setResetSent(false);

    const personalEmail = email.trim().toLowerCase();

    if (!personalEmail) {
      return setError("Email is required to reset your password.");
    }

    if (!isValidEmail(personalEmail)) {
      return setError("Please enter valid email address.");
    }

    if (shouldStopAuthAction({ email: personalEmail, pushToast, onError: setError })) {
      return;
    }

    try {
      setSubmitting(true);
      const { error: resetError } = await resetPasswordForEmail(personalEmail);

      if (resetError) {
        return setError(resetError.message || "Could not send reset email.");
      }

      setResetSent(true);
      pushToast?.("Password reset email sent. Check your inbox.", "success");
    } catch (err) {
      console.error("Password reset failed:", err);
      setError("Could not send reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (options = {}) => {
    setError("");

    const skipCommunityAgreement = options?.skipCommunityAgreement === true;

    if (tab === "forgot") {
      return sendPasswordReset();
    }

    const fullName = name.trim();
    const personalEmail = email.trim().toLowerCase();
    const optionalPhone = phone.replace(/\D/g, "");
    const cleanBio = bio.trim();

    if (tab === "signup") {
      if (!fullName) {
        return setError("Full name is required.");
      }

      if (!personalEmail) {
        return setError("Personal email is required.");
      }

      if (!isValidEmail(personalEmail)) {
        return setError("Please enter valid email address.");
      }

      if (optionalPhone && optionalPhone.length !== 10) {
        return setError("Please enter a valid 10-digit phone number.");
      }

      if (!password) {
        return setError("Password is required.");
      }

      if (password.length < 6) {
        return setError("Password must be at least 6 characters.");
      }

      if (!confirmPassword) {
        return setError("Confirm password is required.");
      }

      if (password !== confirmPassword) {
        return setError("Password and confirm password must match.");
      }

      if (!legalAccepted) {
        return setError("Please confirm you are 18 years or older and agree to the Terms of Use and acknowledge the Privacy Policy.");
      }

      if (
        !isLiveMode &&
        (users.some(
          (u) => u.email === personalEmail || u.personal_email === personalEmail
        ) ||
          pendingUsers.some(
            (u) => u.email === personalEmail || u.personal_email === personalEmail
          ))
      ) {
        return setError("An account with that email already exists.");
      }

      if (!skipCommunityAgreement) {
        setShowCommunityAgreement(true);
        return;
      }

      if (shouldStopAuthAction({ email: personalEmail, pushToast, onError: setError })) {
        return;
      }

      try {
        setSubmitting(true);

        const result = await handleSignup({
          name: fullName,
          email: personalEmail,
          phone: optionalPhone,
          bio: cleanBio,
          password,
        });

        if (result?.ok === false) {
          setError(result.error || "Signup failed. Please try again.");
        }
      } catch (err) {
        console.error("Signup failed:", err);
        setError("Signup failed. Please try again.");
      } finally {
        setSubmitting(false);
      }

      return;
    }

    if (!personalEmail) {
      return setError("Email is required.");
    }

    if (!isValidEmail(personalEmail)) {
      return setError("Please enter valid email address.");
    }

    if (!password) {
      return setError("Password is required.");
    }

    if (shouldStopAuthAction({ email: personalEmail, pushToast, onError: setError })) {
      return;
    }

    try {
      setSubmitting(true);

      await handleLogin(personalEmail, password, (msg) => {
        setError(msg);
      });
    } catch (err) {
      console.error("Login failed:", err);
      setError("Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    tab === "signup"
      ? "Create your account"
      : tab === "forgot"
      ? "Reset password"
      : "Welcome back";

  const compactSignup = tab === "signup";

  return (
    <>
      <Modal open onClose={close} maxWidth={500}>
        <div className={compactSignup ? "px-4 py-3 sm:p-5" : "p-4 md:p-5"}>
          <div className={compactSignup ? "mb-2 flex items-start justify-between gap-3 sm:mb-4" : "mb-4 flex items-start justify-between gap-3"}>
            <div className="min-w-0 flex-1">
              <div className={compactSignup ? "mb-2 flex items-center gap-2 sm:mb-3" : "mb-3 flex items-center gap-2"}>
                <span
                  className={compactSignup ? "text-[22px] font-black leading-none tracking-[-0.04em] sm:text-[26px]" : "text-[26px] font-black leading-none tracking-[-0.04em]"}
                  style={{ color: T.navy }}
                >
                  Soldier
                </span>
                <span
                  className={compactSignup ? "text-[22px] font-black leading-none tracking-[-0.04em] sm:text-[26px]" : "text-[26px] font-black leading-none tracking-[-0.04em]"}
                  style={{ color: T.red }}
                >
                  Hub
                </span>
              </div>

              <h2
                className={compactSignup ? "text-xl font-black leading-tight tracking-[-0.03em] sm:text-2xl" : "text-2xl font-black leading-tight tracking-[-0.03em]"}
                style={{ color: T.navy }}
              >
                {title}
              </h2>

              <p
                className={`${compactSignup ? "hidden sm:block" : ""} mt-1.5 max-w-[360px] text-sm leading-6`}
                style={{ color: T.textMuted }}
              >
                <AuthSubtitle tab={tab} />
              </p>
            </div>

            <button
              type="button"
              onClick={close}
              className={compactSignup ? "sh-tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full border sm:h-9 sm:w-9" : "sh-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"}
              style={{
                backgroundColor: "rgba(248,250,253,0.96)",
                borderColor: T.borderSoft,
                color: T.textMuted,
              }}
            >
              <X size={18} />
            </button>
          </div>

          {tab !== "forgot" && (
            <div
              className={compactSignup ? "mb-2 grid grid-cols-2 gap-1.5 rounded-2xl border p-1 sm:mb-4 sm:p-1.5" : "mb-4 grid grid-cols-2 gap-1.5 rounded-2xl border p-1.5"}
              style={{
                backgroundColor: "rgba(234,240,248,0.78)",
                borderColor: T.borderSoft,
              }}
            >
              {["login", "signup"].map((k) => {
                const active = tab === k;

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setTab(k);
                      setError("");
                      setResetSent(false);
                      setShowCommunityAgreement(false);
                    }}
                    className={compactSignup ? "sh-tap h-9 rounded-xl text-sm font-extrabold transition-all sm:h-10" : "sh-tap h-10 rounded-xl text-sm font-extrabold transition-all"}
                    style={{
                      backgroundColor: active ? "#FFFFFF" : "transparent",
                      color: active ? T.navy : T.textMuted,
                      boxShadow: active ? "0 8px 18px rgba(7,27,51,0.08)" : "none",
                      border: active ? `1px solid ${T.borderSoft}` : "1px solid transparent",
                    }}
                  >
                    {k === "login" ? "Sign in" : "Create account"}
                  </button>
                );
              })}
            </div>
          )}

          {tab === "forgot" && (
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError("");
                setResetSent(false);
                setShowCommunityAgreement(false);
              }}
              className="sh-tap mb-4 inline-flex h-9 items-center rounded-full border px-3 text-xs font-extrabold"
              style={{
                backgroundColor: "rgba(248,250,253,0.96)",
                borderColor: T.borderSoft,
                color: T.navy,
              }}
            >
              Back to sign in
            </button>
          )}

          <div className={compactSignup ? "flex flex-col gap-2 sm:gap-3" : "flex flex-col gap-3"}>
            {tab === "forgot" && (
              <div
                className="rounded-2xl border px-3 py-3 text-sm leading-relaxed"
                style={{
                  backgroundColor: "rgba(248,250,253,0.96)",
                  borderColor: T.borderSoft,
                  color: T.textMuted,
                }}
              >
                Use the same email connected to your Soldier Hub account. The reset link will be sent to your inbox.
              </div>
            )}

            {tab === "signup" && (
              <TextInput
                label={<RequiredLabel>Full name</RequiredLabel>}
                icon={User}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="h-10 rounded-xl bg-transparent sm:h-12 sm:rounded-2xl"
              />
            )}

            <EmailField
              label={tab === "signup" ? "Personal email" : "Email"}
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setResetSent(false);
              }}
              placeholder="you@example.com"
              invalid={emailIsInvalid}
              errorText="Please enter valid email address."
              compact={compactSignup}
            />

            {tab === "signup" && (
              <PhoneField
                label="Phone number (optional)"
                value={phone}
                onChange={(e) => {
                  const numbersOnly = e.target.value.replace(/\D/g, "");
                  setPhone(numbersOnly);
                }}
                placeholder="9151234567"
                invalid={phoneIsInvalid}
                errorText="Please enter a valid 10-digit phone number."
                compact={compactSignup}
              />
            )}

            {tab !== "forgot" && (
              <label className="block">
                <span
                  className={`${compactSignup ? "mb-1" : "mb-1.5"} block text-xs font-bold`}
                  style={{ color: T.textMuted }}
                >
                  Password <span style={{ color: T.red }}>*</span>
                </span>

                <FieldShell compact={compactSignup}>
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: T.textSubtle }}
                  >
                    <Lock size={16} strokeWidth={2.25} />
                  </span>

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === "signup" ? "Create a password" : "Your password"}
                    className={`${compactSignup ? "h-10 rounded-xl sm:h-12 sm:rounded-2xl" : "h-12 rounded-2xl"} w-full border-0 bg-transparent pl-10 pr-11 text-sm outline-none placeholder:text-[#A8ABB2]`}
                    style={{ color: T.text }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: T.textSubtle }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </FieldShell>
              </label>
            )}

            {tab === "login" && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab("forgot");
                    setPassword("");
                    setError("");
                    setResetSent(false);
                    setShowCommunityAgreement(false);
                  }}
                  className="text-xs font-extrabold hover:underline"
                  style={{ color: T.red }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {tab === "signup" && (
              <>
                <label className="block">
                  <span
                    className="mb-1 block text-xs font-bold sm:mb-1.5"
                    style={{ color: T.textMuted }}
                  >
                    Confirm password <span style={{ color: T.red }}>*</span>
                  </span>

                  <FieldShell invalid={passwordsDoNotMatch} compact={compactSignup}>
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: passwordsDoNotMatch ? T.red : T.textSubtle }}
                    >
                      <Lock size={16} strokeWidth={2.25} />
                    </span>

                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="h-10 w-full rounded-xl border-0 bg-transparent pl-10 pr-11 text-sm outline-none placeholder:text-[#A8ABB2] sm:h-12 sm:rounded-2xl"
                      style={{ color: T.text }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: T.textSubtle }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </FieldShell>

                  {passwordsDoNotMatch && (
                    <p className="mt-1 text-xs font-semibold" style={{ color: T.red }}>
                      Passwords do not match.
                    </p>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => setShowBio((v) => !v)}
                  className="sh-tap rounded-full px-1 text-left text-[11px] font-extrabold sm:text-xs"
                  style={{ color: T.navy }}
                >
                  {showBio ? "Hide optional bio" : "+ Add optional bio"}
                </button>

                {showBio && (
                  <TextArea
                    label="Bio (optional)"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Unit, role, interests, or anything helpful for the community."
                  />
                )}

                <label
                  className="sh-tap flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 sm:rounded-2xl"
                  style={{
                    backgroundColor: legalAccepted ? "rgba(179,25,66,0.06)" : "rgba(248,250,253,0.96)",
                    borderColor: legalAccepted ? "rgba(179,25,66,0.26)" : T.borderSoft,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(e) => {
                      setLegalAccepted(e.target.checked);
                      if (e.target.checked && error.toLowerCase().includes("terms")) {
                        setError("");
                      }
                    }}
                    className="sr-only"
                  />

                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all"
                    style={{
                      backgroundColor: legalAccepted ? T.red : "#FFFFFF",
                      borderColor: legalAccepted ? T.red : "rgba(154,169,188,0.75)",
                      color: "#FFFFFF",
                    }}
                  >
                    {legalAccepted && <Check size={13} strokeWidth={3} />}
                  </span>

                  <span className="text-[11px] font-semibold leading-4 sm:text-xs sm:leading-5" style={{ color: T.textMuted }}>
                    I am 18 years or older and I agree to the Terms of Use and acknowledge the Privacy Policy.
                  </span>
                </label>
              </>
            )}

            {error && (
              <div
                className="flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold"
                style={{
                  backgroundColor: T.redBg,
                  borderColor: "rgba(179,25,66,0.16)",
                  color: T.red,
                }}
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {resetSent && (
              <div
                className="flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold"
                style={{
                  backgroundColor: T.greenBg,
                  borderColor: "rgba(36,113,81,0.16)",
                  color: T.green,
                }}
              >
                <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                <span>Password reset email sent. Check your inbox and follow the secure link.</span>
              </div>
            )}

            <div className={compactSignup ? "sticky bottom-0 z-10 -mx-4 mt-0 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pt-2 pb-0 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-0" : ""}>
              <Button
                variant="primary"
                icon={tab === "signup" ? UserPlus : tab === "forgot" ? Send : LogIn}
                onClick={submit}
                disabled={submitting}
                className={`${compactSignup ? "w-full rounded-xl sm:rounded-2xl" : "mt-1 w-full rounded-2xl"}`}
              >
                {submitting
                  ? tab === "forgot"
                    ? "Sending..."
                    : tab === "signup"
                    ? "Creating..."
                    : "Signing in..."
                  : tab === "signup"
                  ? "Create account"
                  : tab === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
              </Button>

              {tab === "signup" && (
                <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] font-bold sm:text-xs" style={{ color: T.textMuted }}>
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: T.navy }}
                  >
                    Terms of Use
                  </a>
                  <span style={{ color: T.textSubtle }}>•</span>
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: T.navy }}
                  >
                    Privacy Policy
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {showCommunityAgreement && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-3xl border p-4 shadow-2xl"
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: T.borderSoft,
            }}
          >
            <div className="mb-3 flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "rgba(179,25,66,0.08)", color: T.red }}
              >
                <ShieldCheck size={20} strokeWidth={2.5} />
              </span>

              <div>
                <h3 className="text-base font-black tracking-[-0.02em]" style={{ color: T.navy }}>
                  Community Agreement
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6" style={{ color: T.textMuted }}>
                  By creating an account, I agree to respect all members, avoid rank pressure, help build a positive community, and support those in need.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowCommunityAgreement(false)}
                className="sh-tap h-11 rounded-2xl border text-sm font-extrabold"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: T.borderSoft,
                  color: T.textMuted,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCommunityAgreement(false);
                  submit({ skipCommunityAgreement: true });
                }}
                disabled={submitting}
                className="sh-tap h-11 rounded-2xl text-sm font-extrabold text-white disabled:opacity-70"
                style={{ backgroundColor: T.red }}
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
