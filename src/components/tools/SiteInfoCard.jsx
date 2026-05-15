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
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      {/* Header */}
      <div
        className="p-5 border-b relative overflow-hidden"
        style={{
          borderColor: "#D5E2F2",
          background:
            "linear-gradient(135deg, rgba(220,232,247,0.95) 0%, rgba(253,254,255,0.96) 55%, rgba(253,236,240,0.88) 100%)",
        }}
      >
        <div className="absolute left-0 top-0 h-full w-1.5 bg-[#B31942]" />
        <div className="absolute right-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />

        <div className="flex flex-col items-start pl-1">
          <Image
            src={SIDEBAR_LOGO_SRC}
            alt="SoldierHub logo"
            width={260}
            height={120}
            className="h-20 w-auto object-contain"
            priority={false}
          />
        </div>
      </div>

      <div className="p-5">
        {/* Disclaimer */}
        <div
          className="rounded-2xl border px-3.5 py-3 flex gap-2.5"
          style={{
            background:
              "linear-gradient(135deg, rgba(244,248,253,0.95), rgba(253,254,255,0.95))",
            borderColor: "#D5E2F2",
          }}
        >
          <ShieldCheck
            size={16}
            className="shrink-0 mt-0.5"
            style={{ color: T.blue }}
          />

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
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-center transition-opacity hover:opacity-75"
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
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-center transition-opacity hover:opacity-75"
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
        <div
          className="mt-4 pt-4 border-t"
          style={{ borderColor: T.borderSoft }}
        >
          <p
            className="text-[11px] uppercase tracking-wider font-semibold mb-1"
            style={{ color: T.textSubtle }}
          >
            Contact Us
          </p>

          <a
            href="mailto:support@soldierhub.com?subject=SoldierHub%20Contact%20%2F%20Feedback"
            onClick={handleNavigate}
            className="text-sm font-semibold break-all hover:underline underline-offset-4"
            style={{ color: T.navy }}
          >
            support@soldierhub.com
          </a>
        </div>
      </div>
    </div>
  );
}
