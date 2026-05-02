"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  Search,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Button from "@/components/ui/Button";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AdminVerifyByEmail() {
  const { verifyUserByEmail, revokeUserByEmail } = useApp();

  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("info");

  const cleanEmail = email.trim().toLowerCase();
  const emailInvalid = cleanEmail.length > 0 && !isValidEmail(cleanEmail);

  const handleVerify = async () => {
    setMessage("");

    if (!cleanEmail) {
      setTone("error");
      setMessage("Please enter the user's email address.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setTone("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm verification?\n\nThis will change the user's profile status to VERIFIED.\n\nEmail: ${cleanEmail}`
    );

    if (!confirmed) return;

    try {
      setWorking(true);

      const result = await verifyUserByEmail(cleanEmail);

      if (result?.ok === false) {
        setTone("error");
        setMessage(result.error || "Could not verify this user.");
        return;
      }

      setTone("success");
      setMessage(
        `${result?.data?.full_name || cleanEmail} has been verified successfully.`
      );
      setEmail("");
    } catch (error) {
      console.error("Verify by email failed:", error);
      setTone("error");
      setMessage("Something went wrong while verifying this user.");
    } finally {
      setWorking(false);
    }
  };

  const handleRevoke = async () => {
    setMessage("");

    if (!cleanEmail) {
      setTone("error");
      setMessage("Please enter the user's email address.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setTone("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm revoke access?\n\nThis will change the user's profile status to REVOKED.\n\nEmail: ${cleanEmail}\n\nTheir old posts and comments will remain visible, but they cannot use verified features.`
    );

    if (!confirmed) return;

    try {
      setWorking(true);

      const result = await revokeUserByEmail(cleanEmail);

      if (result?.ok === false) {
        setTone("error");
        setMessage(result.error || "Could not revoke this user.");
        return;
      }

      setTone("success");
      setMessage(
        `${result?.data?.full_name || cleanEmail} has been revoked successfully.`
      );
      setEmail("");
    } catch (error) {
      console.error("Revoke by email failed:", error);
      setTone("error");
      setMessage("Something went wrong while revoking this user.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div
      className="rounded-2xl border p-4 mb-4"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: T.goldBg,
            color: T.gold,
          }}
        >
          <Search size={18} />
        </div>

        <div>
          <h3 className="text-base font-semibold" style={{ color: T.navy }}>
            Manage user by email
          </h3>

          <p className="text-xs leading-relaxed mt-1" style={{ color: T.textMuted }}>
            Type an existing user email to verify or revoke access. This does not
            delete the Supabase account.
          </p>
        </div>
      </div>

      <label className="block">
        <span
          className="block text-xs font-medium mb-1.5"
          style={{ color: T.textMuted }}
        >
          Existing user email
        </span>

        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: emailInvalid ? T.red : T.textSubtle }}
          >
            <Mail size={16} />
          </span>

          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMessage("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVerify();
            }}
            placeholder="user@example.com"
            className="w-full h-11 rounded-xl border text-sm outline-none pl-10 pr-3"
            style={{
              backgroundColor: T.card,
              borderColor: emailInvalid ? T.red : T.border,
              color: T.text,
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = emailInvalid ? T.red : T.navy)
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = emailInvalid ? T.red : T.border)
            }
          />
        </div>

        {emailInvalid && (
          <p className="mt-1 text-xs font-medium" style={{ color: T.red }}>
            Please enter a valid email address.
          </p>
        )}
      </label>

      {message && (
        <div
          className="mt-3 rounded-xl border px-3 py-2 text-xs flex items-start gap-2"
          style={{
            backgroundColor: tone === "success" ? T.goldBg : T.redBg,
            borderColor: tone === "success" ? T.gold : T.red,
            color: tone === "success" ? T.navy : T.red,
          }}
        >
          {tone === "success" ? (
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          )}
          <span>{message}</span>
        </div>
      )}

      <Button
        variant="primary"
        icon={ShieldCheck}
        className="w-full mt-4"
        onClick={handleVerify}
        disabled={working || emailInvalid}
      >
        {working ? "Working..." : "Verify this user"}
      </Button>

      <Button
        variant="ghost"
        icon={UserX}
        className="w-full mt-2"
        onClick={handleRevoke}
        disabled={working || emailInvalid}
      >
        {working ? "Working..." : "Revoke this user"}
      </Button>
    </div>
  );
}