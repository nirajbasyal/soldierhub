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
  Plus,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
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
        className="block text-xs font-medium mb-1.5"
        style={{ color: T.textMuted }}
      >
        {required ? <RequiredLabel>{label}</RequiredLabel> : label}
      </span>

      <div className="relative">
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
          className="w-full h-11 rounded-xl border text-sm outline-none placeholder:text-[#A8ABB2] pl-10 pr-3"
          style={{
            backgroundColor: T.card,
            borderColor: invalid ? T.red : T.border,
            color: T.text,
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = invalid ? T.red : T.navy)
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = invalid ? T.red : T.border)
          }
        />
      </div>

      {invalid && (
        <p className="mt-1 text-xs font-medium" style={{ color: T.red }}>
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
        className="block text-xs font-medium mb-1.5"
        style={{ color: T.textMuted }}
      >
        {label}
      </span>

      <div className="relative">
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
          className="w-full h-11 rounded-xl border text-sm outline-none placeholder:text-[#A8ABB2] pl-10 pr-3"
          style={{
            backgroundColor: T.card,
            borderColor: invalid ? T.red : T.border,
            color: T.text,
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = invalid ? T.red : T.navy)
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = invalid ? T.red : T.border)
          }
        />
      </div>

      {invalid && (
        <p className="mt-1 text-xs font-medium" style={{ color: T.red }}>
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
  } = useApp();

  const [tab, setTab] = useState(authModal || "login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [militaryEmail, setMilitaryEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [bio, setBio] = useState("");
  const [showBio, setShowBio] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedMilitaryEmail = militaryEmail.trim().toLowerCase();

  const emailIsInvalid =
    trimmedEmail.length > 0 && !isValidEmail(trimmedEmail);

  const militaryEmailIsInvalid =
    tab === "signup" &&
    trimmedMilitaryEmail.length > 0 &&
    !isValidEmail(trimmedMilitaryEmail);

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
    }
  }, [authModal]);

  const close = () => setAuthModal(null);

  const submit = async () => {
    setError("");

    const fullName = name.trim();
    const personalEmail = email.trim().toLowerCase();
    const optionalMilitaryEmail = militaryEmail.trim().toLowerCase();
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

      if (optionalMilitaryEmail && !isValidEmail(optionalMilitaryEmail)) {
        return setError("Please enter valid military email address or leave it blank.");
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

      try {
        setSubmitting(true);

        const result = await handleSignup({
          name: fullName,
          email: personalEmail,
          militaryEmail: optionalMilitaryEmail,
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

  return (
    <Modal open onClose={close} maxWidth={440}>
      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div
              className="text-[10px] font-medium tracking-wider uppercase"
              style={{ color: T.gold }}
            >
              Soldier Hub
            </div>

            <h2
              className="text-xl mt-0.5 leading-tight font-serif"
              style={{ color: T.navy }}
            >
              {tab === "signup" ? "Join the community" : "Welcome back"}
            </h2>
          </div>

          <button
            onClick={close}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ color: T.textMuted }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="flex p-1 rounded-xl mb-4"
          style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
        >
          {["login", "signup"].map((k) => (
            <button
              key={k}
              onClick={() => {
                setTab(k);
                setError("");
              }}
              className="flex-1 h-9 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: tab === k ? T.card : "transparent",
                color: tab === k ? T.navy : T.textMuted,
                boxShadow: tab === k ? "0 1px 2px rgba(11,28,44,0.06)" : "none",
              }}
            >
              {k === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {tab === "signup" && (
            <TextInput
              label={<RequiredLabel>Full name</RequiredLabel>}
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          )}

          <EmailField
            label={tab === "signup" ? "Personal email" : "Email"}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            invalid={emailIsInvalid}
            errorText="Please enter valid email address."
          />

          {tab === "signup" && (
            <>
              <EmailField
                label="Military email optional"
                value={militaryEmail}
                onChange={(e) => setMilitaryEmail(e.target.value)}
                placeholder="first.last.mil@army.mil"
                invalid={militaryEmailIsInvalid}
                errorText="Please enter valid military email address."
              />

              <PhoneField
                label="Phone number optional"
                value={phone}
                onChange={(e) => {
                  const numbersOnly = e.target.value.replace(/\D/g, "");
                  setPhone(numbersOnly);
                }}
                placeholder="9151234567"
                invalid={phoneIsInvalid}
                errorText="Please enter a valid 10-digit phone number."
              />
            </>
          )}

          <label className="block">
            <span
              className="block text-xs font-medium mb-1.5"
              style={{ color: T.textMuted }}
            >
              Password <span style={{ color: T.red }}>*</span>
            </span>

            <div className="relative">
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
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={tab === "signup" ? "Min 6 characters" : "Your password"}
                className="w-full h-11 rounded-xl border text-sm outline-none placeholder:text-[#A8ABB2] pl-10 pr-11"
                style={{
                  backgroundColor: T.card,
                  borderColor: T.border,
                  color: T.text,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = T.navy)}
                onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: T.textMuted }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {tab === "signup" && (
            <label className="block">
              <span
                className="block text-xs font-medium mb-1.5"
                style={{ color: T.textMuted }}
              >
                Confirm password <span style={{ color: T.red }}>*</span>
              </span>

              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: T.textSubtle }}
                >
                  <Lock size={16} strokeWidth={2.25} />
                </span>

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Re-enter your password"
                  className="w-full h-11 rounded-xl border text-sm outline-none placeholder:text-[#A8ABB2] pl-10 pr-11"
                  style={{
                    backgroundColor: T.card,
                    borderColor: passwordsDoNotMatch ? T.red : T.border,
                    color: T.text,
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = passwordsDoNotMatch
                      ? T.red
                      : T.navy)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = passwordsDoNotMatch
                      ? T.red
                      : T.border)
                  }
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ color: T.textMuted }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordsDoNotMatch && (
                <p className="mt-1 text-xs font-medium" style={{ color: T.red }}>
                  Password does not match.
                </p>
              )}
            </label>
          )}

          {tab === "signup" && (
            <>
              {!showBio ? (
                <button
                  type="button"
                  onClick={() => setShowBio(true)}
                  className="text-xs font-medium text-left flex items-center gap-1 mt-0.5"
                  style={{ color: T.gold }}
                >
                  <Plus size={12} /> Add a short bio optional
                </button>
              ) : (
                <TextArea
                  label="Short bio optional"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community a little about yourself…"
                  rows={2}
                />
              )}
            </>
          )}

          {error && (
            <div
              className="text-xs px-3 py-2 rounded-lg flex items-start gap-2"
              style={{ backgroundColor: T.redBg, color: T.red }}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full mt-4"
          onClick={submit}
          icon={tab === "signup" ? UserPlus : LogIn}
          disabled={submitting}
        >
          {submitting
            ? "Please wait…"
            : tab === "signup"
            ? "Submit for review"
            : "Sign in"}
        </Button>

        <div
          className="mt-3 text-[11px] leading-relaxed flex items-center gap-1.5"
          style={{ color: T.textSubtle }}
        >
          <ShieldCheck size={12} className="shrink-0" style={{ color: T.gold }} />
          {tab === "signup"
            ? "Fields marked with * are required. Phone number is optional, but must be a valid 10-digit number if entered."
            : "Fields marked with * are required to sign in."}
        </div>
      </div>
    </Modal>
  );
}