"use client";

import { useMemo, useState } from "react";
import { Calculator, Home, Info } from "lucide-react";
import { T } from "@/lib/theme";
import bahData from "@/data/bah/2026.json";

const DEFAULT_LOCATION_KEY = "fort-bliss-tx";

const RANKS = [
  "E-1",
  "E-2",
  "E-3",
  "E-4",
  "E-5",
  "E-6",
  "E-7",
  "E-8",
  "E-9",

  "W-1",
  "W-2",
  "W-3",
  "W-4",
  "W-5",

  "O-1E",
  "O-2E",
  "O-3E",
  "O-1",
  "O-2",
  "O-3",
  "O-4",
  "O-5",
  "O-6",
  "O-7",
];

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function DependencyButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl px-3 py-2 text-sm font-bold transition active:scale-[0.98]"
      style={{
        backgroundColor: active ? T.navy : "rgba(255,255,255,0.94)",
        color: active ? "#FFFFFF" : T.text,
        border: `1px solid ${active ? T.navy : T.border}`,
        boxShadow: active ? "0 10px 22px rgba(11,28,44,0.16)" : "0 6px 16px rgba(11,28,44,0.04)",
      }}
    >
      {children}
    </button>
  );
}

export default function BAHCard() {
  const location = bahData.locations[DEFAULT_LOCATION_KEY];

  const [rank, setRank] = useState("E-4");
  const [dependencyStatus, setDependencyStatus] = useState("with");

  const estimate = useMemo(() => {
    const selectedRate = location?.rates?.[rank];
    const monthlyBah = selectedRate?.[dependencyStatus] || 0;

    return {
      monthlyBah,
      annualBah: monthlyBah * 12,
    };
  }, [location, rank, dependencyStatus]);

  return (
    <div
      className="rounded-[28px] border p-4 shadow-sm"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)",
        borderColor: "rgba(188,208,234,0.86)",
        boxShadow: "0 16px 36px rgba(11,28,44,0.07)",
      }}
    >
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#DDE8F3]">
        <div className="h-full w-2/5 rounded-full bg-[#B31942]" />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
          style={{ backgroundColor: "rgba(220,232,247,0.78)", borderColor: "rgba(188,208,234,0.9)" }}
        >
          <Calculator size={20} style={{ color: T.blue }} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-extrabold leading-none tracking-[-0.02em]" style={{ color: T.navy }}>
            BAH Estimate
          </h3>

          <p className="mt-1 text-xs font-medium" style={{ color: T.textSubtle }}>
            {location?.label} · {location?.city} · {bahData.year}
          </p>
        </div>
      </div>

      {/* Rank chooser */}
      <div className="mt-4">
        <label className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
          Choose Rank
        </label>

        <select
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="mt-2 w-full rounded-2xl border px-3 py-3 text-sm font-bold outline-none transition focus:ring-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.96)",
            borderColor: T.border,
            color: T.navy,
          }}
        >
          <optgroup label="Enlisted">
            {RANKS.filter((r) => r.startsWith("E")).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </optgroup>

          <optgroup label="Warrant Officer">
            {RANKS.filter((r) => r.startsWith("W")).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </optgroup>

          <optgroup label="Officer">
            {RANKS.filter((r) => r.startsWith("O")).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Dependency chooser */}
      <div className="mt-4">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
          Dependency Status
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <DependencyButton active={dependencyStatus === "with"} onClick={() => setDependencyStatus("with")}>
            With
          </DependencyButton>

          <DependencyButton active={dependencyStatus === "without"} onClick={() => setDependencyStatus("without")}>
            Without
          </DependencyButton>
        </div>
      </div>

      {/* Result below rank/dependency */}
      <div
        className="mt-4 overflow-hidden rounded-[24px] border px-4 py-4"
        style={{
          background: "linear-gradient(135deg, rgba(238,245,253,0.96) 0%, rgba(255,255,255,0.98) 58%, rgba(255,246,248,0.92) 100%)",
          borderColor: "rgba(188,208,234,0.92)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: T.blue }}>
              Monthly BAH
            </div>

            <div className="mt-1 text-[42px] font-extrabold leading-none tracking-[-0.05em] tabular-nums" style={{ color: T.navy }}>
              {formatMoney(estimate.monthlyBah)}
            </div>

            <div className="mt-2 text-sm font-medium" style={{ color: T.textMuted }}>
              {rank} · {dependencyStatus === "with" ? "With dependents" : "Without dependents"}
            </div>
          </div>

          <div
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[22px] border"
            style={{ backgroundColor: "rgba(255,255,255,0.82)", borderColor: "rgba(188,208,234,0.75)" }}
          >
            <Home size={27} style={{ color: T.navy }} strokeWidth={2.3} />
          </div>
        </div>

        <div
          className="mt-4 rounded-2xl border px-3 py-3 text-sm"
          style={{
            backgroundColor: "rgba(255,255,255,0.82)",
            borderColor: "rgba(255,255,255,0.82)",
            color: T.text,
          }}
        >
          Annual estimate:{" "}
          <span className="font-extrabold tabular-nums" style={{ color: T.navy }}>
            {formatMoney(estimate.annualBah)}
          </span>
        </div>
      </div>

      {/* Note */}
      <div
        className="mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs leading-relaxed"
        style={{
          backgroundColor: "rgba(244,248,253,0.78)",
          borderColor: "rgba(213,226,242,0.9)",
          color: T.textMuted,
        }}
      >
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: T.blue }} />
        <span>Estimate only. Confirm official rate with DTMO or finance.</span>
      </div>
    </div>
  );
}
