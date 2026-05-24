"use client";

import { FORMAT_ACTIONS } from "./composerUtils";
import { T } from "@/lib/theme";

export default function ComposerToolbar({ activeFormats = {}, applyFormatting, submitting = false }) {
  return (
    <div
      className="mb-3 rounded-[22px] border p-2 shadow-[0_10px_26px_rgba(11,28,44,0.045)] md:flex md:items-center md:gap-2.5 md:rounded-[24px] md:p-2.5"
      style={{ backgroundColor: "rgba(248,250,253,0.96)", borderColor: T.borderSoft }}
      aria-label="Post formatting toolbar"
    >
      <span
        className="mb-2 flex items-center gap-1.5 pl-1 text-[10px] font-black uppercase tracking-[0.16em] md:mb-0 md:w-auto md:shrink-0 md:pl-0 md:text-[11px]"
        style={{ color: T.textSubtle }}
      >
        Format
      </span>

      <div className="grid w-full grid-cols-4 gap-1.5 md:flex md:min-w-0 md:flex-1 md:flex-wrap md:items-center md:justify-start md:gap-2 lg:flex-nowrap">
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
              className="sh-tap inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-[16px] border px-2 text-[11px] font-black transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 md:h-10 md:w-auto md:rounded-full md:px-3.5 md:text-xs"
              style={{
                backgroundColor: active ? T.navy : "#FFFFFF",
                borderColor: active ? T.navy : T.border,
                color: active ? "#FFFFFF" : T.textSubtle,
                boxShadow: active
                  ? "0 10px 18px rgba(11,28,44,0.16), inset 0 0 0 1px rgba(255,255,255,0.12)"
                  : "0 7px 14px rgba(11,28,44,0.045)",
              }}
              title={`${action.label} ${active ? "on" : "off"}`}
              aria-label={`${action.label} ${active ? "on" : "off"}`}
              aria-pressed={active}
            >
              <Icon size={14} strokeWidth={2.75} className="shrink-0" />
              <span className="truncate">{action.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
