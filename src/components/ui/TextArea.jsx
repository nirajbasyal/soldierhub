"use client";
import { T } from "@/lib/theme";

const BIO_CHARACTER_LIMIT = 150;

export default function TextArea({ label, error, className = "", onChange, value, maxLength, ...props }) {
  const isBioField = String(label || "").trim().toLowerCase() === "bio";
  const effectiveMaxLength = isBioField && !maxLength ? BIO_CHARACTER_LIMIT : maxLength;
  const safeValue =
    typeof value === "string" && effectiveMaxLength
      ? value.slice(0, effectiveMaxLength)
      : value;
  const characterCount = typeof safeValue === "string" ? safeValue.length : 0;

  const handleChange = (event) => {
    if (effectiveMaxLength && event?.target?.value?.length > effectiveMaxLength) {
      event.target.value = event.target.value.slice(0, effectiveMaxLength);
    }

    onChange?.(event);
  };

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-3">
        {label ? (
          <span className="block text-xs font-medium" style={{ color: T.textMuted }}>
            {label}
          </span>
        ) : (
          <span />
        )}

        {effectiveMaxLength ? (
          <span
            className="shrink-0 text-[11px] font-semibold tabular-nums"
            style={{ color: characterCount >= effectiveMaxLength ? T.red : T.textMuted }}
          >
            {characterCount}/{effectiveMaxLength}
          </span>
        ) : null}
      </span>

      <textarea
        {...props}
        value={safeValue}
        maxLength={effectiveMaxLength}
        onChange={handleChange}
        className={`w-full rounded-xl border text-sm outline-none transition-shadow p-4 resize-none placeholder:text-[#A8ABB2] ${className}`}
        style={{
          backgroundColor: T.card,
          borderColor: error ? T.red : T.border,
          color: T.text,
          minHeight: 110,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = T.navy)}
        onBlur={(e) => (e.currentTarget.style.borderColor = error ? T.red : T.border)}
      />
      {error && <span className="block text-xs mt-1" style={{ color: T.red }}>{error}</span>}
    </label>
  );
}
