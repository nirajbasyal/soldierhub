"use client";
import { ChevronRight } from "lucide-react";
import { T } from "@/lib/theme";

export default function MenuItem({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
  badge,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className="w-full rounded-xl border p-3.5 flex items-center gap-3 text-left transition-shadow hover:shadow-sm disabled:cursor-not-allowed disabled:hover:shadow-none"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
        opacity: disabled ? 0.82 : 1,
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: danger ? T.redBg : T.surface }}
      >
        <Icon
          size={16}
          strokeWidth={2.25}
          style={{ color: danger ? T.red : T.text }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="text-sm font-semibold truncate"
            style={{ color: danger ? T.red : T.text }}
          >
            {label}
          </div>

          {badge && (
            <span
              className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                backgroundColor: T.amberBg,
                borderColor: "#F2D29A",
                color: T.amber,
              }}
            >
              {badge}
            </span>
          )}
        </div>

        {hint && (
          <div className="text-xs mt-0.5" style={{ color: T.textSubtle }}>
            {hint}
          </div>
        )}
      </div>

      {!disabled && (
        <ChevronRight
          size={16}
          style={{ color: T.textSubtle }}
          className="shrink-0"
        />
      )}
    </button>
  );
}
