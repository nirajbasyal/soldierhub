"use client";
import { T } from "@/lib/theme";

export default function TextInput({ icon: Icon, label, hint, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-bold mb-1.5" style={{ color: T.textMuted }}>{label}</span>}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textSubtle }}>
            <Icon size={16} strokeWidth={2.25} />
          </span>
        )}
        <input
          {...props}
          className={`w-full h-11 rounded-xl border text-sm outline-none transition-shadow placeholder:text-[#A8ABB2] ${Icon ? "pl-10" : "pl-4"} pr-4 ${className}`}
          style={{
            backgroundColor: T.card,
            borderColor: error ? T.red : T.border,
            color: T.text,
            boxShadow: "0 1px 0 rgba(11,28,44,0.02)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = T.navy)}
          onBlur={(e) => (e.currentTarget.style.borderColor = error ? T.red : T.border)}
        />
      </div>
      {error && <span className="block text-xs mt-1" style={{ color: T.red }}>{error}</span>}
      {hint && !error && <span className="block text-xs mt-1" style={{ color: T.textSubtle }}>{hint}</span>}
    </label>
  );
}
