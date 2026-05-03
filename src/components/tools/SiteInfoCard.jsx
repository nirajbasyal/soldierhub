"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, ShieldCheck, ExternalLink } from "lucide-react";
import { T } from "@/lib/theme";

export default function SiteInfoCard() {
  const subject = encodeURIComponent("SoldierHub Contact / Feedback");
  const body = encodeURIComponent(
    "Hello SoldierHub team,\n\nI wanted to contact you about:\n\n"
  );

  const mailtoLink = `mailto:support@soldierhub.com?subject=${subject}&body=${body}`;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      {/* Header */}
      <div
        className="p-5 border-b"
        style={{
          borderColor: T.borderSoft,
          backgroundColor: "#FBFAF6",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm overflow-hidden"
            style={{
              backgroundColor: T.navy,
              borderColor: "rgba(11, 28, 44, 0.12)",
            }}
          >
            <Image
              src="/brand/soldierhub-icon.png"
              alt="SoldierHub logo"
              width={42}
              height={42}
              className="w-10 h-10 object-contain"
              priority={false}
            />
          </div>

          <div className="min-w-0">
            <h3
              className="text-xl font-bold leading-tight tracking-tight"
              style={{ color: T.navy }}
            >
              Soldier Hub
            </h3>

            <p
              className="text-xs mt-0.5 font-medium tracking-wide"
              style={{ color: T.textSubtle }}
            >
              Connect · Share · Support
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-5">
        <div
          className="rounded-2xl px-3.5 py-3 flex gap-2.5"
          style={{ backgroundColor: T.surface }}
        >
          <ShieldCheck
            size={16}
            className="shrink-0 mt-0.5"
            style={{ color: T.gold }}
          />

          <p
            className="text-xs leading-relaxed"
            style={{ color: T.textMuted }}
          >
            Independent and unofficial. Not affiliated with, endorsed by,
            sponsored by, or controlled by DoD, the U.S. Army, or Fort Bliss.
          </p>
        </div>

        {/* Links */}
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/privacy"
            className="group rounded-xl px-3.5 py-3 text-sm font-semibold flex items-center justify-between transition-all hover:translate-x-0.5"
            style={{
              color: T.text,
              backgroundColor: "#FBFAF6",
              border: `1px solid ${T.borderSoft}`,
            }}
          >
            <span>Privacy Policy</span>
            <ExternalLink
              size={14}
              className="opacity-50 group-hover:opacity-80"
            />
          </Link>

          <Link
            href="/terms"
            className="group rounded-xl px-3.5 py-3 text-sm font-semibold flex items-center justify-between transition-all hover:translate-x-0.5"
            style={{
              color: T.text,
              backgroundColor: "#FBFAF6",
              border: `1px solid ${T.borderSoft}`,
            }}
          >
            <span>Terms of Use</span>
            <ExternalLink
              size={14}
              className="opacity-50 group-hover:opacity-80"
            />
          </Link>

          <a
            href={mailtoLink}
            className="group rounded-xl px-3.5 py-3 text-sm font-semibold flex items-center justify-between transition-all hover:translate-x-0.5"
            style={{
              color: T.text,
              backgroundColor: "#FBFAF6",
              border: `1px solid ${T.borderSoft}`,
            }}
          >
            <span className="flex items-center gap-2">
              <Mail size={15} style={{ color: T.gold }} />
              Contact / Feedback
            </span>

            <ExternalLink
              size={14}
              className="opacity-50 group-hover:opacity-80"
            />
          </a>
        </div>

        <div
          className="mt-4 pt-4 border-t"
          style={{ borderColor: T.borderSoft }}
        >
          <p
            className="text-[11px] uppercase tracking-wider font-semibold mb-1"
            style={{ color: T.textSubtle }}
          >
            Support email
          </p>

          <a
            href="mailto:support@soldierhub.com"
            className="text-xs font-medium break-all hover:underline underline-offset-4"
            style={{ color: T.navy }}
          >
            support@soldierhub.com
          </a>
        </div>
      </div>
    </div>
  );
}