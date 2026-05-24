"use client";

import { Check } from "lucide-react";
import { T } from "@/lib/theme";

export default function ComposerDraftStatus({ draftSaved, draftStatus, onSaveDraft, submitting = false, imageProcessing = false }) {
  const statusText = draftSaved || draftStatus ? "Autosaved in this device" : "Autosaves in this device";

  return (
    <div className="mt-1.5 flex items-center justify-end">
      <button
        type="button"
        onClick={onSaveDraft}
        disabled={submitting || imageProcessing}
        className="sh-tap inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-[10px] font-bold leading-none transition active:scale-[0.98] disabled:opacity-50"
        style={{ color: T.textSubtle }}
        title="Save draft on this device"
        aria-label="Save draft on this device"
      >
        <Check size={11} strokeWidth={3} style={{ color: T.slate }} />
        <span>{statusText}</span>
      </button>
    </div>
  );
}
