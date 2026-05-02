"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
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

export default function AuthModal() {
  const { authModal, setAuthModal, users, pendingUsers, handleLogin, handleSignup, isLiveMode } =
    useApp();

  const [tab, setTab] = useState(authModal || "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bio, setBio] = useState("");
  const [showBio, setShowBio] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const close = () => setAuthModal(null);

  const submit = async () => {
    setError("");
    const e = email.trim().toLowerCase();
    if (!e) return setError("Please enter your email.");
    if (!password) return setError("Please enter your password.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (tab === "signup") {
      if (!name.trim()) return setError("Please enter your full name.");
      // Local-only check in demo mode (Supabase will return its own error if email exists)
      if (
        !isLiveMode &&
        (users.some((u) => u.email === e) || pendingUsers.some((u) => u.email === e))
      ) {
        return setError("An account with that email already exists.");
      }
      setSubmitting(true);
      await handleSignup({ name: name.trim(), email: e, bio: bio.trim(), password });
      setSubmitting(false);
    } else {
      setSubmitting(true);
      await handleLogin(e, password, (msg) => {
        setError(msg);
        setSubmitting(false);
      });
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={close} maxWidth={440}>
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div
              className="text-[10px] font-medium tracking-wider uppercase"
              style={{ color: T.gold }}
            >
              Soldier Hub
            </div>
            <h2 className="text-xl mt-0.5 leading-tight font-serif" style={{ color: T.navy }}>
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

        {/* Tabs */}
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

        {/* Form */}
        <div className="flex flex-col gap-2.5">
          {tab === "signup" && (
            <TextInput
              label="Full name"
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          )}
          <TextInput
            label="Email"
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <label className="block">
            <span
              className="block text-xs font-medium mb-1.5"
              style={{ color: T.textMuted }}
            >
              Password
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
            <>
              {!showBio ? (
                <button
                  type="button"
                  onClick={() => setShowBio(true)}
                  className="text-xs font-medium text-left flex items-center gap-1 mt-0.5"
                  style={{ color: T.gold }}
                >
                  <Plus size={12} /> Add a short bio (optional)
                </button>
              ) : (
                <TextArea
                  label="Short bio"
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

        {/* Single-line hint + disclaimer */}
        <div
          className="mt-3 text-[11px] leading-relaxed flex items-center gap-1.5"
          style={{ color: T.textSubtle }}
        >
          <ShieldCheck size={12} className="shrink-0" style={{ color: T.gold }} />
          {tab === "signup"
            ? "New profiles are reviewed by an admin before posting."
            : "Use the email and password you signed up with."}
        </div>
      </div>
    </Modal>
  );
}
