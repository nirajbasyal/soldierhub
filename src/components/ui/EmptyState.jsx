"use client";
import { T } from "@/lib/theme";

export default function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="text-center py-10 px-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ backgroundColor: T.surface }}
      >
        <Icon size={20} style={{ color: T.textSubtle }} />
      </div>
      <div className="text-sm font-semibold" style={{ color: T.text }}>{title}</div>
      <div className="text-xs mt-1" style={{ color: T.textMuted }}>{body}</div>
    </div>
  );
}
