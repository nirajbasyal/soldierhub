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
      className="overflow-hidden rounded-[24px] border bg-white shadow-sm"
      style={{
        borderColor: "rgba(198,214,233,0.9)",
        boxShadow: "0 12px 28px rgba(11,28,44,0.055)",
      }}
    >
      <div className="px-4 pt-4">
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#DDE8F3]">
          <div className="h-full w-[36%] rounded-full bg-[#B31942]" />
        </div>

        <div className="flex min-h-[96px] items-center justify-center rounded-[22px] border px-4 py-3" style={{ backgroundColor: "#F7FAFE", borderColor: "#DCE7F4" }}>
          <Image
            src={SIDEBAR_LOGO_SRC}
            alt="SoldierHub logo"
            width={260}
            height={120}
            className="h-auto max-h-[74px] w-full max-w-[220px] object-contain"
            priority={false}
          />
        </div>
      </div>

      <div className="p-4">
        <div
          className="flex gap-2.5 rounded-2xl border px-3 py-2.5"
          style={{
            backgroundColor: "#F7FAFE",
            borderColor: "#DCE7F4",
          }}
        >
          <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: T.blue }} />

          <p className="text-[11px] leading-relaxed" style={{ color: T.textMuted }}>
            Independent and unofficial. Not affiliated with, endorsed by,
            sponsored by, or controlled by DoD, the U.S. Army, or Fort Bliss.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/privacy"
            onClick={handleNavigate}
            className="rounded-full border px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-75"
            style={{
              color: T.navy,
              backgroundColor: "#F4F7FB",
              borderColor: "#D5E2F2",
            }}
          >
            Privacy Policy
          </Link>

          <Link
            href="/terms"
            onClick={handleNavigate}
            className="rounded-full border px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-75"
            style={{
              color: "#8F1534",
              backgroundColor: "#FFF5F7",
              borderColor: "#E9C4CD",
            }}
          >
            Terms of Use
          </Link>
        </div>

        <div className="mt-4 border-t pt-3" style={{ borderColor: T.borderSoft }}>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
            Contact Us
          </p>

          <a
            href="mailto:support@soldierhub.com?subject=SoldierHub%20Contact%20%2F%20Feedback"
            onClick={handleNavigate}
            className="break-all text-xs font-bold underline-offset-4 hover:underline"
            style={{ color: T.navy }}
          >
            support@soldierhub.com
          </a>
        </div>
      </div>
    </div>
  );
}
