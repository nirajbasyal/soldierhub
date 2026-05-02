"use client";
import { ChevronRight } from "lucide-react";
import { T } from "@/lib/theme";

export default function MenuItem({ icon: Icon, label, hint, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border p-3.5 flex items-center gap-3 text-left transition-shadow hover:shadow-sm"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: danger ? T.redBg : T.surface }}
      >
        <Icon size={16} strokeWidth={2.25} style={{ color: danger ? T.red : T.text }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: danger ? T.red : T.text }}>{label}</div>
        {hint && <div className="text-xs mt-0.5" style={{ color: T.textSubtle }}>{hint}</div>}
      </div>
      <ChevronRight size={16} style={{ color: T.textSubtle }} className="shrink-0" />
    </button>
  );
}
