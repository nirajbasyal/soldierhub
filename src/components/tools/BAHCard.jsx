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
      className="rounded-xl px-3 py-2 text-sm font-semibold transition"
      style={{
        backgroundColor: active ? T.navy : "#FFFFFF",
        color: active ? "#FFFFFF" : T.text,
        border: `1px solid ${active ? T.navy : T.border}`,
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
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: T.goldBg }}
        >
          <Calculator size={20} style={{ color: T.gold }} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="text-lg font-semibold leading-none"
            style={{ color: T.navy }}
          >
            BAH Estimate
          </h3>

          <p className="mt-1 text-xs" style={{ color: T.textSubtle }}>
            {location?.label} · {location?.city} · {bahData.year}
          </p>
        </div>
      </div>

      {/* Rank chooser */}
      <div className="mt-4">
        <label
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: T.textSubtle }}
        >
          Choose Rank
        </label>

        <select
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="mt-2 w-full rounded-xl border px-3 py-3 text-sm font-semibold outline-none"
          style={{
            backgroundColor: "#FFFFFF",
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
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: T.textSubtle }}
        >
          Dependency Status
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <DependencyButton
            active={dependencyStatus === "with"}
            onClick={() => setDependencyStatus("with")}
          >
            With
          </DependencyButton>

          <DependencyButton
            active={dependencyStatus === "without"}
            onClick={() => setDependencyStatus("without")}
          >
            Without
          </DependencyButton>
        </div>
      </div>

      {/* Result below rank/dependency */}
      <div
        className="mt-4 rounded-2xl border px-4 py-4"
        style={{
          backgroundColor: "#F8F3E4",
          borderColor: "#E9DFC4",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-[0.12em]"
              style={{ color: T.textSubtle }}
            >
              Monthly BAH
            </div>

            <div
              className="mt-1 text-3xl font-semibold tabular-nums"
              style={{ color: T.navy }}
            >
              {formatMoney(estimate.monthlyBah)}
            </div>

            <div className="mt-1 text-xs" style={{ color: T.textMuted }}>
              {rank} ·{" "}
              {dependencyStatus === "with"
                ? "With dependents"
                : "Without dependents"}
            </div>
          </div>

          <Home size={28} style={{ color: T.gold }} />
        </div>

        <div
          className="mt-3 rounded-xl px-3 py-2 text-sm"
          style={{
            backgroundColor: "#FFFFFF",
            color: T.text,
          }}
        >
          Annual estimate:{" "}
          <span className="font-semibold tabular-nums" style={{ color: T.navy }}>
            {formatMoney(estimate.annualBah)}
          </span>
        </div>
      </div>

      {/* Note */}
      <div
        className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs leading-relaxed"
        style={{
          backgroundColor: "#F6F7F9",
          color: T.textMuted,
        }}
      >
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>Estimate only. Confirm official rate with DTMO or finance.</span>
      </div>
    </div>
  );
}