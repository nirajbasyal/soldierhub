"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, Link2, Sparkles } from "lucide-react";
import { T } from "@/lib/theme";

function ActionShell({ children, href, disabled = false, ariaLabel }) {
  const className = "group relative flex min-h-[78px] flex-1 overflow-hidden rounded-[1.6rem] border p-3 text-left shadow-sm transition active:scale-[0.985]";
  const style = {
    background: disabled
      ? "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.98) 100%)"
      : "linear-gradient(135deg, #FFFFFF 0%, #F4F8FD 55%, #EEF5FF 100%)",
    borderColor: disabled ? "rgba(142,161,182,0.30)" : "rgba(30,78,140,0.18)",
    boxShadow: disabled ? "0 10px 22px rgba(7,27,51,0.04)" : "0 12px 28px rgba(7,27,51,0.07)",
  };

  if (disabled) {
    return (
      <button type="button" disabled aria-label={ariaLabel} className={`${className} cursor-not-allowed opacity-95`} style={style}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href} aria-label={ariaLabel} className={`${className} hover:-translate-y-0.5 hover:shadow-md`} style={style}>
      {children}
    </Link>
  );
}

export default function MobileFeedQuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:hidden" aria-label="Quick tools">
      <ActionShell href="/tools/board-prep" ariaLabel="Open Board Prep">
        <div className="absolute -right-4 -top-5 h-16 w-16 rounded-full bg-[#1E4E8C]/10" />
        <div className="absolute -bottom-8 -left-6 h-20 w-20 rounded-full bg-[#B31942]/8" />

        <div className="relative flex w-full items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
            <BookOpen size={20} strokeWidth={2.5} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[15px] font-black leading-tight" style={{ color: T.navy }}>
              Board Prep
            </span>
            <span className="mt-1 block truncate text-[11px] font-semibold" style={{ color: T.textMuted }}>
              Daily quiz & study
            </span>
          </span>

          <ChevronRight size={17} className="shrink-0 transition group-hover:translate-x-0.5" style={{ color: T.textSubtle }} />
        </div>
      </ActionShell>

      <ActionShell disabled ariaLabel="Resources coming soon">
        <div className="absolute -right-5 -top-6 h-16 w-16 rounded-full bg-[#CC8118]/10" />
        <div className="absolute -bottom-8 -left-6 h-20 w-20 rounded-full bg-[#1E4E8C]/7" />

        <div className="relative flex w-full items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(204,129,24,0.12)", color: T.amber }}>
            <Link2 size={20} strokeWidth={2.5} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[15px] font-black leading-tight" style={{ color: T.navy }}>
              Resources
            </span>
            <span className="mt-1 block truncate text-[11px] font-semibold" style={{ color: T.textMuted }}>
              Helpful links
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]" style={{ backgroundColor: "rgba(204,129,24,0.14)", color: T.amber }}>
            <Sparkles size={10} strokeWidth={2.8} />
            Soon
          </span>
        </div>
      </ActionShell>
    </div>
  );
}
