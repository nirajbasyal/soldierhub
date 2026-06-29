"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, Link2 } from "lucide-react";
import { T } from "@/lib/theme";

function MobileAction({ icon: Icon, title, subtitle, href, disabled = false, badge, tone = "default" }) {
  const isPrimary = tone === "primary";
  const isSecondary = tone === "secondary";

  const cardStyle = disabled
    ? {
        background: "linear-gradient(135deg, rgba(248,251,255,0.98) 0%, rgba(238,246,255,0.98) 100%)",
        borderColor: "rgba(30,78,140,0.18)",
        boxShadow: "0 10px 22px rgba(7,27,51,0.055)",
      }
    : isPrimary
      ? {
          background: "linear-gradient(135deg, #B31942 0%, #C91F52 52%, #8F1231 100%)",
          borderColor: "rgba(255,255,255,0.26)",
          boxShadow: "0 14px 26px rgba(179,25,66,0.28)",
        }
      : isSecondary
        ? {
            background: "linear-gradient(135deg, #FFFFFF 0%, #EEF6FF 100%)",
            borderColor: "rgba(30,78,140,0.22)",
            boxShadow: "0 10px 22px rgba(7,27,51,0.065)",
          }
        : {
            background: "linear-gradient(180deg, #FFFFFF 0%, #F5F8FD 100%)",
            borderColor: "rgba(30,78,140,0.15)",
            boxShadow: "0 8px 18px rgba(7,27,51,0.045)",
          };

  const iconStyle = disabled
    ? { backgroundColor: "rgba(30,78,140,0.09)", color: T.textMuted }
    : isPrimary
      ? { backgroundColor: "rgba(255,255,255,0.20)", color: "#FFFFFF" }
      : { backgroundColor: "rgba(30,78,140,0.10)", color: T.blue || T.navy };

  const titleColor = disabled ? T.navy : isPrimary ? "#FFFFFF" : T.navy;
  const subtitleColor = disabled ? T.textMuted : isPrimary ? "rgba(255,255,255,0.82)" : T.textMuted;
  const chevronColor = disabled ? T.textSubtle : isPrimary ? "rgba(255,255,255,0.78)" : T.textSubtle;

  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={iconStyle}>
        <Icon size={19} strokeWidth={2.65} />
      </span>

      <span className="min-w-0 flex-1 pr-1">
        <span className="block truncate text-[14.5px] font-black leading-4" style={{ color: titleColor }}>
          {title}
        </span>
        <span className="mt-1 block truncate text-[11px] font-bold leading-3" style={{ color: subtitleColor }}>
          {subtitle}
        </span>
      </span>

      {badge ? (
        <span
          className="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-[0.11em]"
          style={{ backgroundColor: "rgba(204,129,24,0.14)", color: T.amber }}
        >
          {badge}
        </span>
      ) : (
        <ChevronRight size={16} className="shrink-0 transition group-hover:translate-x-0.5" style={{ color: chevronColor }} />
      )}
    </>
  );

  const className = "group relative flex min-h-[66px] items-center gap-2.5 overflow-hidden rounded-[22px] border px-3 py-2.5 text-left transition active:scale-[0.985]";

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
