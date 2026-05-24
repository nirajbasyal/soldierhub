"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";
import { COMPOSER_CATEGORY_LABELS } from "./composerUtils";

export default function ComposerCategoryPicker({ category, onSelectCategory, submitting = false }) {
  const scrollRef = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const node = scrollRef.current;
    if (!node) return;

    const remaining = node.scrollWidth - node.clientWidth - node.scrollLeft;
    setCanScrollRight(remaining > 8);
  };

  const scrollCategoriesRight = () => {
    const node = scrollRef.current;
    if (!node) return;

    node.scrollBy({
      left: Math.max(180, Math.round(node.clientWidth * 0.72)),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    updateScrollState();

    const node = scrollRef.current;
    if (!node || typeof window === "undefined") return undefined;

    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const raf = window.requestAnimationFrame(updateScrollState);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      window.cancelAnimationFrame?.(raf);
    };
  }, []);

  return (
    <div className="relative -mx-1 mb-3">
      <div ref={scrollRef} className="overflow-x-auto no-scrollbar scroll-smooth">
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

      <button
        type="button"
        onClick={scrollCategoriesRight}
        disabled={!canScrollRight}
        className="absolute inset-y-0 right-0 z-10 flex w-14 items-center justify-end pr-2 transition disabled:pointer-events-none disabled:opacity-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.88) 54%, rgba(255,255,255,1) 100%)",
        }}
        aria-label="Scroll categories right"
        title="Scroll categories"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:-translate-y-0.5 active:scale-[0.96]"
          style={{
            backgroundColor: "rgba(255,255,255,0.98)",
            borderColor: "rgba(188,207,229,0.95)",
            color: T.navy,
            boxShadow: "0 12px 24px rgba(11,28,44,0.18), 0 2px 6px rgba(11,28,44,0.08)",
          }}
        >
          <ChevronRight size={20} strokeWidth={3} />
        </span>
      </button>
    </div>
  );
}
