"use client";
import { Compass } from "lucide-react";
import { GATES } from "@/lib/constants";
import { T } from "@/lib/theme";

function gateStatus(hours) {
  if (hours === "24/7") return { label: "24/7", bg: T.greenBg, color: T.green };
  if (hours === "Closed") return { label: "Closed", bg: T.redBg, color: T.red };
  return { label: "Limited", bg: T.goldBg, color: T.gold };
}

export default function GateHoursCard() {
  return (
    <div className="rounded-2xl border" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textSubtle }}>
            Gate Hours
          </div>
          <div className="text-sm font-semibold" style={{ color: T.text }}>Fort Bliss</div>
        </div>
        <Compass size={18} style={{ color: T.gold }} />
      </div>

      <div className="border-t" style={{ borderColor: T.borderSoft }}>
        {GATES.map((g, i) => {
          const status = gateStatus(g.hours);
          return (
            <div
              key={g.name}
              className="px-5 py-3 flex items-start justify-between gap-3"
              style={{ borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}` }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: T.text }}>{g.name}</div>
                <div className="text-xs mt-0.5 leading-relaxed" style={{ color: T.textMuted }}>
                  {g.hours}
                </div>
              </div>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap"
                style={{ backgroundColor: status.bg, color: status.color }}
              >
                {status.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
