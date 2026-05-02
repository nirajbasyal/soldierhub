"use client";
import { TONE_STYLES } from "@/lib/theme";

export default function Badge({ tone = "navy", icon: Icon, children }) {
  const s = TONE_STYLES[tone] || TONE_STYLES.navy;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
    >
      {Icon && <Icon size={12} strokeWidth={2.25} />}
      {children}
    </span>
  );
}
