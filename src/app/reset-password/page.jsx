"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { T } from "@/lib/theme";
import { updatePassword } from "@/lib/supabase/auth";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError("");
    setSuccess(false);

    if (!password) {
      return setError("New password is required.");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    if (!confirmPassword) {
      return setError("Confirm password is required.");
    }

    if (password !== confirmPassword) {
      return setError("New password and confirm password must match.");
    }

    try {
      setSubmitting(true);
      const { error: updateError } = await updatePassword(password);

      if (updateError) {
        return setError(
          updateError.message ||
            "Could not update password. Please open the reset link again."
        );
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Password update failed:", err);
      setError("Could not update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell hideNav>
      <main className="min-h-screen flex items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-md rounded-[28px] border p-6 md:p-7 sh-card-premium"
          style={{ backgroundColor: T.card, borderColor: T.border }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: T.goldBg, color: T.red }}
          >
            <Lock size={22} />
          </div>

          <div
            className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1"
            style={{ color: T.red }}
          >
            SoldierHub Security
          </div>

          <h1 className="text-2xl md:text-3xl font-serif" style={{ color: T.navy }}>
            Create a new password
          </h1>

          <p className="text-sm leading-relaxed mt-2 mb-5" style={{ color: T.textMuted }}>
            Enter your new password below. After it is updated, you can sign in with the new password.
          </p>

          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="block text-xs font-medium mb-1.5" style={{ color: T.textMuted }}>
                New password <span style={{ color: T.red }}>*</span>
              </span>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textSubtle }}>
                  <Lock size={16} strokeWidth={2.25} />
                </span>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full h-11 rounded-xl border text-sm outline-none placeholder:text-[#A8ABB2] pl-10 pr-10"
                  style={{ backgroundColor: T.card, borderColor: T.border, color: T.text }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: T.textSubtle }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="block text-xs font-medium mb-1.5" style={{ color: T.textMuted }}>
                Confirm new password <span style={{ color: T.red }}>*</span>
              </span>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textSubtle }}>
                  <Lock size={16} strokeWidth={2.25} />
                </span>

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-11 rounded-xl border text-sm outline-none placeholder:text-[#A8ABB2] pl-10 pr-10"
                  style={{ backgroundColor: T.card, borderColor: T.border, color: T.text }}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: T.textSubtle }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <div
                className="rounded-xl px-3 py-2 text-xs flex items-start gap-2"
                style={{ backgroundColor: T.redBg, color: T.red }}
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                className="rounded-xl px-3 py-2 text-xs flex items-start gap-2"
                style={{ backgroundColor: T.greenBg, color: T.green }}
              >
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span>Your password has been updated successfully.</span>
              </div>
            )}

            <Button
              variant="primary"
              icon={Lock}
              onClick={submit}
              disabled={submitting}
              className="w-full mt-1"
            >
              {submitting ? "Updating..." : "Update password"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => router.push("/")}
              className="w-full"
            >
              Back to SoldierHub
            </Button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
