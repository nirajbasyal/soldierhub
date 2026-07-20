"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, Ruler, RotateCcw, XCircle } from "lucide-react";
import { T } from "@/lib/theme";

const STANDARD = 0.55;
const EMPTY_ATTEMPT = { waist: "", height: "" };

function parseNumber(value) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function truncateToThreeDecimals(value) {
  return Math.trunc((value + Number.EPSILON) * 1000) / 1000;
}

function getAttemptState(attempt) {
  const waist = parseNumber(attempt.waist);
  const height = parseNumber(attempt.height);
  const hasWaist = attempt.waist !== "";
  const hasHeight = attempt.height !== "";
  const partial = hasWaist !== hasHeight;

  if (!hasWaist && !hasHeight) return { complete: false, partial: false, valid: true };
  if (partial) return { complete: false, partial: true, valid: true };
  if (waist === null || height === null || waist <= 0 || height <= 0) {
    return { complete: true, partial: false, valid: false };
  }

  const rawRatio = waist / height;
  const recordedRatio = truncateToThreeDecimals(rawRatio);
  return { complete: true, partial: false, valid: true, waist, height, rawRatio, recordedRatio, passes: recordedRatio < STANDARD };
}

export default function WHtRCalculator() {
  const [attempts, setAttempts] = useState(() => [{ ...EMPTY_ATTEMPT }, { ...EMPTY_ATTEMPT }, { ...EMPTY_ATTEMPT }]);
  const resultRef = useRef(null);
  const attemptRefs = useRef([]);
  const attemptStates = useMemo(() => attempts.map(getAttemptState), [attempts]);

  const result = useMemo(() => {
    const completed = attemptStates.filter((attempt) => attempt.complete && attempt.valid);
    const firstAttempt = attemptStates[0];
    if (firstAttempt.partial || (firstAttempt.complete && !firstAttempt.valid)) return { error: true };
    if (!firstAttempt.complete || completed.length === 0) return null;
    const averageRawRatio = completed.reduce((sum, attempt) => sum + attempt.rawRatio, 0) / completed.length;
    const recordedRatio = truncateToThreeDecimals(averageRawRatio);
    return { error: false, completed, averageRawRatio, recordedRatio, passes: recordedRatio < STANDARD };
  }, [attemptStates]);

  const updateAttempt = (index, field, value) => setAttempts((current) => current.map((attempt, i) => i === index ? { ...attempt, [field]: value } : attempt));
  const reset = () => setAttempts([{ ...EMPTY_ATTEMPT }, { ...EMPTY_ATTEMPT }, { ...EMPTY_ATTEMPT }]);
  const showResultOnMobile = () => window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 140);
  const nudgeForHeightEntry = (index) => {
    const waist = parseNumber(attempts[index].waist);
    if (waist === null || waist <= 0) return;
    window.setTimeout(() => {
      attemptRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => window.scrollBy({ top: -72, behavior: "smooth" }), 120);
    }, 180);
  };
  const handleHeightDone = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.currentTarget.blur();
    showResultOnMobile();
  };

  const statusBorderColor = result && !result.error ? (result.passes ? "rgba(22, 163, 74, 0.9)" : "rgba(220, 38, 38, 0.9)") : T.border;
  const statusRing = result && !result.error ? (result.passes ? "0 0 0 2px rgba(22, 163, 74, 0.12)" : "0 0 0 2px rgba(220, 38, 38, 0.12)") : "none";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border p-3.5 sm:p-5" style={{ backgroundColor: T.card, borderColor: statusBorderColor, boxShadow: statusRing, transition: "border-color 160ms ease, box-shadow 160ms ease" }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: T.surface }}><Ruler size={19} aria-hidden="true" style={{ color: T.text }} /></div>
          <div className="min-w-0"><h2 className="text-base font-semibold" style={{ color: T.text }}>Enter measurements</h2><p className="text-sm mt-1 leading-relaxed" style={{ color: T.textMuted }}>Measure waist at the navel and standing height in inches without shoes. Attempts 2 and 3 are optional.</p></div>
        </div>

        <div className="space-y-3">
          {attempts.map((attempt, index) => {
            const state = attemptStates[index];
            const optional = index > 0;
            return (
              <div key={index} ref={(node) => { attemptRefs.current[index] = node; }} className="scroll-mt-20 rounded-xl border p-3" style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}>
                <div className="flex items-center justify-between gap-2 mb-2.5"><div className="text-sm font-semibold" style={{ color: T.text }}>Attempt {index + 1}</div>{optional && <span className="text-[11px] font-medium" style={{ color: T.textSubtle }}>Optional</span>}</div>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <label className="block min-w-0"><span className="text-xs sm:text-sm font-medium" style={{ color: T.text }}>Waist — in</span><input inputMode="decimal" enterKeyHint="next" type="number" min="1" max="100" step="0.1" value={attempt.waist} onChange={(event) => updateAttempt(index, "waist", event.target.value)} placeholder="34.5" className="mt-1.5 w-full min-w-0 rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-black/10" style={{ backgroundColor: T.card, borderColor: statusBorderColor, color: T.text, transition: "border-color 160ms ease" }} aria-label={`Attempt ${index + 1} waist circumference at the navel in inches`} /></label>
                  <label className="block min-w-0"><span className="text-xs sm:text-sm font-medium" style={{ color: T.text }}>Height — in</span><input inputMode="decimal" enterKeyHint="done" type="number" min="1" max="120" step="0.1" value={attempt.height} onChange={(event) => updateAttempt(index, "height", event.target.value)} onFocus={() => nudgeForHeightEntry(index)} onBlur={showResultOnMobile} onKeyDown={handleHeightDone} placeholder="63" className="mt-1.5 w-full min-w-0 rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-black/10" style={{ backgroundColor: T.card, borderColor: statusBorderColor, color: T.text, transition: "border-color 160ms ease" }} aria-label={`Attempt ${index + 1} standing height in inches`} /></label>
                </div>
                {state.complete && state.valid && <div className="mt-2 flex items-center justify-between gap-3 text-xs tabular-nums"><span style={{ color: T.textMuted }}>Attempt WHtR: {state.recordedRatio.toFixed(3)}</span><span className="font-bold uppercase tracking-wide" style={{ color: state.passes ? "#15803d" : "#b91c1c" }}>{state.passes ? "Pass" : "Fail"}</span></div>}
                {state.partial && <div className="mt-2 text-xs" style={{ color: "#b45309" }}>Complete both fields or clear this optional attempt. Partial attempts are not included in the average.</div>}
                {state.complete && !state.valid && <div className="mt-2 text-xs" style={{ color: "#b91c1c" }}>Enter measurements greater than zero.</div>}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={reset} className="mt-3 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium" style={{ borderColor: T.border, color: T.text, backgroundColor: T.surface }}><RotateCcw size={15} aria-hidden="true" />Reset</button>
      </section>

      {result?.error && <div role="alert" className="rounded-2xl border p-4" style={{ backgroundColor: T.surface, borderColor: T.border }}><p className="text-sm font-semibold" style={{ color: T.text }}>Check Attempt 1</p><p className="text-sm mt-1" style={{ color: T.textMuted }}>Attempt 1 requires both a valid waist measurement and standing height before a result can be calculated.</p></div>}

      {result && !result.error && (
        <section ref={resultRef} aria-live="polite" className="scroll-mb-40 rounded-2xl border p-4 sm:p-5" style={{ backgroundColor: result.passes ? "rgba(22, 163, 74, 0.06)" : "rgba(220, 38, 38, 0.06)", borderColor: result.passes ? "rgba(22, 163, 74, 0.35)" : "rgba(220, 38, 38, 0.35)" }}>
          <div className="flex items-start gap-3">{result.passes ? <CheckCircle2 size={24} aria-hidden="true" className="shrink-0 mt-0.5" style={{ color: "#15803d" }} /> : <XCircle size={24} aria-hidden="true" className="shrink-0 mt-0.5" style={{ color: "#b91c1c" }} />}<div className="min-w-0"><div className="text-lg font-bold" style={{ color: T.text }}>{result.passes ? "PASS" : "FAIL"}</div><div className="text-sm leading-relaxed" style={{ color: T.textMuted }}>Army WHtR standard: less than 0.550</div></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl border p-3 sm:p-4" style={{ backgroundColor: T.card, borderColor: T.borderSoft }}><div className="text-xs sm:text-sm" style={{ color: T.textSubtle }}>Average recorded WHtR</div><div className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums" style={{ color: T.text }}>{result.recordedRatio.toFixed(3)}</div><div className="text-xs mt-1" style={{ color: T.textMuted }}>Based on {result.completed.length} completed {result.completed.length === 1 ? "attempt" : "attempts"}</div></div>
            <div className="rounded-xl border p-3 sm:p-4" style={{ backgroundColor: T.card, borderColor: T.borderSoft }}><div className="text-xs sm:text-sm" style={{ color: T.textSubtle }}>Calculation</div><div className="space-y-1.5 mt-1.5">{result.completed.map((attempt, index) => <div key={index} className="text-xs sm:text-sm tabular-nums" style={{ color: T.text }}>A{attemptStates.indexOf(attempt) + 1}: {attempt.waist.toFixed(1)} ÷ {attempt.height.toFixed(1)} = {attempt.recordedRatio.toFixed(3)}</div>)}</div><div className="text-xs mt-2 tabular-nums" style={{ color: T.textMuted }}>Average raw ratio: {result.averageRawRatio.toFixed(6)}</div></div>
          </div>
          {!result.passes && <p className="text-sm mt-4 leading-relaxed" style={{ color: T.textMuted }}>An average recorded WHtR of 0.550 or greater does not meet the calculator standard. Official Army screening and any required confirmation measurement must be completed by the unit.</p>}
        </section>
      )}

      <section className="rounded-2xl border p-4 sm:p-5" style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}><div className="flex items-start gap-3"><Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: T.textMuted }} /><div className="text-sm leading-relaxed min-w-0" style={{ color: T.textMuted }}><p><strong style={{ color: T.text }}>How it works:</strong> each completed attempt calculates waist circumference ÷ height. If more than one attempt is completed, this tool averages the completed attempt ratios.</p><p className="mt-2">Army Directive 2026-13 states WHtR is recorded to three decimal places without rounding. A recorded value of 0.549 passes; 0.550 fails.</p><p className="mt-2">The optional multi-attempt average is a calculator convenience and should not be interpreted as replacing the official Army measurement and confirmation procedures. This tool does not replace DA Form 5500, command guidance, or current Army policy.</p></div></div></section>
    </div>
  );
}
