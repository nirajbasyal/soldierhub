"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Flame, ChevronRight } from "lucide-react";
import { T } from "@/lib/theme";

/**
 * Compact sidebar card promoting the daily Board Prep quiz.
 * Mirrors the visual language of BAHCard / GateHoursCard so it sits
 * naturally in the desktop feed sidebar.
 */
export default function BoardPrepCard() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/tools/board-prep")}
      className="w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: T.redBg }}
        >
          <BookOpen size={20} style={{ color: T.brandRed }} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold leading-none" style={{ color: T.navy }}>
              Board Prep
            </h3>
            <ChevronRight size={18} style={{ color: T.textSubtle }} />
          </div>

          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: T.textMuted }}>
            5 promotion board questions a day. Build your streak.
          </p>
        </div>
      </div>

      <div
        className="mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
        style={{ backgroundColor: "#FFF1D7", borderColor: "#F2D29A", color: T.amber }}
      >
        <Flame size={14} />
        Daily streak · ~5 minutes
      </div>
    </button>
  );
}
