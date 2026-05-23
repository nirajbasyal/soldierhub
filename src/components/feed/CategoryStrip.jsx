"use client";

import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";

const SHORT_LABELS = {
  "General Q&A": "General",
  "PCS / Moving": "PCS",
  "On-Base Guide": "On-base",
  "Local Recommendations": "Local",
  "Things to Do": "Things",
  "Family / Spouse": "Family",
  "Events & Community": "Events",
};

export default function CategoryStrip({ selected, counts, onSelect }) {
  const scrollRef = useRef(null);

  const slideCategories = () => {
    scrollRef.current?.scrollBy({ left: 260, behavior: "smooth" });
  };

  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-[22px] md:rounded-[24px]">
      <div ref={scrollRef} className="overflow-x-auto no-scrollbar" aria-label="Post categories">
        <div className="w-max min-w-full pr-12">
          <div
            className="inline-flex min-w-full items-center gap-1 rounded-[22px] border p-1 shadow-sm md:gap-2 md:rounded-[24px] md:p-2"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,249,253,0.97) 100%)",
              borderColor: "rgba(207,218,232,0.86)",
              boxShadow: "0 10px 24px rgba(11,28,44,0.045)",
            }}
          >
            {CATEGORIES.map((c) => {
              const active = c.key === selected;
              const s = TONE_STYLES[c.tone] || TONE_STYLES.blue;
              const shortLabel = SHORT_LABELS[c.key] || c.label;

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onSelect(c.key)}
                  aria-pressed={active}
                  className="shrink-0 whitespace-nowrap rounded-full border px-3 h-9 text-[13px] font-extrabold tracking-[-0.01em] transition-all duration-150 md:h-10 md:px-4 md:text-sm"
                  style={{
                    background: active
                      ? c.key === "All"
                        ? "linear-gradient(135deg, #071B33 0%, #1D477B 100%)"
                        : s.bg
                      : "rgba(255,255,255,0.78)",
                    color:
                      active && c.key === "All"
                        ? "#FFFFFF"
                        : active
                        ? s.text
                        : T.textMuted,
                    borderColor:
                      active && c.key === "All"
                        ? "rgba(7,27,51,0.92)"
                        : active
                        ? s.border
                        : "rgba(207,218,232,0.60)",
                    boxShadow: active
                      ? "0 8px 18px rgba(7,27,51,0.10), inset 0 1px 0 rgba(255,255,255,0.45)"
                      : "0 4px 12px rgba(11,28,44,0.02)",
                  }}
                >
                  <span className="inline-flex items-center gap-1.5 md:gap-2">
                    <span className="md:hidden">{shortLabel}</span>
                    <span className="hidden md:inline">{c.label}</span>

                    {counts?.[c.key] > 0 && (
                      <span
                        className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black tabular-nums"
                        style={{
                          backgroundColor:
                            active && c.key === "All"
                              ? "rgba(255,255,255,0.18)"
                              : active
                              ? "rgba(255,255,255,0.62)"
                              : "rgba(238,244,251,0.95)",
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

      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end pl-8 pr-1.5 md:pr-2"
        style={{
          background:
            "linear-gradient(90deg, rgba(234,240,248,0) 0%, rgba(234,240,248,0.62) 50%, rgba(234,240,248,0.98) 100%)",
        }}
      >
        <button
          type="button"
          aria-label="Slide categories"
          onClick={slideCategories}
          className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full border shadow-sm transition active:scale-95 md:h-9 md:w-9"
          style={{
            backgroundColor: "rgba(255,255,255,0.98)",
            borderColor: "rgba(207,218,232,0.95)",
            color: T.brandNavy || T.navy,
            boxShadow: "0 8px 18px rgba(7,27,51,0.08)",
          }}
        >
          <ChevronRight size={17} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
