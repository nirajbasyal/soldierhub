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
        background: active
          ? "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)"
          : "#FFFFFF",
        color: active ? "#FFFFFF" : T.text,
        border: `1px solid ${active ? "#1E4E8C" : T.border}`,
        boxShadow: active ? "0 8px 18px rgba(7,27,51,0.14)" : "none",
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
          style={{ backgroundColor: "rgba(220,232,247,0.95)" }}
        >
          <Calculator size={20} style={{ color: T.blue }} strokeWidth={2.2} />
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
        className="mt-4 rounded-2xl border px-4 py-4 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(220,232,247,0.95) 0%, rgba(253,254,255,0.96) 55%, rgba(253,236,240,0.88) 100%)",
          borderColor: "#BCD0EA",
        }}
      >
        <div className="absolute left-0 top-0 h-full w-1.5 bg-[#B31942]" />
        <div className="absolute right-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />

        <div className="flex items-center justify-between gap-3 pl-2">
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-[0.12em]"
              style={{ color: T.blue }}
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

          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(7,27,51,0.08)" }}
          >
            <Home size={25} style={{ color: T.navy }} />
          </div>
        </div>

        <div
          className="mt-3 ml-2 rounded-xl px-3 py-2 text-sm"
          style={{
            backgroundColor: "rgba(255,255,255,0.78)",
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
        className="mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed"
        style={{
          background:
            "linear-gradient(135deg, rgba(244,248,253,0.95), rgba(253,254,255,0.95))",
          borderColor: "#D5E2F2",
          color: T.textMuted,
        }}
      >
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: T.blue }} />
        <span>Estimate only. Confirm official rate with DTMO or finance.</span>
      </div>
    </div>
  );
}
