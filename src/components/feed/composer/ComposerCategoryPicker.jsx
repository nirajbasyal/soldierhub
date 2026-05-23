"use client";

import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";
import { COMPOSER_CATEGORY_LABELS } from "./composerUtils";

export default function ComposerCategoryPicker({ category, onSelectCategory, submitting = false }) {
  return (
    <div className="relative -mx-1 mb-3">
      <div className="overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex w-max gap-2 px-1 pr-14">
          {CATEGORIES.filter((c) => c.key !== "All").map((c) => {
            const active = c.key === category;
            const s = TONE_STYLES[c.tone];
            const label = COMPOSER_CATEGORY_LABELS[c.label] || COMPOSER_CATEGORY_LABELS[c.key] || c.label;

            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onSelectCategory(c.key)}
                disabled={submitting}
                className="h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  backgroundColor: active ? s.bg : "#FFFFFF",
                  color: active ? s.text : T.textMuted,
                  borderColor: active ? s.border : T.border,
                  boxShadow: active ? "0 10px 20px rgba(11,28,44,0.06)" : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-end pr-2"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.82) 62%, rgba(255,255,255,1) 100%)",
        }}
      >
        <ChevronRight size={22} strokeWidth={2.7} style={{ color: T.textSubtle }} />
      </div>
    </div>
  );
}
