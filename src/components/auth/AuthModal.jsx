"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
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

function FieldShell({ children, invalid = false }) {
  return (
    <div
      className="relative rounded-2xl border transition-colors"
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
}) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-xs font-bold"
        style={{ color: T.textMuted }}
      >
        {required ? <RequiredLabel>{label}</RequiredLabel> : label}
      </span>

      <FieldShell invalid={invalid}>
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
          className="h-12 w-full rounded-2xl border-0 bg-transparent pl-10 pr-3 text-sm outline-none placeholder:text-[#A8ABB2]"
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
}) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-xs font-bold"
        style={{ color: T.textMuted }}
      >
        {label}
      </span>

      <FieldShell invalid={invalid}>
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
          className="h-12 w-full rounded-2xl border-0 bg-transparent pl-10 pr-3 text-sm outline-none placeholder:text-[#A8ABB2]"
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
    }
  }, [authModal]);

  const close = () => setAuthModal(null);

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

  const submit = async () => {
    setError("");

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

  return (
    <Modal open onClose={close} maxWidth={500}>
      <div className="p-4 md:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="text-[26px] font-black leading-none tracking-[-0.04em]"
                style={{ color: T.navy }}
              >
                Soldier
              </span>
              <span
                className="text-[26px] font-black leading-none tracking-[-0.04em]"
                style={{ color: T.red }}
              >
                Hub
              </span>
            </div>

            <h2
              className="text-2xl font-black leading-tight tracking-[-0.03em]"
              style={{ color: T.navy }}
            >
              {title}
            </h2>

            <p
              className="mt-1.5 max-w-[360px] text-sm leading-6"
              style={{ color: T.textMuted }}
            >
              <AuthSubtitle tab={tab} />
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="sh-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
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
            className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl border p-1.5"
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
                  }}
                  className="sh-tap h-10 rounded-xl text-sm font-extrabold transition-all"
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

        <div className="flex flex-col gap-3">
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
              className="h-12 rounded-2xl bg-transparent"
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
            />
          )}

          {tab !== "forgot" && (
            <label className="block">
              <span
                className="mb-1.5 block text-xs font-bold"
                style={{ color: T.textMuted }}
              >
                Password <span style={{ color: T.red }}>*</span>
              </span>

              <FieldShell>
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
                  className="h-12 w-full rounded-2xl border-0 bg-transparent pl-10 pr-11 text-sm outline-none placeholder:text-[#A8ABB2]"
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
                  className="mb-1.5 block text-xs font-bold"
                  style={{ color: T.textMuted }}
                >
                  Confirm password <span style={{ color: T.red }}>*</span>
                </span>

                <FieldShell invalid={passwordsDoNotMatch}>
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
                    className="h-12 w-full rounded-2xl border-0 bg-transparent pl-10 pr-11 text-sm outline-none placeholder:text-[#A8ABB2]"
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
                className="sh-tap rounded-full px-1 text-left text-xs font-extrabold"
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

          <Button
            variant="primary"
            icon={tab === "signup" ? UserPlus : tab === "forgot" ? Send : LogIn}
            onClick={submit}
            disabled={submitting}
            className="mt-1 w-full rounded-2xl"
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
        </div>
      </div>
    </Modal>
  );
}
