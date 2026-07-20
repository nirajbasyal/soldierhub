"use client";

import { useMemo, useRef, useState } from "react";
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
  const [height, setHeight] = useState("");
  const [waist, setWaist] = useState("");
  const resultRef = useRef(null);

  const result = useMemo(() => {
    const heightInches = parseNumber(height);
    const waistValue = parseNumber(waist);

    if (heightInches === null || waistValue === null) return null;
    if (heightInches <= 0 || waistValue <= 0) return { error: true };

    const rawRatio = waistValue / heightInches;
    const recordedRatio = truncateToThreeDecimals(rawRatio);

    return {
      error: false,
      heightInches,
      waistValue,
      rawRatio,
      recordedRatio,
      passes: recordedRatio < STANDARD,
    };
  }, [height, waist]);

  const reset = () => {
    setHeight("");
    setWaist("");
  };

  const showResultOnMobile = () => {
    if (!result || result.error) return;

    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
  };

  const handleDone = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.currentTarget.blur();
    showResultOnMobile();
  };

  const statusBorderColor =
    result && !result.error
      ? result.passes
        ? "rgba(22, 163, 74, 0.9)"
        : "rgba(220, 38, 38, 0.9)"
      : T.border;

  const statusRing =
    result && !result.error
      ? result.passes
        ? "0 0 0 2px rgba(22, 163, 74, 0.12)"
        : "0 0 0 2px rgba(220, 38, 38, 0.12)"
      : "none";

  const inputStyle = {
    backgroundColor: T.card,
    borderColor: statusBorderColor,
    color: T.text,
    boxShadow: statusRing,
    transition: "border-color 160ms ease, box-shadow 160ms ease",
  };

  const measurementSectionStyle = {
    backgroundColor: T.card,
    borderColor: statusBorderColor,
    boxShadow: statusRing,
    transition: "border-color 160ms ease, box-shadow 160ms ease",
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border p-4 sm:p-5" style={measurementSectionStyle}>
        <div className="flex items-start gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: T.surface }}
          >
            <Ruler size={19} aria-hidden="true" style={{ color: T.text }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold" style={{ color: T.text }}>
              Enter measurements
            </h2>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: T.textMuted }}>
              Measure waist circumference at the navel. Enter standing height in inches without shoes.
            </p>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium" style={{ color: T.text }}>
            Height — inches
          </span>
          <input
            inputMode="decimal"
            enterKeyHint="next"
            type="number"
            min="1"
            max="120"
            step="0.1"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            placeholder="63"
            className="mt-2 w-full rounded-xl border px-4 py-3 text-base outline-none focus:ring-2 focus:ring-black/10"
            style={inputStyle}
            aria-label="Standing height in inches"
          />
        </label>

        <label className="block mt-4">
          <span className="text-sm font-medium" style={{ color: T.text }}>
            Waist at navel — inches
          </span>
          <input
            inputMode="decimal"
            enterKeyHint="done"
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={waist}
            onChange={(event) => setWaist(event.target.value)}
            onBlur={showResultOnMobile}
            onKeyDown={handleDone}
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
          <p className="text-sm font-semibold" style={{ color: T.text }}>
            Check your measurements
          </p>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Enter a valid standing height in inches and a waist measurement greater than zero.
          </p>
        </div>
      )}

      {result && !result.error && (
        <section
          ref={resultRef}
          aria-live="polite"
          className="scroll-mb-40 rounded-2xl border p-4 sm:p-5"
          style={{
            backgroundColor: result.passes ? "rgba(22, 163, 74, 0.06)" : "rgba(220, 38, 38, 0.06)",
            borderColor: result.passes ? "rgba(22, 163, 74, 0.35)" : "rgba(220, 38, 38, 0.35)",
          }}
        >
          <div className="flex items-start gap-3">
            {result.passes ? (
              <CheckCircle2 size={24} aria-hidden="true" className="shrink-0 mt-0.5" style={{ color: "#15803d" }} />
            ) : (
              <XCircle size={24} aria-hidden="true" className="shrink-0 mt-0.5" style={{ color: "#b91c1c" }} />
            )}
            <div className="min-w-0">
              <div className="text-lg font-bold" style={{ color: T.text }}>
                {result.passes ? "PASS" : "FAIL"}
              </div>
              <div className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
                Army WHtR standard: less than 0.550
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl border p-3 sm:p-4" style={{ backgroundColor: T.card, borderColor: T.borderSoft }}>
              <div className="text-xs sm:text-sm" style={{ color: T.textSubtle }}>
                Recorded WHtR
              </div>
              <div className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums" style={{ color: T.text }}>
                {result.recordedRatio.toFixed(3)}
              </div>
            </div>

            <div className="rounded-xl border p-3 sm:p-4" style={{ backgroundColor: T.card, borderColor: T.borderSoft }}>
              <div className="text-xs sm:text-sm" style={{ color: T.textSubtle }}>
                Calculation
              </div>
              <div className="text-base sm:text-lg font-semibold mt-1 tabular-nums break-words" style={{ color: T.text }}>
                {result.waistValue.toFixed(1)} ÷ {result.heightInches.toFixed(1)}
              </div>
              <div className="text-xs mt-1 tabular-nums" style={{ color: T.textMuted }}>
                Raw ratio: {result.rawRatio.toFixed(6)}
              </div>
            </div>
          </div>

          {!result.passes && (
            <p className="text-sm mt-4 leading-relaxed" style={{ color: T.textMuted }}>
              A recorded WHtR of 0.550 or greater does not meet the standard. Official Army screening and any required confirmation measurement must be completed by the unit.
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border p-4 sm:p-5" style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}>
        <div className="flex items-start gap-3">
          <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: T.textMuted }} />
          <div className="text-sm leading-relaxed min-w-0" style={{ color: T.textMuted }}>
            <p>
              <strong style={{ color: T.text }}>How it works:</strong> waist circumference in inches ÷ height in inches.
            </p>
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
