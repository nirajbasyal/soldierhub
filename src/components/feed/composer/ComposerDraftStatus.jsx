"use client";

import { Save } from "lucide-react";
import { T } from "@/lib/theme";

export default function ComposerDraftStatus({ draftSaved, draftStatus, onSaveDraft, submitting = false, imageProcessing = false }) {
  return (
    <div
      className="mt-2 flex items-center justify-between gap-2 rounded-[18px] border px-3 py-2"
      style={{
        backgroundColor: draftSaved ? "rgba(63, 95, 125, 0.08)" : "#FFFFFF",
        borderColor: draftSaved ? "rgba(63,95,125,0.24)" : T.border,
      }}
    >
      <button
        type="button"
        onClick={onSaveDraft}
        disabled={submitting || imageProcessing}
        className="sh-tap inline-flex shrink-0 items-center gap-2 rounded-full px-1 py-1 text-[12px] font-black disabled:opacity-50"
        style={{ color: draftSaved ? T.navy : T.text }}
      >
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: draftSaved ? "rgba(63,95,125,0.16)" : "rgba(213,226,242,0.72)" }}
        >
          <Save size={14} strokeWidth={2.5} />
        </span>
        {draftSaved ? "Draft saved" : "Save draft"}
      </button>

      <span className="min-w-0 flex-1 text-right text-[10.5px] font-semibold leading-snug" style={{ color: T.textSubtle }}>
        {draftStatus || "Auto-restores when you reopen compose."}
      </span>
    </div>
  );
}
