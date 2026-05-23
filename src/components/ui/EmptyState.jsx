"use client";

import { T } from "@/lib/theme";

export default function EmptyState({ icon: Icon, title, body, actionLabel, onAction, note }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] px-5 py-8 text-center md:px-7 md:py-9">
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(220, 232, 247, 0.72)" }}
      />

      <div className="relative mx-auto flex max-w-[360px] flex-col items-center">
        {Icon ? (
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FD 100%)",
              borderColor: T.borderSoft,
              color: T.brandBlue || T.blue,
            }}
          >
            <Icon size={22} strokeWidth={2.3} aria-hidden="true" />
          </div>
        ) : null}

        <div className="text-[17px] font-black tracking-tight" style={{ color: T.textPrimary || T.text }}>
          {title}
        </div>

        {body ? (
          <div className="mt-2 text-sm font-medium leading-6" style={{ color: T.textSecondary || T.textMuted }}>
            {body}
          </div>
        ) : null}

        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full px-5 text-sm font-extrabold shadow-sm transition active:scale-[0.98]"
            style={{
              backgroundColor: T.brandRed || T.red,
              color: "#FFFFFF",
              boxShadow: "0 12px 24px rgba(179, 25, 66, 0.18)",
            }}
          >
            {actionLabel}
          </button>
        ) : null}

        {note ? (
          <p className="mt-3 text-[11px] font-semibold leading-5" style={{ color: T.textMuted || T.textSubtle }}>
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
