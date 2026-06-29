"use client";

import Link from "next/link";
import { BookOpen, Link2 } from "lucide-react";
import { T } from "@/lib/theme";

function MobileAction({ icon: Icon, title, subtitle, href, disabled = false, badge, tone = "default" }) {
  const isPrimary = tone === "primary";
  const isSecondary = tone === "secondary";

  const cardStyle = isPrimary
    ? {
        background: "linear-gradient(135deg, #B31942 0%, #C91F52 52%, #8F1231 100%)",
        borderColor: "rgba(255,255,255,0.26)",
        boxShadow: "0 12px 22px rgba(179,25,66,0.24)",
      }
    : isSecondary
      ? {
          background: "linear-gradient(135deg, #071B33 0%, #143A62 58%, #1E4E8C 100%)",
          borderColor: "rgba(255,255,255,0.20)",
          boxShadow: "0 12px 22px rgba(7,27,51,0.16)",
        }
      : {
          background: "linear-gradient(180deg, #FFFFFF 0%, #F5F8FD 100%)",
          borderColor: "rgba(30,78,140,0.15)",
          boxShadow: "0 8px 18px rgba(7,27,51,0.045)",
        };

  const iconStyle = isPrimary
    ? { backgroundColor: "rgba(255,255,255,0.20)", color: "#FFFFFF" }
    : isSecondary
      ? { backgroundColor: "rgba(255,255,255,0.16)", color: "#FFFFFF" }
      : { backgroundColor: "rgba(30,78,140,0.10)", color: T.blue || T.navy };

  const textColor = isPrimary || isSecondary ? "#FFFFFF" : T.navy;
  const mutedTextColor = isPrimary || isSecondary ? "rgba(255,255,255,0.82)" : T.textMuted;

  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl" style={iconStyle}>
        <Icon size={18} strokeWidth={2.65} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block whitespace-nowrap text-[13px] font-black leading-4 tracking-[-0.01em]" style={{ color: textColor }}>
          {title}
        </span>
        <span className="mt-0.5 block whitespace-nowrap text-[10.5px] font-bold leading-3 tracking-[-0.01em]" style={{ color: mutedTextColor }}>
          {subtitle}
        </span>
      </span>

      {badge && (
        <span
          className="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em]"
          style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "#FFFFFF" }}
        >
          {badge}
        </span>
      )}
    </>
  );

  const className = "group relative flex min-h-[64px] items-center gap-2 overflow-hidden rounded-[21px] border px-2.5 py-2 text-left transition active:scale-[0.985]";

  if (disabled) {
    return (
      <button type="button" disabled className={`${className} cursor-not-allowed`} style={cardStyle} aria-label={`${title} coming soon`}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={`${className} hover:-translate-y-0.5 hover:shadow-md`} style={cardStyle} aria-label={`Open ${title}`}>
      {content}
    </Link>
  );
}

export default function MobileFeedQuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 lg:hidden" aria-label="Quick tools">
      <MobileAction icon={BookOpen} title="Board Prep" subtitle="Study questions" href="/tools/board-prep/study" tone="primary" />
      <MobileAction icon={Link2} title="Resources" subtitle="Helpful links" disabled badge="Soon" tone="secondary" />
    </div>
  );
}
