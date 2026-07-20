"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Info, Ruler, RotateCcw, XCircle } from "lucide-react";
import { T } from "@/lib/theme";

const STANDARD = 0.55;

function parseNumber(value) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function truncateToThreeDecimals(value) {
  return Math.trunc((value + Number.EPSILON) * 1000) / 1000;
}

export default function WHtRCalculator() {
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [waist, setWaist] = useState("");

  const result = useMemo(() => {
    const feetValue = parseNumber(feet);
    const inchesValue = parseNumber(inches);
    const waistValue = parseNumber(waist);

    if (feetValue === null || inchesValue === null || waistValue === null) return null;
    if (feetValue < 0 || inchesValue < 0 || inchesValue >= 12 || waistValue <= 0) return { error: true };

    const heightInches = feetValue * 12 + inchesValue;
    if (heightInches <= 0) return { error: true };

    const rawRatio = waistValue / heightInches;
    const recordedRatio = truncateToThreeDecimals(rawRatio);

    return {
      error: false,
      heightInches,
      recordedRatio,
      passes: recordedRatio < STANDARD,
    };
  }, [feet, inches, waist]);

  const reset = () => {
    setFeet("");
    setInches("");
    setWaist("");
  };

  const inputStyle = {
    backgroundColor: T.card,
    borderColor: T.border,
    color: T.text,
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border p-5" style={{ backgroundColor: T.card, borderColor: T.border }}>
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: T.surface }}>
            <Ruler size={19} aria-hidden="true" style={{ color: T.text }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: T.text }}>Enter measurements</h2>
            <p className="text-sm mt-1" style={{ color: T.textMuted }}>
              Measure waist circumference at the navel. Enter standing height without shoes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium" style={{ color: T.text }}>Height — feet</span>
            <input
              inputMode="numeric"
              type="number"
              min="0"
              max="8"
              step="1"
              value={feet}
              onChange={(event) => setFeet(event.target.value)}
              placeholder="5"
              className="mt-2 w-full rounded-xl border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-black/10"
              style={inputStyle}
              aria-label="Height in feet"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium" style={{ color: T.text }}>Height — inches</span>
            <input
              inputMode="decimal"
              type="number"
              min="0"
              max="11.99"
              step="0.1"
              value={inches}
              onChange={(event) => setInches(event.target.value)}
              placeholder="8"
              className="mt-2 w-full rounded-xl border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-black/10"
              style={inputStyle}
              aria-label="Additional height in inches"
            />
          </label>
        </div>

        <label className="block mt-4">
          <span className="text-sm font-medium" style={{ color: T.text }}>Waist at navel — inches</span>
          <input
            inputMode="decimal"
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={waist}
            onChange={(event) => setWaist(event.target.value)}
            placeholder="34.5"
            className="mt-2 w-full rounded-xl border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-black/10"
            style={inputStyle}
            aria-label="Waist circumference at the navel in inches"
          />
        </label>

        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium"
          style={{ borderColor: T.border, color: T.text, backgroundColor: T.surface }}
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reset
        </button>
      </section>

      {result?.error && (
        <div role="alert" className="rounded-2xl border p-4" style={{ backgroundColor: T.surface, borderColor: T.border }}>
          <p className="text-sm font-semibold" style={{ color: T.text }}>Check your measurements</p>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Use a valid height, keep the inches field below 12, and enter a waist measurement greater than zero.
          </p>
        </div>
      )}

      {result && !result.error && (
        <section
          aria-live="polite"
          className="rounded-2xl border p-5"
          style={{
            backgroundColor: result.passes ? "rgba(22, 163, 74, 0.06)" : "rgba(220, 38, 38, 0.06)",
            borderColor: result.passes ? "rgba(22, 163, 74, 0.35)" : "rgba(220, 38, 38, 0.35)",
          }}
        >
          <div className="flex items-center gap-3">
            {result.passes ? (
              <CheckCircle2 size={24} aria-hidden="true" style={{ color: "#15803d" }} />
            ) : (
              <XCircle size={24} aria-hidden="true" style={{ color: "#b91c1c" }} />
            )}
            <div>
              <div className="text-lg font-bold" style={{ color: T.text }}>{result.passes ? "PASS" : "FAIL"}</div>
              <div className="text-sm" style={{ color: T.textMuted }}>Army WHtR standard: less than 0.550</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl border p-3" style={{ backgroundColor: T.card, borderColor: T.borderSoft }}>
              <div className="text-xs" style={{ color: T.textSubtle }}>Recorded WHtR</div>
              <div className="text-2xl font-bold mt-1 tabular-nums" style={{ color: T.text }}>
                {result.recordedRatio.toFixed(3)}
              </div>
            </div>
            <div className="rounded-xl border p-3" style={{ backgroundColor: T.card, borderColor: T.borderSoft }}>
              <div className="text-xs" style={{ color: T.textSubtle }}>Calculation</div>
              <div className="text-sm font-semibold mt-1" style={{ color: T.text }}>
                {Number(waist).toFixed(1)} ÷ {result.heightInches.toFixed(1)}
              </div>
            </div>
          </div>

          {!result.passes && (
            <p className="text-sm mt-4" style={{ color: T.textMuted }}>
              A recorded WHtR of 0.550 or greater does not meet the standard. Official Army screening and any required confirmation measurement must be completed by the unit.
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border p-5" style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}>
        <div className="flex items-start gap-3">
          <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: T.textMuted }} />
          <div className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
            <p><strong style={{ color: T.text }}>How it works:</strong> waist circumference in inches ÷ height in inches.</p>
            <p className="mt-2">
              Army Directive 2026-13 states the result is recorded to three decimal places without rounding. Any digits after the third decimal place are disregarded. A recorded value of 0.549 passes; 0.550 fails.
            </p>
            <p className="mt-2">
              This calculator is an informational tool and does not replace an official Army body composition screening, DA Form 5500, command guidance, or current Army policy.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
