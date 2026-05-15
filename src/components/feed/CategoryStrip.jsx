"use client";

import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";

export default function CategoryStrip({ selected, counts, onSelect }) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="w-max min-w-full">
        <div
          className="inline-flex min-w-full items-center gap-2 rounded-[22px] border p-2 shadow-sm"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(244,248,253,0.92) 100%)",
            borderColor: T.border,
          }}
        >
          {CATEGORIES.map((c) => {
            const active = c.key === selected;
            const s = TONE_STYLES[c.tone];

            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onSelect(c.key)}
                className="shrink-0 whitespace-nowrap rounded-[18px] px-4 h-11 text-sm font-semibold transition-all duration-150 border"
                style={{
                  background: active
                    ? c.key === "All"
                      ? "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)"
                      : s.bg
                    : "#FFFFFF",
                  color:
                    active && c.key === "All"
                      ? "#FFFFFF"
                      : active
                      ? s.text
                      : T.textMuted,
                  borderColor:
                    active && c.key === "All"
                      ? "#071B33"
                      : active
                      ? s.border
                      : "transparent",
                  boxShadow: active
                    ? "0 8px 18px rgba(7,27,51,0.10)"
                    : "none",
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{c.label}</span>

                  {counts?.[c.key] > 0 && (
                    <span
                      className="min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center tabular-nums"
                      style={{
                        backgroundColor:
                          active && c.key === "All"
                            ? "rgba(255,255,255,0.18)"
                            : active
                            ? "rgba(255,255,255,0.55)"
                            : T.surface,
                        color:
                          active && c.key === "All"
                            ? "#FFFFFF"
                            : active
                            ? s.text
                            : T.textSubtle,
                      }}
                    >
                      {counts[c.key]}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
