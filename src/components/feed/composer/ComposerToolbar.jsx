"use client";

import { FORMAT_ACTIONS } from "./composerUtils";
import { T } from "@/lib/theme";

export default function ComposerToolbar({ activeFormats = {}, applyFormatting, submitting = false }) {
  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-1.5 rounded-[20px] border px-2 py-2 md:flex-nowrap md:gap-2 md:rounded-2xl md:py-1.5"
      style={{ backgroundColor: "rgba(238,243,247,0.92)", borderColor: T.borderSoft }}
      aria-label="Post formatting toolbar"
    >
      <span
        className="hidden shrink-0 pl-1 text-[11px] font-extrabold uppercase tracking-[0.12em] md:inline"
        style={{ color: T.textSubtle }}
      >
        Format
      </span>

      <div className="grid w-full grid-cols-5 gap-1.5 md:flex md:min-w-0 md:flex-1 md:flex-nowrap">
        {FORMAT_ACTIONS.map((action) => {
          const Icon = action.icon;
          const active = Boolean(activeFormats[action.key]);

          return (
            <button
              key={action.key}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormatting(action)}
              disabled={submitting}
              className="sh-tap inline-flex h-9 items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-extrabold transition active:scale-[0.98] disabled:opacity-50 md:w-auto md:px-3 md:text-xs"
              style={{
                backgroundColor: active ? "rgba(63, 95, 125, 0.16)" : "#FFFFFF",
                borderColor: active ? "rgba(63, 95, 125, 0.34)" : T.border,
                color: active ? T.navy : T.textSubtle,
                boxShadow: active ? "0 8px 18px rgba(11, 28, 44, 0.08)" : "none",
              }}
              title={action.label}
              aria-label={action.label}
              aria-pressed={active}
            >
              <Icon size={14} strokeWidth={2.4} />
              <span>{action.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
