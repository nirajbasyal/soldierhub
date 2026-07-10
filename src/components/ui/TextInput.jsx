"use client";
import { T } from "@/lib/theme";

export default function TextInput({
  icon: Icon,
  label,
  hint,
  error,
  success,
  className = "",
  ...props
}) {
  const borderColor = error ? T.red : success ? T.green : T.border;
  const backgroundColor = success ? T.greenBg : T.card;

  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium" style={{ color: T.textMuted }}>
          {label}
        </span>
      )}
      <div className="relative">
        {Icon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: error ? T.red : success ? T.green : T.textSubtle }}
          >
            <Icon size={16} strokeWidth={2.25} />
          </span>
        )}
        <input
          {...props}
          aria-invalid={error ? true : undefined}
          className={`h-11 w-full rounded-xl border text-sm font-normal outline-none transition-shadow placeholder:font-normal placeholder:text-[#A8ABB2] ${Icon ? "pl-10" : "pl-4"} pr-4 ${className}`}
          style={{
            backgroundColor,
            borderColor,
            color: T.text,
            WebkitTextFillColor: T.text,
            boxShadow: error
              ? "0 0 0 3px rgba(179,25,66,0.07)"
              : success
              ? "0 0 0 3px rgba(36,113,81,0.08)"
              : "0 1px 0 rgba(11,28,44,0.02)",
          }}
          onFocus={(event) => {
            event.currentTarget.style.borderColor = error ? T.red : success ? T.green : T.navy;
          }}
          onBlur={(event) => {
            event.currentTarget.style.borderColor = borderColor;
          }}
        />
      </div>
      {error && (
        <span className="mt-1 block text-xs font-medium" style={{ color: T.red }}>
          {error}
        </span>
      )}
      {success && !error && (
        <span className="mt-1 block text-xs font-medium" style={{ color: T.green }}>
          {success}
        </span>
      )}
      {hint && !error && !success && (
        <span className="mt-1 block text-xs font-normal" style={{ color: T.textSubtle }}>
          {hint}
        </span>
      )}
    </label>
  );
}
