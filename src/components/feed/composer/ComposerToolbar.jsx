"use client";

import { FORMAT_ACTIONS } from "./composerUtils";
import { T } from "@/lib/theme";

export default function ComposerToolbar({ activeFormats = {}, applyFormatting, submitting = false }) {
  return (
    <div
      className="mb-3 flex items-center gap-1 rounded-full border p-1"
      style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
      aria-label="Post formatting toolbar"
    >
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
            className="sh-tap inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition active:scale-[0.97] disabled:opacity-50 md:flex-none md:px-4"
            style={{
              backgroundColor: active ? T.navy : "transparent",
              color: active ? "#FFFFFF" : T.textSecondary,
              boxShadow: active ? "0 1px 4px rgba(11,28,44,0.18)" : "none",
            }}
            title={`${action.label} ${active ? "on" : "off"}`}
            aria-label={`${action.label} ${active ? "on" : "off"}`}
            aria-pressed={active}
          >
            <Icon size={14} strokeWidth={2.7} className="shrink-0" />
            <span className="hidden sm:inline">{action.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
