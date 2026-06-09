"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, QrCode, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
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

export default function AdminSecurityPage() {
  const router = useRouter();
  const { currentUser, authLoading } = useApp();

  const [nextPath, setNextPath] = useState("/admin");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [verifiedFactors, setVerifiedFactors] = useState([]);
  const [currentLevel, setCurrentLevel] = useState("aal1");
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(cleanNextPath(params.get("next")));
  }, []);

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

  async function loadState() {
    setLoading(true);
    const state = await getAdminMfaState();
    setCurrentLevel(state.currentLevel);
    setVerifiedFactors(state.verifiedTotpFactors || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading && currentUser?.role === "admin") loadState();
  }, [authLoading, currentUser?.role]);

  function requireVerifiedSessionForFactorChanges() {
    if (verifiedFactors.length > 0 && currentLevel !== "aal2") {
      setMessage({
        type: "error",
        text: "Verify your current Google Authenticator code before adding or removing admin MFA factors.",
      });
      router.push(`/admin/mfa?next=${encodeURIComponent("/admin/security")}`);
      return false;
    }

    return true;
  }

  async function startEnrollment() {
    setMessage(null);

    if (!requireVerifiedSessionForFactorChanges()) return;

    setBusy(true);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setMessage({ type: "error", text: "Supabase is not configured." });
      return;
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Soldier Hub Admin",
    });

    setBusy(false);

    if (error) {
      setMessage({ type: "error", text: error.message || "Could not start MFA setup." });
      return;
    }

    setEnrollment(data);
    setCode("");
    setMessage({ type: "success", text: "Scan the QR code with Google Authenticator, then enter the 6-digit code." });
  }

  async function verifyEnrollment(event) {
    event.preventDefault();
    setMessage(null);

    const cleanCode = code.replace(/\D/g, "").slice(0, 6);
    if (cleanCode.length !== 6) {
      setMessage({ type: "error", text: "Enter the 6-digit code from Google Authenticator." });
      return;
    }

    const supabase = createClient();
    if (!supabase || !enrollment?.id) {
      setMessage({ type: "error", text: "MFA setup is not ready. Start setup again." });
      return;
    }

    setBusy(true);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollment.id,
    });

    if (challengeError) {
      setBusy(false);
      setMessage({ type: "error", text: challengeError.message || "Could not challenge MFA setup." });
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollment.id,
      challengeId: challenge.id,
      code: cleanCode,
    });

    setBusy(false);

    if (verifyError) {
      setMessage({ type: "error", text: verifyError.message || "Incorrect MFA code." });
      return;
    }

    await supabase.auth.refreshSession();
    setEnrollment(null);
    setCode("");
    setMessage({ type: "success", text: "MFA is enabled for your admin account." });
    await loadState();
  }

  async function removeFactor(factorId) {
    setMessage(null);

    if (currentLevel !== "aal2") {
      setMessage({
        type: "error",
        text: "Verify your current Google Authenticator code before removing an MFA factor.",
      });
      router.push(`/admin/mfa?next=${encodeURIComponent("/admin/security")}`);
      return;
    }

    setBusy(true);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setMessage({ type: "error", text: "Supabase is not configured." });
      return;
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);

    if (error) {
      setMessage({ type: "error", text: error.message || "Could not remove MFA factor." });
      return;
    }

    await supabase.auth.refreshSession();
    setMessage({ type: "success", text: "MFA factor removed." });
    await loadState();
  }

  if (authLoading || loading || !currentUser || currentUser.role !== "admin") return null;

  const qrCode = enrollment?.totp?.qr_code;
  const secret = enrollment?.totp?.secret;
  const isVerifiedNow = currentLevel === "aal2";
  const hasExistingFactor = verifiedFactors.length > 0;

  return (
    <AppShell hideNav>
      <main className="min-h-screen px-4 py-8" style={{ backgroundColor: T.bg }}>
        <div className="mx-auto max-w-2xl space-y-5">
          <section className="rounded-[2rem] border p-5 shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.gold }}>Admin security</p>
                <h1 className="mt-1 text-2xl font-serif font-black" style={{ color: T.navy }}>Google Authenticator MFA</h1>
                <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>
                  Set up a 6-digit authenticator code for admin access. After setup, the admin dashboard and admin actions require MFA.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: T.border, backgroundColor: isVerifiedNow ? T.greenBg : T.surface, color: isVerifiedNow ? T.success : T.textMuted }}>
              {isVerifiedNow ? "Current session is MFA verified." : "Current session is not MFA verified yet."}
            </div>

            {message && (
              <div className="mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: T.border, backgroundColor: T.surface, color: message.type === "error" ? T.danger : T.success }}>
                {message.text}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border p-5 shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
                <Smartphone size={20} />
              </div>
              <div>
                <h2 className="font-black" style={{ color: T.navy }}>Verified authenticator apps</h2>
                <p className="mt-1 text-xs leading-5" style={{ color: T.textMuted }}>
                  These are the Google Authenticator/TOTP factors currently enrolled on your admin account.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {verifiedFactors.length === 0 ? (
                <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: T.border, backgroundColor: T.surface, color: T.textMuted }}>
                  No verified authenticator app yet.
                </div>
              ) : verifiedFactors.map((factor) => (
                <div key={factor.id} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: T.border, backgroundColor: T.surface }}>
                  <div className="min-w-0">
                    <p className="font-bold" style={{ color: T.text }}>{factor.friendly_name || "Authenticator app"}</p>
                    <p className="text-xs" style={{ color: T.textSubtle }}>Status: {factor.status}</p>
                  </div>
                  <button type="button" onClick={() => removeFactor(factor.id)} disabled={busy || currentLevel !== "aal2"} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border p-5 shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
                <QrCode size={20} />
              </div>
              <div>
                <h2 className="font-black" style={{ color: T.navy }}>Set up Google Authenticator</h2>
                <p className="mt-1 text-xs leading-5" style={{ color: T.textMuted }}>
                  Open Google Authenticator, add a new account, scan the QR code, then verify the 6-digit code.
                </p>
              </div>
            </div>

            {hasExistingFactor && currentLevel !== "aal2" ? (
              <div className="mt-4 rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: T.border, backgroundColor: T.surface, color: T.textMuted }}>
                Verify your current Google Authenticator code before adding another authenticator app.
              </div>
            ) : !enrollment ? (
              <div className="mt-4">
                <Button type="button" variant="primary" icon={QrCode} onClick={startEnrollment} disabled={busy}>
                  {busy ? "Starting..." : "Start MFA setup"}
                </Button>
              </div>
            ) : (
              <form onSubmit={verifyEnrollment} className="mt-4 space-y-4">
                {qrCode ? (
                  <div className="mx-auto flex max-w-xs justify-center rounded-3xl border p-4" style={{ borderColor: T.border, backgroundColor: T.surface }}>
                    <img src={qrCode} alt="Google Authenticator QR code" className="h-56 w-56 rounded-2xl bg-white p-2" />
                  </div>
                ) : null}

                {secret ? (
                  <div className="rounded-2xl border px-4 py-3 text-xs leading-5" style={{ borderColor: T.border, backgroundColor: T.surface, color: T.textMuted }}>
                    Manual setup key: <span className="font-mono font-black" style={{ color: T.text }}>{secret}</span>
                  </div>
                ) : null}

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

                <div className="grid grid-cols-2 gap-2">
                  <Button type="submit" variant="primary" disabled={busy}>
                    {busy ? "Verifying..." : "Verify setup"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEnrollment(null)} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </section>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={() => router.push(`/admin/mfa?next=${encodeURIComponent(nextPath)}`)}>
              Verify current session
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push(nextPath)}>
              Back to admin
            </Button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
