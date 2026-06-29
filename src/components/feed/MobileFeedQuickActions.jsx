"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, Link2 } from "lucide-react";
import { T } from "@/lib/theme";

function MobileAction({ icon: Icon, title, subtitle, href, disabled = false, badge }) {
  const content = (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: disabled ? "rgba(142,161,182,0.13)" : "rgba(179,25,66,0.10)",
          color: disabled ? T.textSubtle : T.brandRed,
        }}
      >
        <Icon size={18} strokeWidth={2.55} />
      </span>

      <span className="min-w-0 flex-1 pr-1">
        <span className="block truncate text-[13.5px] font-black leading-4" style={{ color: T.navy }}>
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[10.5px] font-semibold leading-3" style={{ color: T.textMuted }}>
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
        <ChevronRight size={15} className="shrink-0 transition group-hover:translate-x-0.5" style={{ color: T.textSubtle }} />
      )}
    </>
  );

  const className = "group relative flex min-h-[58px] items-center gap-2.5 overflow-hidden rounded-[20px] border px-2.5 py-2 text-left shadow-sm transition active:scale-[0.985]";
  const style = {
    background: disabled
      ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,248,251,0.98) 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F5F8FD 100%)",
    borderColor: disabled ? "rgba(142,161,182,0.25)" : "rgba(30,78,140,0.15)",
    boxShadow: "0 8px 18px rgba(7,27,51,0.045)",
  };

  if (disabled) {
    return (
      <button type="button" disabled className={`${className} cursor-not-allowed`} style={style} aria-label={`${title} coming soon`}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={`${className} hover:-translate-y-0.5 hover:shadow-md`} style={style} aria-label={`Open ${title}`}>
      {content}
    </Link>
  );
}

export default function MobileFeedQuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 lg:hidden" aria-label="Quick tools">
      <MobileAction icon={BookOpen} title="Board Prep" subtitle="Study questions" href="/tools/board-prep/study" />
      <MobileAction icon={Link2} title="Resources" subtitle="Helpful links" disabled badge="Soon" />
    </div>
  );
}
