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
    <div className="relative w-screen max-w-full md:w-full">
      <div ref={scrollRef} className="overflow-x-auto no-scrollbar">
        <div className="w-max min-w-full pr-12">
          <div
            className="inline-flex min-w-full items-center gap-1.5 rounded-none border-y border-x-0 p-1.5 shadow-sm md:rounded-[22px] md:border md:p-2 md:gap-2"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(244,248,253,0.95) 100%)",
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
                  className="shrink-0 whitespace-nowrap rounded-[16px] px-3.5 h-10 text-sm font-semibold transition-all duration-150 border md:rounded-[18px] md:px-4 md:h-11"
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

      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end pl-8 pr-1.5 md:pr-2"
        style={{
          background:
            "linear-gradient(90deg, rgba(248,247,244,0) 0%, rgba(248,247,244,0.92) 58%, rgba(248,247,244,1) 100%)",
        }}
      >
        <button
          type="button"
          aria-label="Slide categories"
          onClick={slideCategories}
          className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full border shadow-sm transition active:scale-95 md:h-9 md:w-9"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: T.border,
            color: T.textMuted,
          }}
        >
          <ChevronRight size={17} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
