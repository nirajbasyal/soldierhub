"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { T } from "@/lib/theme";

const SIDEBAR_LOGO_SRC = "/brand/soldierhub-logo-sidebar.svg";

export default function SiteInfoCard({ onNavigate }) {
  const handleNavigate = () => {
    if (typeof onNavigate === "function") {
      onNavigate();
    }
  };

  return (
    <div
      className="overflow-hidden rounded-[28px] border shadow-sm"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)",
        borderColor: "rgba(188,208,234,0.86)",
        boxShadow: "0 16px 36px rgba(11,28,44,0.07)",
      }}
    >
      {/* Header */}
      <div
        className="relative overflow-hidden border-b px-5 py-5"
        style={{
          borderColor: "rgba(213,226,242,0.92)",
          background: "linear-gradient(135deg, rgba(238,245,253,0.96) 0%, rgba(255,255,255,0.98) 62%, rgba(255,246,248,0.9) 100%)",
        }}
      >
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#DDE8F3]">
          <div className="h-full w-1/3 rounded-full bg-[#B31942]" />
        </div>

        <div className="flex min-h-[116px] items-center justify-center rounded-[24px] border bg-white/70 px-4 py-4">
          <Image
            src={SIDEBAR_LOGO_SRC}
            alt="SoldierHub logo"
            width={260}
            height={120}
            className="h-auto max-h-[92px] w-full max-w-[238px] object-contain"
            priority={false}
          />
        </div>
      </div>

      <div className="p-5">
        {/* Disclaimer */}
        <div
          className="flex gap-2.5 rounded-2xl border px-3.5 py-3"
          style={{
            backgroundColor: "rgba(244,248,253,0.78)",
            borderColor: "rgba(213,226,242,0.9)",
          }}
        >
          <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: T.blue }} />

          <p className="text-xs leading-relaxed" style={{ color: T.textMuted }}>
            Independent and unofficial. Not affiliated with, endorsed by,
            sponsored by, or controlled by DoD, the U.S. Army, or Fort Bliss.
          </p>
        </div>

        {/* Legal links */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href="/privacy"
            onClick={handleNavigate}
            className="rounded-2xl px-3 py-2.5 text-center text-sm font-bold transition-opacity hover:opacity-75"
            style={{
              color: T.navy,
              backgroundColor: "rgba(220,232,247,0.55)",
              border: "1px solid #D5E2F2",
            }}
          >
            Privacy Policy
          </Link>

          <Link
            href="/terms"
            onClick={handleNavigate}
            className="rounded-2xl px-3 py-2.5 text-center text-sm font-bold transition-opacity hover:opacity-75"
            style={{
              color: T.navy,
              backgroundColor: "rgba(253,236,240,0.55)",
              border: "1px solid #E9C4CD",
            }}
          >
            Terms of Use
          </Link>
        </div>

        {/* Support email */}
        <div className="mt-4 border-t pt-4" style={{ borderColor: T.borderSoft }}>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
            Contact Us
          </p>

          <a
            href="mailto:support@soldierhub.com?subject=SoldierHub%20Contact%20%2F%20Feedback"
            onClick={handleNavigate}
            className="break-all text-sm font-bold underline-offset-4 hover:underline"
            style={{ color: T.navy }}
          >
            support@soldierhub.com
          </a>
        </div>
      </div>
    </div>
  );
}
