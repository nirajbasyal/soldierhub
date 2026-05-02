"use client";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";

export default function CategoryStrip({ selected, counts, onSelect }) {
  return (
    <div className="overflow-x-auto no-scrollbar -mx-4 md:mx-0 px-4 md:px-0">
      <div className="flex gap-2 pb-1">
        {CATEGORIES.map((c) => {
          const active = c.key === selected;
          const s = TONE_STYLES[c.tone];
          return (
            <button
              key={c.key}
              onClick={() => onSelect(c.key)}
              className="px-3.5 h-9 rounded-full text-sm font-medium border whitespace-nowrap transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: active ? s.bg : T.card,
                color: active ? s.text : T.textMuted,
                borderColor: active ? s.border : T.border,
              }}
            >
              {c.label}
              {counts[c.key] > 0 && (
                <span
                  className="text-[11px] px-1.5 rounded-full tabular-nums"
                  style={{
                    backgroundColor: active ? "rgba(255,255,255,0.5)" : T.borderSoft,
                    color: active ? s.text : T.textSubtle,
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
