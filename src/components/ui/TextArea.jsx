"use client";
import { T } from "@/lib/theme";

export default function TextArea({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium mb-1.5" style={{ color: T.textMuted }}>{label}</span>}
      <textarea
        {...props}
        className={`w-full rounded-xl border text-sm outline-none transition-shadow p-4 resize-none placeholder:text-[#A8ABB2] ${className}`}
        style={{
          backgroundColor: T.card,
          borderColor: error ? T.red : T.border,
          color: T.text,
          minHeight: 110,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = T.navy)}
        onBlur={(e) => (e.currentTarget.style.borderColor = error ? T.red : T.border)}
      />
      {error && <span className="block text-xs mt-1" style={{ color: T.red }}>{error}</span>}
    </label>
  );
}
