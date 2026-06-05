"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Footer from "@/components/layout/Footer";

const ADMIN_CONTACT_EMAIL = "support@soldierhub.com";

function StatusIcon({ type = "pending" }) {
  const isDanger = type === "danger";
  const isSuccess = type === "success";
  const Icon = isDanger ? ShieldAlert : isSuccess ? CheckCircle2 : type === "mail" ? Mail : Clock;

  return (
    <div
      className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border sm:h-16 sm:w-16"
      style={{
        backgroundColor: isDanger ? "#FFF1F4" : isSuccess ? "#EEF7F2" : "#EEF4FB",
        borderColor: isDanger ? "rgba(179,25,66,0.18)" : isSuccess ? "rgba(34,120,83,0.16)" : "rgba(63,95,125,0.18)",
      }}
    >
      <Icon
        size={28}
        strokeWidth={2.25}
        style={{ color: isDanger ? T.red : isSuccess ? "#227853" : T.navy }}
      />
    </div>
  );
}

function StepCard({ icon: Icon, title, body, tone = "neutral" }) {
  const isSuccess = tone === "success";
  const isDanger = tone === "danger";

  return (
    <div
      className="rounded-2xl border p-4 text-left sm:p-5"
      style={{
        backgroundColor: isDanger ? "#FFF6F8" : isSuccess ? "#F2F8F5" : "#F7FAFD",
        borderColor: isDanger ? "rgba(179,25,66,0.22)" : isSuccess ? "rgba(34,120,83,0.2)" : "rgba(63,95,125,0.18)",
      }}
    >
      <div className="flex gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          style={{
            backgroundColor: "rgba(255,255,255,0.78)",
            borderColor: isDanger ? "rgba(179,25,66,0.18)" : isSuccess ? "rgba(34,120,83,0.18)" : "rgba(63,95,125,0.18)",
            color: isDanger ? T.red : isSuccess ? "#227853" : T.navy,
          }}
        >
          <Icon size={18} strokeWidth={2.35} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-snug" style={{ color: T.text }}>
            {title}
          </p>
          <p className="mt-1.5 text-[13px] leading-6 sm:text-sm" style={{ color: T.textMuted }}>
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailBadge({ email }) {
  if (!email) return null;

  return (
    <div
      className="mt-4 flex min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm"
      style={{ backgroundColor: "#F3F7FB", borderColor: "rgba(63,95,125,0.12)", color: T.textMuted }}
    >
      <Mail size={15} className="shrink-0" />
      <span className="min-w-0 truncate">{email}</span>
    </div>
  );
}

function LoadingCard() {
  return (
    <main className="flex min-h-screen flex-col" style={{ backgroundColor: "#EAF2FA" }}>
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <section
          className="w-full max-w-[520px] rounded-[28px] border px-5 py-8 text-center shadow-sm sm:px-8"
          style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: "rgba(63,95,125,0.16)" }}
        >
          <StatusIcon type="pending" />
          <h1 className="mt-5 text-3xl font-black tracking-[-0.03em]" style={{ color: T.navy }}>
            Checking your account
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: T.textMuted }}>
            Please wait while Soldier Hub checks your review status.
          </p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
