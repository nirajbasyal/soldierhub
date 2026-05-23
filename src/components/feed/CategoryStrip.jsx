"use client";

import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";

export default function CategoryStrip({ selected, counts, onSelect }) {
  const scrollRef = useRef(null);

  const slideCategories = () => {
    scrollRef.current?.scrollBy({ left: 220, behavior: "smooth" });
  };

  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-[22px] md:rounded-[24px]">
      <div ref={scrollRef} className="overflow-x-auto no-scrollbar">
        <div className="w-max min-w-full pr-12">
          <div
            className="inline-flex min-w-full items-center gap-1.5 rounded-[22px] border p-1.5 shadow-sm md:rounded-[24px] md:p-2 md:gap-2"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(246,249,253,0.96) 100%)",
              borderColor: "rgba(207,218,232,0.82)",
              boxShadow: "0 10px 24px rgba(11,28,44,0.045)",
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
                  className="shrink-0 whitespace-nowrap rounded-full px-3.5 h-9 text-sm font-bold transition-all duration-150 border md:px-4 md:h-10"
                  style={{
                    background: active
                      ? c.key === "All"
                        ? "linear-gradient(135deg, #071B33 0%, #1D477B 100%)"
                        : s.bg
                      : "rgba(255,255,255,0.74)",
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
                        : "rgba(207,218,232,0.54)",
                    boxShadow: active
                      ? "0 8px 18px rgba(7,27,51,0.10)"
                      : "0 4px 12px rgba(11,28,44,0.025)",
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span>{c.label}</span>

                    {counts?.[c.key] > 0 && (
                      <span
                        className="min-w-[21px] h-[21px] px-1.5 rounded-full text-[10px] font-extrabold inline-flex items-center justify-center tabular-nums"
                        style={{
                          backgroundColor:
                            active && c.key === "All"
                              ? "rgba(255,255,255,0.18)"
                              : active
                              ? "rgba(255,255,255,0.58)"
                              : "rgba(238,244,251,0.92)",
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
            "linear-gradient(90deg, rgba(248,247,244,0) 0%, rgba(248,247,244,0.72) 55%, rgba(248,247,244,0.98) 100%)",
        }}
      >
        <button
          type="button"
          aria-label="Slide categories"
          onClick={slideCategories}
          className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full border shadow-sm transition active:scale-95 md:h-9 md:w-9"
          style={{
            backgroundColor: "rgba(255,255,255,0.96)",
            borderColor: "rgba(207,218,232,0.9)",
            color: T.navy,
          }}
        >
          <ChevronRight size={17} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
