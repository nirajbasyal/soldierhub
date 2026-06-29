"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, Link2 } from "lucide-react";
import { T } from "@/lib/theme";

function MobileAction({ icon: Icon, title, subtitle, href, disabled = false, badge, tone = "default" }) {
  const isPrimary = tone === "primary";
  const isSecondary = tone === "secondary";

  const cardStyle = isPrimary
    ? {
        background: "linear-gradient(135deg, #B31942 0%, #C91F52 52%, #8F1231 100%)",
        borderColor: "rgba(255,255,255,0.26)",
        boxShadow: "0 14px 26px rgba(179,25,66,0.26)",
      }
    : isSecondary
      ? {
          background: "linear-gradient(135deg, #071B33 0%, #143A62 58%, #1E4E8C 100%)",
          borderColor: "rgba(255,255,255,0.20)",
          boxShadow: "0 14px 26px rgba(7,27,51,0.18)",
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

  const titleColor = isPrimary || isSecondary ? "#FFFFFF" : T.navy;
  const subtitleColor = isPrimary || isSecondary ? "rgba(255,255,255,0.82)" : T.textMuted;
  const chevronColor = isPrimary || isSecondary ? "rgba(255,255,255,0.80)" : T.textSubtle;

  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={iconStyle}>
        <Icon size={20} strokeWidth={2.65} />
      </span>

      <span className="min-w-0 flex-1 pr-2">
        <span className="block text-[16px] font-black leading-5" style={{ color: titleColor }}>
          {title}
        </span>
        <span className="mt-1 block text-[12px] font-bold leading-4" style={{ color: subtitleColor }}>
          {subtitle}
        </span>
      </span>

      {badge ? (
        <span
          className="shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]"
          style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "#FFFFFF" }}
        >
          {badge}
        </span>
      ) : (
        <ChevronRight size={17} className="shrink-0 transition group-hover:translate-x-0.5" style={{ color: chevronColor }} />
      )}
    </>
  );

  const className = "group relative flex min-h-[72px] items-center gap-3 overflow-hidden rounded-[24px] border px-3.5 py-3 text-left transition active:scale-[0.985]";

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
    <div className="grid grid-cols-1 gap-2 lg:hidden" aria-label="Quick tools">
      <MobileAction icon={BookOpen} title="Board Prep" subtitle="Study questions" href="/tools/board-prep/study" tone="primary" />
      <MobileAction icon={Link2} title="Resources" subtitle="Helpful links" disabled badge="Soon" tone="secondary" />
    </div>
  );
}
