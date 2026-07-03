"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { resetPasswordForEmail } from "@/lib/supabase/auth";
import { shouldStopAuthAction } from "@/lib/rateLimit/authActionLimiter";
import { getSignupPasswordPolicy } from "@/lib/auth/passwordPolicy";
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

function FieldMessage({ tone = "error", children }) {
  if (!children) return null;
  const success = tone === "success";
  const Icon = success ? CheckCircle2 : AlertTriangle;

  return (
    <p
      className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-5"
      style={{ color: success ? T.green : T.red }}
      aria-live="polite"
    >
      <Icon size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function EmailField({ label, value, onChange, required = false, invalid = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold" style={{ color: T.textMuted }}>
        {required ? <RequiredLabel>{label}</RequiredLabel> : label}
      </span>
      <div className="relative">
        <Mail
          size={16}
          strokeWidth={2.25}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: invalid ? T.red : T.textSubtle }}
        />
        <input
          type="email"
          name="email"
          value={value}
          onChange={onChange}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-12 w-full rounded-2xl border bg-white pl-10 pr-3 text-[16px] font-semibold outline-none placeholder:text-[#A8ABB2] sm:text-sm"
          style={{
            borderColor: invalid ? T.red : T.border,
            color: T.text,
            WebkitTextFillColor: T.text,
            boxShadow: invalid ? "0 0 0 3px rgba(179,25,66,0.07)" : "0 1px 0 rgba(11,28,44,0.02)",
          }}
        />
      </div>
      {invalid ? <FieldMessage>Please enter valid email address.</FieldMessage> : null}
    </label>
  );
}

function PhoneField({ value, onChange, invalid = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold" style={{ color: T.textMuted }}>
        Phone number (optional)
      </span>
      <div className="relative">
        <Phone
          size={16}
          strokeWidth={2.25}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: invalid ? T.red : T.textSubtle }}
        />
        <input
          type="tel"
          name="phone"
          inputMode="numeric"
          value={value}
          onChange={onChange}
          placeholder="9151234567"
          autoComplete="tel"
          maxLength={10}
          className="h-12 w-full rounded-2xl border bg-white pl-10 pr-3 text-[16px] font-semibold outline-none placeholder:text-[#A8ABB2] sm:text-sm"
          style={{
            borderColor: invalid ? T.red : T.border,
            color: T.text,
            WebkitTextFillColor: T.text,
            boxShadow: invalid ? "0 0 0 3px rgba(179,25,66,0.07)" : "0 1px 0 rgba(11,28,44,0.02)",
          }}
        />
      </div>
      {invalid ? <FieldMessage>Please enter a valid 10-digit phone number.</FieldMessage> : null}
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
  invalid = false,
  valid = false,
  message = "",
  name,
  autoComplete,
}) {
  const borderColor = invalid ? T.red : valid ? T.green : T.border;
  const backgroundColor = valid ? "#F2F8F5" : "#FFFFFF";
  const iconColor = invalid ? T.red : valid ? T.green : T.textSubtle;

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold" style={{ color: T.textMuted }}>
        <RequiredLabel>{label}</RequiredLabel>
      </span>
      <div className="relative">
        <Lock
          size={16}
          strokeWidth={2.25}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: iconColor }}
        />
        <input
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          className="h-12 w-full rounded-2xl border pl-10 pr-12 text-[16px] font-semibold outline-none placeholder:text-[#A8ABB2] sm:text-sm"
          style={{
            backgroundColor,
            borderColor,
            color: T.text,
            WebkitTextFillColor: T.text,
            caretColor: T.text,
            boxShadow: invalid
              ? "0 0 0 3px rgba(179,25,66,0.07)"
              : valid
              ? "0 0 0 3px rgba(36,113,81,0.09)"
              : "0 1px 0 rgba(11,28,44,0.02)",
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
          style={{ color: T.textSubtle, backgroundColor: "rgba(248,250,253,0.9)" }}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <FieldMessage tone={valid ? "success" : "error"}>{message}</FieldMessage>
    </label>
  );
}

export default function AuthModalV2() {
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
  const [showAgreement, setShowAgreement] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const compactSignup = tab === "signup";
  const emailInvalid = cleanEmail.length > 0 && !isValidEmail(cleanEmail);
  const phoneInvalid = tab === "signup" && phone.length > 0 && phone.length !== 10;
  const passwordPolicy = useMemo(
    () => (tab === "signup" ? getSignupPasswordPolicy(password) : { state: "empty", message: "" }),
    [password, tab]
  );
  const passwordInvalid = passwordPolicy.state === "error";
  const passwordValid = passwordPolicy.state === "success";
  const confirmMismatch = tab === "signup" && confirmPassword.length > 0 && password !== confirmPassword;
  const confirmValid = tab === "signup" && confirmPassword.length > 0 && passwordValid && password === confirmPassword;

  useEffect(() => {
    if (!authModal) return;
    setTab(authModal);
    setError("");
    setResetSent(false);
    setLegalAccepted(false);
    setShowAgreement(false);
  }, [authModal]);

  const close = () => {
    setShowAgreement(false);
    setAuthModal(null);
  };

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setError("");
    setResetSent(false);
    setShowAgreement(false);
  };

  const sendReset = async () => {
    setError("");
    setResetSent(false);
    if (!cleanEmail) return setError("Email is required to reset your password.");
    if (!isValidEmail(cleanEmail)) return setError("Please enter valid email address.");
    if (shouldStopAuthAction({ email: cleanEmail, pushToast, onError: setError })) return;

    try {
      setSubmitting(true);
      const { error: resetError } = await resetPasswordForEmail(cleanEmail);
      if (resetError) return setError(resetError.message || "Could not send reset email.");
      setResetSent(true);
      pushToast?.("Password reset email sent. Check your inbox.", "success");
    } catch (err) {
      console.error("Password reset failed:", err);
      setError("Could not send reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async ({ skipAgreement = false } = {}) => {
    if (submitting) return;
    setError("");

    if (tab === "forgot") return sendReset();

    if (tab === "signup") {
      const fullName = name.trim();
      const optionalPhone = phone.replace(/\D/g, "");
      const cleanBio = bio.trim();

      if (!fullName) return setError("Full name is required.");
      if (!cleanEmail) return setError("Personal email is required.");
      if (!isValidEmail(cleanEmail)) return setError("Please enter valid email address.");
      if (optionalPhone && optionalPhone.length !== 10) return setError("Please enter a valid 10-digit phone number.");
      if (!password) return setError("Password is required.");
      if (passwordInvalid) return setError(passwordPolicy.message);
      if (!confirmPassword) return setError("Confirm password is required.");
      if (password !== confirmPassword) return setError("Password and confirm password must match.");
      if (!legalAccepted) return setError("Please confirm you are 18 years or older and agree to the Terms of Use and acknowledge the Privacy Policy.");

      if (
        !isLiveMode &&
        (users.some((u) => u.email === cleanEmail || u.personal_email === cleanEmail) ||
          pendingUsers.some((u) => u.email === cleanEmail || u.personal_email === cleanEmail))
      ) {
        return setError("An account with that email already exists.");
      }

      if (!skipAgreement) {
        setShowAgreement(true);
        return;
      }

      if (shouldStopAuthAction({ email: cleanEmail, pushToast, onError: setError })) return;

      try {
        setSubmitting(true);
        const result = await handleSignup({
          name: fullName,
          email: cleanEmail,
          phone: optionalPhone,
          bio: cleanBio,
          password,
        });
        if (result?.ok === false) return setError(result.error || "Signup failed. Please try again.");
        pushToast?.("Account submitted. Check your email, then wait for admin verification.", "success");
      } catch (err) {
        console.error("Signup failed:", err);
        setError("Signup failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!cleanEmail) return setError("Email is required.");
    if (!isValidEmail(cleanEmail)) return setError("Please enter valid email address.");
    if (!password) return setError("Password is required.");
    if (shouldStopAuthAction({ email: cleanEmail, pushToast, onError: setError })) return;

    try {
      setSubmitting(true);
      await handleLogin(cleanEmail, password, (msg) => setError(msg));
    } catch (err) {
      console.error("Login failed:", err);
      setError("Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = tab === "signup" ? "Create your account" : tab === "forgot" ? "Reset password" : "Welcome back";
  const subtitle =
    tab === "signup"
      ? "Create your account and wait for admin verification before posting."
      : tab === "forgot"
      ? "Enter your email and we will send a secure password reset link."
      : "Sign in to post, comment, and use verified community features.";
  const submitText = submitting
    ? tab === "forgot"
      ? "Sending..."
      : tab === "signup"
      ? "Creating..."
      : "Signing in..."
    : tab === "signup"
    ? "Review & continue"
    : tab === "forgot"
    ? "Send reset link"
    : "Sign in";
  const disableSubmit = submitting || (tab === "signup" && password.length > 0 && passwordInvalid);

  return (
    <>
      <Modal open onClose={close} maxWidth={500}>
        <div className={compactSignup ? "px-4 py-3 sm:p-5" : "p-4 md:p-5"}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[24px] font-black leading-none tracking-[-0.04em]" style={{ color: T.navy }}>Soldier</span>
                <span className="text-[24px] font-black leading-none tracking-[-0.04em]" style={{ color: T.red }}>Hub</span>
              </div>
              <h2 className="text-xl font-black tracking-[-0.03em] sm:text-2xl" style={{ color: T.navy }}>{title}</h2>
              <p className="mt-1 hidden max-w-[360px] text-sm leading-6 sm:block" style={{ color: T.textMuted }}>{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="sh-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
              style={{ backgroundColor: "rgba(248,250,253,0.96)", borderColor: T.borderSoft, color: T.textMuted }}
              aria-label="Close auth modal"
            >
              <X size={18} />
            </button>
          </div>

          {tab !== "forgot" && (
            <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl border p-1" style={{ backgroundColor: "rgba(234,240,248,0.78)", borderColor: T.borderSoft }}>
              {["login", "signup"].map((key) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchTab(key)}
                    className="sh-tap h-10 rounded-xl text-sm font-extrabold transition-all"
                    style={{
                      backgroundColor: active ? "#FFFFFF" : "transparent",
                      color: active ? T.navy : T.textMuted,
                      border: active ? `1px solid ${T.borderSoft}` : "1px solid transparent",
                    }}
                  >
                    {key === "login" ? "Sign in" : "Create account"}
                  </button>
                );
              })}
            </div>
          )}

          {tab === "forgot" && (
            <button
              type="button"
              onClick={() => switchTab("login")}
              className="sh-tap mb-3 inline-flex h-9 items-center rounded-full border px-3 text-xs font-extrabold"
              style={{ backgroundColor: "rgba(248,250,253,0.96)", borderColor: T.borderSoft, color: T.navy }}
            >
              Back to sign in
            </button>
          )}

          <form noValidate onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex flex-col gap-3">
            {tab === "forgot" && (
              <div className="rounded-2xl border px-3 py-3 text-sm leading-relaxed" style={{ backgroundColor: "rgba(248,250,253,0.96)", borderColor: T.borderSoft, color: T.textMuted }}>
                Use the same email connected to your Soldier Hub account. The reset link will be sent to your inbox.
              </div>
            )}

            {tab === "signup" && (
              <TextInput
                label={<RequiredLabel>Full name</RequiredLabel>}
                icon={User}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                className="h-12 rounded-2xl bg-white"
              />
            )}

            <EmailField
              label={tab === "signup" ? "Personal email" : "Email"}
              required
              value={email}
              onChange={(event) => { setEmail(event.target.value); setResetSent(false); }}
              invalid={emailInvalid}
            />

            {tab === "signup" && (
              <PhoneField
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                invalid={phoneInvalid}
              />
            )}

            {tab !== "forgot" && (
              <PasswordField
                label="Password"
                name={tab === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error.toLowerCase().includes("password")) setError("");
                }}
                placeholder={tab === "signup" ? "Create a password" : "Your password"}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                invalid={tab === "signup" && passwordInvalid}
                valid={tab === "signup" && passwordValid}
                message={tab === "signup" ? passwordPolicy.message : ""}
              />
            )}

            {tab === "login" && (
              <div className="-mt-1 flex justify-end">
                <button type="button" onClick={() => switchTab("forgot")} className="text-xs font-extrabold hover:underline" style={{ color: T.red }}>
                  Forgot password?
                </button>
              </div>
            )}

            {tab === "signup" && (
              <>
                <PasswordField
                  label="Confirm password"
                  name="confirm-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((value) => !value)}
                  autoComplete="new-password"
                  invalid={confirmMismatch}
                  valid={confirmValid}
                  message={confirmMismatch ? "Passwords do not match." : confirmValid ? "Passwords match." : ""}
                />

                <button type="button" onClick={() => setShowBio((value) => !value)} className="sh-tap rounded-full px-1 text-left text-[11px] font-extrabold sm:text-xs" style={{ color: T.navy }}>
                  {showBio ? "Hide optional bio" : "+ Add optional bio"}
                </button>

                {showBio && (
                  <TextArea
                    label="Bio (optional)"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Unit, role, interests, or anything helpful for the community."
                  />
                )}

                <label className="sh-tap flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 sm:rounded-2xl" style={{ backgroundColor: legalAccepted ? "rgba(179,25,66,0.06)" : "rgba(248,250,253,0.96)", borderColor: legalAccepted ? "rgba(179,25,66,0.26)" : T.borderSoft }}>
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(event) => {
                      setLegalAccepted(event.target.checked);
                      if (event.target.checked && error.toLowerCase().includes("terms")) setError("");
                    }}
                    className="sr-only"
                  />
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all" style={{ backgroundColor: legalAccepted ? T.red : "#FFFFFF", borderColor: legalAccepted ? T.red : "rgba(154,169,188,0.75)", color: "#FFFFFF" }}>
                    {legalAccepted && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="text-[11px] font-semibold leading-4 sm:text-xs sm:leading-5" style={{ color: T.textMuted }}>
                    I am 18 years or older and I agree to the Terms of Use and acknowledge the Privacy Policy.
                  </span>
                </label>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold" style={{ backgroundColor: T.redBg, borderColor: "rgba(179,25,66,0.16)", color: T.red }}>
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {resetSent && (
              <div className="flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold" style={{ backgroundColor: T.greenBg, borderColor: "rgba(36,113,81,0.16)", color: T.green }}>
                <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                <span>Password reset email sent. Check your inbox and follow the secure link.</span>
              </div>
            )}

            <div className={compactSignup ? "sticky bottom-0 z-10 -mx-4 mt-0 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pt-2 pb-0 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-0" : ""}>
              <Button
                type="submit"
                variant="primary"
                icon={tab === "signup" ? ShieldCheck : tab === "forgot" ? Send : LogIn}
                disabled={disableSubmit}
                className={`${compactSignup ? "w-full rounded-xl sm:rounded-2xl" : "mt-1 w-full rounded-2xl"}`}
              >
                {submitText}
              </Button>

              {tab === "signup" && (
                <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] font-bold sm:text-xs" style={{ color: T.textMuted }}>
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: T.navy }}>Terms of Use</a>
                  <span style={{ color: T.textSubtle }}>•</span>
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: T.navy }}>Privacy Policy</a>
                </div>
              )}
            </div>
          </form>
        </div>
      </Modal>

      {showAgreement && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              setShowAgreement(false);
              submit({ skipAgreement: true });
            }}
            className="w-full max-w-sm rounded-3xl border p-4 shadow-2xl"
            style={{ backgroundColor: "#FFFFFF", borderColor: T.borderSoft }}
          >
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(179,25,66,0.08)", color: T.red }}>
                <ShieldCheck size={20} strokeWidth={2.5} />
              </span>
              <div>
                <h3 className="text-base font-black tracking-[-0.02em]" style={{ color: T.navy }}>Final step before creating account</h3>
                <p className="mt-1 text-sm font-semibold leading-6" style={{ color: T.textMuted }}>
                  Review the community agreement. Your account will be created after you tap Create account below.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border px-3 py-3 text-sm font-semibold leading-6" style={{ backgroundColor: "rgba(248,250,253,0.96)", borderColor: T.borderSoft, color: T.textMuted }}>
              I agree to respect all members, avoid rank pressure, help build a positive community, and support those in need.
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setShowAgreement(false)} className="sh-tap h-11 rounded-2xl border text-sm font-extrabold" style={{ backgroundColor: "#FFFFFF", borderColor: T.borderSoft, color: T.textMuted }}>
                Back
              </button>
              <button type="submit" disabled={submitting} className="sh-tap h-11 rounded-2xl text-sm font-extrabold text-white disabled:opacity-70" style={{ backgroundColor: T.red }}>
                {submitting ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
