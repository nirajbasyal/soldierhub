"use client";
import { useState } from "react";
import { Calculator, Shield } from "lucide-react";
import { BAH_RATES } from "@/lib/constants";
import { T } from "@/lib/theme";

export default function BAHCard() {
  const [rank, setRank] = useState("E5");
  const [deps, setDeps] = useState(true);
  const rate = BAH_RATES[rank][deps ? "with" : "without"];

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textSubtle }}>
            BAH Estimate
          </div>
          <div className="text-sm font-semibold" style={{ color: T.text }}>Fort Bliss · 79906</div>
        </div>
        <Calculator size={18} style={{ color: T.gold }} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: T.textMuted }}>Rank</span>
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="w-full h-10 rounded-lg border px-2.5 text-sm outline-none"
            style={{ borderColor: T.border, color: T.text, backgroundColor: T.card }}
          >
            {Object.keys(BAH_RATES).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs mb-1" style={{ color: T.textMuted }}>Dependents</span>
          <div className="flex h-10 rounded-lg border p-1" style={{ borderColor: T.border, backgroundColor: T.surface }}>
            {[true, false].map((v) => (
              <button
                key={String(v)}
                onClick={() => setDeps(v)}
                className="flex-1 rounded-md text-sm font-medium transition-all"
                style={{
                  backgroundColor: deps === v ? T.card : "transparent",
                  color: deps === v ? T.navy : T.textMuted,
                  boxShadow: deps === v ? "0 1px 2px rgba(11,28,44,0.06)" : "none",
                }}
              >
                {v ? "With" : "Without"}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div
        className="rounded-xl p-4 mb-3"
        style={{ background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navy90} 100%)` }}
      >
        <div className="text-xs uppercase tracking-wider opacity-70" style={{ color: "#fff" }}>
          Estimated monthly
        </div>
        <div className="text-3xl font-light tabular-nums mt-1 font-serif" style={{ color: "#fff" }}>
          ${rate.toLocaleString()}
        </div>
      </div>

      <div className="text-[11px] leading-relaxed flex items-start gap-1.5" style={{ color: T.textSubtle }}>
        <Shield size={12} className="shrink-0 mt-0.5" />
        Prototype only. Use the official DoD BAH calculator for actual rates.
      </div>
    </div>
  );
}
