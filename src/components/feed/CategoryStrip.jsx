"use client";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";

export default function CategoryStrip({ selected, counts, onSelect }) {
  return (
    <div className="overflow-x-auto no-scrollbar -mx-4 md:mx-0 px-4 md:px-0">
      <div
        className="flex gap-2 p-2 rounded-[24px] border sh-card-premium"
        style={{
          background:
            "linear-gradient(135deg, rgba(253,254,255,0.92), rgba(220,232,247,0.72))",
          borderColor: T.border,
        }}
      >
        {CATEGORIES.map((c) => {
          const active = c.key === selected;
          const s = TONE_STYLES[c.tone];
          return (
            <button
              key={c.key}
              onClick={() => onSelect(c.key)}
              className="px-3.5 h-10 rounded-2xl text-sm font-semibold border whitespace-nowrap transition-all flex items-center gap-1.5"
              style={{
                background: active
                  ? c.key === "All"
                    ? "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)"
                    : s.bg
                  : "rgba(253,254,255,0.60)",
                color: active && c.key === "All" ? "#FFFFFF" : active ? s.text : T.textMuted,
                borderColor: active ? (c.key === "All" ? "#071B33" : s.border) : "transparent",
                boxShadow: active ? "0 10px 22px rgba(7,27,51,0.12)" : "none",
              }}
            >
              {c.label}
              {counts[c.key] > 0 && (
                <span
                  className="text-[11px] px-1.5 rounded-full tabular-nums"
                  style={{
                    backgroundColor:
                      active && c.key === "All"
                        ? "rgba(255,255,255,0.18)"
                        : active
                        ? "rgba(255,255,255,0.55)"
                        : T.borderSoft,
                    color: active && c.key === "All" ? "#FFFFFF" : active ? s.text : T.textSubtle,
                  }}
                >
                  {counts[c.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
