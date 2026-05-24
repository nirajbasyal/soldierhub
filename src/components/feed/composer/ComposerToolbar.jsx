"use client";

import { FORMAT_ACTIONS } from "./composerUtils";
import { T } from "@/lib/theme";

export default function ComposerToolbar({ activeFormats = {}, applyFormatting, submitting = false }) {
  return (
    <div
      className="mb-3 rounded-[18px] border px-2.5 py-2 md:flex md:items-center md:gap-2 md:rounded-2xl md:px-3 md:py-2"
      style={{ backgroundColor: "rgba(238,243,247,0.92)", borderColor: T.borderSoft }}
      aria-label="Post formatting toolbar"
    >
      <span
        className="mb-1.5 block shrink-0 pl-1 text-[10px] font-extrabold uppercase tracking-[0.14em] md:mb-0 md:inline md:text-[11px]"
        style={{ color: T.textSubtle }}
      >
        Format
      </span>

      <div className="grid w-full grid-cols-4 gap-1.5 md:flex md:w-auto md:flex-1 md:flex-wrap md:items-center md:justify-start md:gap-2 lg:flex-nowrap">
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
              className="sh-tap inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-extrabold transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 md:h-9 md:w-auto md:px-3 md:text-xs"
              style={{
                backgroundColor: active ? "rgba(63, 95, 125, 0.16)" : "#FFFFFF",
                borderColor: active ? "rgba(63, 95, 125, 0.42)" : T.border,
                color: active ? T.navy : T.textSubtle,
                boxShadow: active ? "inset 0 0 0 1px rgba(63,95,125,0.1), 0 6px 14px rgba(11, 28, 44, 0.07)" : "none",
              }}
              title={`${action.label} ${active ? "on" : "off"}`}
              aria-label={`${action.label} ${active ? "on" : "off"}`}
              aria-pressed={active}
            >
              <Icon size={14} strokeWidth={2.5} className="shrink-0" />
              <span className="truncate">{action.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
