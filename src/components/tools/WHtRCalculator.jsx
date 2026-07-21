"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Info, Ruler, RotateCcw, XCircle } from "lucide-react";
import { T } from "@/lib/theme";

const STANDARD = 0.55;
const EMPTY_WAISTS = ["", "", ""];

function parseNumber(value) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function truncateToThreeDecimals(value) {
  return Math.trunc((value + Number.EPSILON) * 1000) / 1000;
}

function getAttemptState(waistValue, heightValue) {
  const waist = parseNumber(waistValue);
  const height = parseNumber(heightValue);
  const hasWaist = waistValue !== "";

  if (!hasWaist) return { complete: false, valid: true };
  if (waist === null || waist <= 0 || height === null || height <= 0) {
    return { complete: true, valid: false };
  }

  const rawRatio = waist / height;
  const recordedRatio = truncateToThreeDecimals(rawRatio);
  return {
    complete: true,
    valid: true,
    waist,
    height,
    rawRatio,
    recordedRatio,
    passes: recordedRatio < STANDARD,
  };
}

export default function WHtRCalculator() {
  const [height, setHeight] = useState("");
  const [waists, setWaists] = useState(EMPTY_WAISTS);

  const heightNumber = parseNumber(height);
  const heightValid = heightNumber !== null && heightNumber > 0;
  const attemptStates = useMemo(() => waists.map((waist) => getAttemptState(waist, height)), [waists, height]);

  const result = useMemo(() => {
    if (!heightValid) return null;
    const completed = attemptStates.filter((attempt) => attempt.complete && attempt.valid);
    if (!completed.length) return null;
    const averageRawRatio = completed.reduce((sum, attempt) => sum + attempt.rawRatio, 0) / completed.length;
    const recordedRatio = truncateToThreeDecimals(averageRawRatio);
    return {
      completed,
      averageRawRatio,
      recordedRatio,
      passes: recordedRatio < STANDARD,
    };
  }, [attemptStates, heightValid]);

  const updateWaist = (index, value) => {
    setWaists((current) => current.map((waist, i) => (i === index ? value : waist)));
  };

  const reset = () => {
    setHeight("");
    setWaists(EMPTY_WAISTS);
  };

  const statusBorderColor = result
    ? result.passes
      ? "rgba(22, 163, 74, 0.9)"
      : "rgba(220, 38, 38, 0.9)"
    : T.border;

  const statusRing = result
    ? result.passes
      ? "0 0 0 2px rgba(22, 163, 74, 0.12)"
      : "0 0 0 2px rgba(220, 38, 38, 0.12)"
    : "none";

  return (
    <div className="space-y-4">
      <section
        className="rounded-2xl border p-3.5 sm:p-5"
        style={{
          backgroundColor: T.card,
          borderColor: statusBorderColor,
          boxShadow: statusRing,
          transition: "border-color 160ms ease, box-shadow 160ms ease",
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: T.surface }}>
            <Ruler size={19} aria-hidden="true" style={{ color: T.text }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold" style={{ color: T.text }}>Enter measurements</h2>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: T.textMuted }}>
              Enter standing height once, then record up to three waist measurements at the navel. Attempts 2 and 3 are optional.
            </p>
          </div>
        </div>

        <div className="rounded-xl border p-3 mb-3" style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}>
          <label className="block">
            <span className="text-sm font-semibold" style={{ color: T.text }}>Height — inches</span>
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
              className="mt-2 w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-black/10"
              style={{ backgroundColor: T.card, borderColor: statusBorderColor, color: T.text }}
              aria-label="Standing height in inches"
            />
          </label>
          {height !== "" && !heightValid && (
            <div className="mt-2 text-xs" style={{ color: "#b91c1c" }}>Enter a valid height greater than zero.</div>
          )}
        </div>

        <div className="space-y-3">
          {waists.map((waist, index) => {
            const state = attemptStates[index];
            const optional = index > 0;
            return (
              <div key={index} className="rounded-xl border p-3" style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="text-sm font-semibold" style={{ color: T.text }}>Attempt {index + 1}</div>
                  {optional && <span className="text-[11px] font-medium" style={{ color: T.textSubtle }}>Optional</span>}
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                  <label className="block min-w-0">
                    <span className="text-xs sm:text-sm font-medium" style={{ color: T.text }}>Waist — inches</span>
                    <input
                      inputMode="decimal"
                      enterKeyHint={index < 2 ? "next" : "done"}
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={waist}
                      onChange={(event) => updateWaist(index, event.target.value)}
                      placeholder="34.5"
                      className="mt-1.5 w-full min-w-0 rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-black/10"
                      style={{
                        backgroundColor: T.card,
                        borderColor: state.complete && state.valid ? (state.passes ? "rgba(22, 163, 74, 0.9)" : "rgba(220, 38, 38, 0.9)") : T.border,
                        color: T.text,
                      }}
                      aria-label={`Attempt ${index + 1} waist circumference at the navel in inches`}
                    />
                  </label>

                  <div className="min-w-[112px] text-right pb-1">
                    {state.complete && state.valid ? (
                      <>
                        <div className="text-[11px] tabular-nums" style={{ color: T.textMuted }}>
                          {state.waist.toFixed(1)} ÷ {state.height.toFixed(1)}
                        </div>
                        <div className="text-sm font-bold tabular-nums" style={{ color: T.text }}>
                          {state.recordedRatio.toFixed(3)}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wide" style={{ color: state.passes ? "#15803d" : "#b91c1c" }}>
                          {state.passes ? "Pass" : "Fail"}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs" style={{ color: T.textSubtle }}>Enter waist</div>
                    )}
                  </div>
                </div>

                {state.complete && !state.valid && (
                  <div className="mt-2 text-xs" style={{ color: "#b91c1c" }}>
                    Enter a valid waist and height greater than zero.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={reset}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium"
          style={{ borderColor: T.border, color: T.text, backgroundColor: T.surface }}
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reset
        </button>
      </section>

      {result && (
        <section
          aria-live="polite"
          className="rounded-2xl border p-4 sm:p-5"
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
              <div className="text-lg font-bold" style={{ color: T.text }}>{result.passes ? "PASS" : "FAIL"}</div>
              <div className="text-sm leading-relaxed" style={{ color: T.textMuted }}>Army WHtR standard: less than 0.550</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl border p-3 sm:p-4" style={{ backgroundColor: T.card, borderColor: T.borderSoft }}>
              <div className="text-xs sm:text-sm" style={{ color: T.textSubtle }}>Average recorded WHtR</div>
              <div className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums" style={{ color: T.text }}>{result.recordedRatio.toFixed(3)}</div>
              <div className="text-xs mt-1" style={{ color: T.textMuted }}>
                Based on {result.completed.length} completed {result.completed.length === 1 ? "attempt" : "attempts"}
              </div>
            </div>

            <div className="rounded-xl border p-3 sm:p-4" style={{ backgroundColor: T.card, borderColor: T.borderSoft }}>
              <div className="text-xs sm:text-sm" style={{ color: T.textSubtle }}>Final calculation</div>
              <div className="space-y-1.5 mt-1.5">
                {result.completed.map((attempt, index) => (
                  <div key={index} className="text-xs sm:text-sm tabular-nums" style={{ color: T.text }}>
                    A{attemptStates.indexOf(attempt) + 1}: {attempt.waist.toFixed(1)} ÷ {attempt.height.toFixed(1)} = {attempt.recordedRatio.toFixed(3)}
                  </div>
                ))}
              </div>
              <div className="text-xs mt-2 tabular-nums" style={{ color: T.textMuted }}>
                Average ratio: {result.recordedRatio.toFixed(3)}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border p-4 sm:p-5" style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}>
        <div className="flex items-start gap-3">
          <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: T.textMuted }} />
          <div className="text-sm leading-relaxed min-w-0" style={{ color: T.textMuted }}>
            <p><strong style={{ color: T.text }}>How it works:</strong> height is entered once. Each completed waist attempt is divided by that height. If more than one waist attempt is completed, this tool averages the completed WHtR values.</p>
            <p className="mt-2">Army Directive 2026-13 states WHtR is recorded to three decimal places without rounding. A recorded value of 0.549 passes; 0.550 fails.</p>
            <p className="mt-2">The optional multi-attempt average is a calculator convenience and does not replace official Army measurement or confirmation procedures, DA Form 5500, command guidance, or current Army policy.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
