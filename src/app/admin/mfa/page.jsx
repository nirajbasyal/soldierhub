"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import { getAdminMfaState } from "@/lib/admin/mfa";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";

function cleanNextPath(value) {
  if (!value || !value.startsWith("/")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  return value;
}

export default function AdminMfaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, authLoading } = useApp();

  const nextPath = useMemo(() => cleanNextPath(searchParams.get("next")), [searchParams]);
  const [code, setCode] = useState("");
  const [factor, setFactor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace("/");
      return;
    }
    if (currentUser.role !== "admin") {
      router.replace("/");
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadMfaState() {
      if (authLoading || !currentUser || currentUser.role !== "admin") return;
      setLoading(true);
      const state = await getAdminMfaState();
      if (cancelled) return;

      if (state.currentLevel === "aal2") {
        router.replace(nextPath);
        return;
      }

      const firstFactor = state.verifiedTotpFactors[0] || null;
      if (!firstFactor) {
        router.replace(`/admin/security?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setFactor(firstFactor);
      setLoading(false);
    }

    loadMfaState();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser, nextPath, router]);

  async function verifyCode(event) {
    event.preventDefault();
    setMessage(null);

    const cleanCode = code.replace(/\D/g, "").slice(0, 6);
    if (cleanCode.length !== 6) {
      setMessage({ type: "error", text: "Enter the 6-digit code from Google Authenticator." });
      return;
    }

    const supabase = createClient();
    if (!supabase || !factor?.id) {
      setMessage({ type: "error", text: "MFA is not ready. Refresh and try again." });
      return;
    }

    setVerifying(true);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });

    if (challengeError) {
      setVerifying(false);
      setMessage({ type: "error", text: challengeError.message || "Could not start MFA verification." });
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: cleanCode,
    });

    setVerifying(false);

    if (verifyError) {
      setMessage({ type: "error", text: verifyError.message || "Incorrect MFA code." });
      return;
    }

    await supabase.auth.refreshSession();
    router.replace(nextPath);
  }

  if (authLoading || loading || !currentUser || currentUser.role !== "admin") return null;

  return (
    <AppShell hideNav>
      <main className="min-h-screen px-4 py-8" style={{ backgroundColor: T.bg }}>
        <div className="mx-auto max-w-md rounded-[2rem] border p-5 shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.gold }}>Admin security</p>
              <h1 className="mt-1 text-2xl font-serif font-black" style={{ color: T.navy }}>Verify MFA</h1>
              <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>
                Enter the 6-digit code from Google Authenticator to unlock the admin dashboard.
              </p>
            </div>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: T.border, backgroundColor: T.surface, color: message.type === "error" ? T.danger : T.success }}>
              {message.text}
            </div>
          )}

          <form onSubmit={verifyCode} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: T.textMuted }}>Authenticator code</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-2xl border px-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
                <KeyRound size={16} style={{ color: T.blue }} />
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="h-12 w-full bg-transparent text-lg font-black tracking-[0.3em] outline-none"
                  style={{ color: T.text }}
                />
              </div>
            </label>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={verifying}>
              {verifying ? "Verifying..." : "Unlock admin"}
            </Button>

            <button type="button" onClick={() => router.push("/admin/security")} className="w-full text-sm font-bold" style={{ color: T.blue }}>
              Manage MFA setup
            </button>
          </form>
        </div>
      </main>
    </AppShell>
  );
}
