"use client";

import { Activity } from "lucide-react";
import { T } from "@/lib/theme";

/**
 * Disabled placeholder card for the AFT Score Calculator. Mirrors the
 * disabled AFT row in the mobile menu so the laptop sidebar shows the
 * same unavailable state. Non-interactive until the feature is ready.
 */
export default function AFTScoreCard() {
  return (
    <div
      className="w-full select-none rounded-2xl border p-4 grayscale cursor-not-allowed"
      style={{
        backgroundColor: "rgba(234,240,248,0.72)",
        borderColor: "rgba(207,218,232,0.84)",
        opacity: 0.68,
      }}
      aria-disabled="true"
      title="AFT Score Calculator is temporarily unavailable"
    >
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(207,218,232,0.55)" }}
        >
          <Activity size={20} style={{ color: T.textSubtle }} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold leading-none" style={{ color: T.textSubtle }}>
              AFT Score Calculator
            </h3>
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                backgroundColor: "rgba(255,255,255,0.65)",
                borderColor: "rgba(207,218,232,0.9)",
                color: T.textSubtle,
              }}
            >
              Soon
            </span>
          </div>

          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: T.textMuted }}>
            Temporarily unavailable
          </p>
        </div>
      </div>
    </div>
  );
}
