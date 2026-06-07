"use client";

import { Activity } from "lucide-react";
import { T } from "@/lib/theme";

/**
 * Disabled placeholder card for the AFT Score Calculator. Mirrors the
 * disabled AFT row in the mobile menu so the laptop sidebar shows the
 * same set of tools. Non-interactive until the feature is built.
 */
export default function AFTScoreCard() {
  return (
    <div
      className="w-full rounded-2xl border p-4 cursor-not-allowed select-none"
      style={{ backgroundColor: T.surface, borderColor: T.borderSoft, opacity: 0.7 }}
      aria-disabled="true"
    >
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(207,218,232,0.45)" }}
        >
          <Activity size={20} style={{ color: T.textSubtle }} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-none" style={{ color: T.textSubtle }}>
            AFT Score Calculator
          </h3>

          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: T.textMuted }}>
            Army fitness score tool
          </p>
        </div>
      </div>
    </div>
  );
}
