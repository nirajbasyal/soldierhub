"use client";

import { useState } from "react";
import { T } from "@/lib/theme";
import * as Auth from "@/lib/supabase/auth";

export default function TextInput({
  icon: Icon,
  label,
  hint,
  error,
  success,
  className = "",
  onChange,
  onBlur,
  value,
  type,
  ...props
}) {
  const shouldVerifyCurrentPassword =
    type === "password" && typeof label === "string" && label.trim().toLowerCase() === "current password";
  const [currentPasswordState, setCurrentPasswordState] = useState("idle");
  const [currentPasswordMessage, setCurrentPasswordMessage] = useState("");

  const internalError =
    error || (currentPasswordState === "invalid" ? currentPasswordMessage : "");
  const internalSuccess =
    success || (currentPasswordState === "valid" ? currentPasswordMessage : "");
  const internalHint =
    currentPasswordState === "checking" ? "Checking current password…" : hint;

  const borderColor = internalError ? T.red : internalSuccess ? T.green : T.border;
  const backgroundColor = internalSuccess ? T.greenBg : T.card;

  const handleChange = (event) => {
    if (shouldVerifyCurrentPassword) {
      setCurrentPasswordState("idle");
      setCurrentPasswordMessage("");
    }
    onChange?.(event);
  };

  const handleBlur = async (event) => {
    event.currentTarget.style.borderColor = borderColor;
    onBlur?.(event);

    if (!shouldVerifyCurrentPassword || !String(value || "").trim()) return;

    setCurrentPasswordState("checking");
    setCurrentPasswordMessage("");

    try {
      const { user, error: userError } = await Auth.getCurrentUser();
      if (userError || !user?.email) {
        setCurrentPasswordState("invalid");
        setCurrentPasswordMessage("Could not verify your current password. Please try again.");
        return;
      }

      const result = await Auth.signIn({
        email: user.email,
        password: value,
      });

      if (result.error) {
        setCurrentPasswordState("invalid");
        setCurrentPasswordMessage("Current password is incorrect.");
        return;
      }

      setCurrentPasswordState("valid");
      setCurrentPasswordMessage("Current password is correct.");
    } catch {
      setCurrentPasswordState("invalid");
      setCurrentPasswordMessage("Could not verify your current password. Please try again.");
    }
  };

  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium" style={{ color: T.textMuted }}>
          {label}
        </span>
      )}
      <div className="relative">
        {Icon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: internalError ? T.red : internalSuccess ? T.green : T.textSubtle }}
          >
            <Icon size={16} strokeWidth={2.25} />
          </span>
        )}
        <input
          {...props}
          type={type}
          value={value}
          onChange={handleChange}
          aria-invalid={internalError ? true : undefined}
          className={`h-11 w-full rounded-xl border text-sm font-normal outline-none transition-shadow placeholder:font-normal placeholder:text-[#A8ABB2] ${Icon ? "pl-10" : "pl-4"} pr-4 ${className}`}
          style={{
            backgroundColor,
            borderColor,
            color: T.text,
            WebkitTextFillColor: T.text,
            boxShadow: internalError
              ? "0 0 0 3px rgba(179,25,66,0.07)"
              : internalSuccess
              ? "0 0 0 3px rgba(36,113,81,0.08)"
              : "0 1px 0 rgba(11,28,44,0.02)",
          }}
          onFocus={(event) => {
            event.currentTarget.style.borderColor = internalError
              ? T.red
              : internalSuccess
              ? T.green
              : T.navy;
          }}
          onBlur={handleBlur}
        />
      </div>
      {internalError && (
        <span className="mt-1 block text-xs font-medium" style={{ color: T.red }}>
          {internalError}
        </span>
      )}
      {internalSuccess && !internalError && (
        <span className="mt-1 block text-xs font-medium" style={{ color: T.green }}>
          {internalSuccess}
        </span>
      )}
      {internalHint && !internalError && !internalSuccess && (
        <span className="mt-1 block text-xs font-normal" style={{ color: T.textSubtle }}>
          {internalHint}
        </span>
      )}
    </label>
  );
}
