"use client";

import { ImagePlus, Info, Loader2, Send } from "lucide-react";
import { T } from "@/lib/theme";
import Button from "@/components/ui/Button";
import ComposerDraftStatus from "./ComposerDraftStatus";

export default function ComposerActionBar({
  pageMode = false,
  anonymous,
  showAnonymousNotice = false,
  anonymousNotice,
  onToggleAnonymous,
  selectedImage,
  imageProcessing,
  onOpenImagePicker,
  canPublish,
  submitting,
  onSubmit,
  draftSaved,
  draftStatus,
  onSaveDraft,
}) {
  const actionBarClassName = `${pageMode ? "sticky bottom-2 z-40 md:static" : ""} mt-3 rounded-[24px] border px-2.5 py-2 md:rounded-[20px] md:px-3 md:py-2.5`;
  const noticeVisible = Boolean(showAnonymousNotice && anonymous);

  return (
    <div
      className={actionBarClassName}
      style={{
        borderColor: T.borderSoft,
        backgroundColor: "rgba(248,250,253,0.98)",
        boxShadow: pageMode ? "0 14px 30px rgba(11,28,44,0.08)" : "none",
      }}
    >
      <div
        aria-hidden={!noticeVisible}
        className="overflow-hidden transition-[max-height,opacity,transform,margin] duration-300 ease-out"
        style={{
          maxHeight: noticeVisible ? 96 : 0,
          opacity: noticeVisible ? 1 : 0,
          transform: noticeVisible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.985)",
          marginBottom: noticeVisible ? 8 : 0,
          pointerEvents: noticeVisible ? "auto" : "none",
        }}
      >
        <div
          className="flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs font-medium"
          style={{ backgroundColor: "#F4F7FA", borderColor: T.borderSoft, color: T.textSubtle }}
        >
          <Info size={14} className="mt-0.5 shrink-0" style={{ color: T.slate }} />
          <span>{anonymousNotice}</span>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(108px,1fr)_46px_minmax(96px,0.82fr)] items-center gap-2 md:flex md:items-center md:justify-between md:gap-3">
        <button
          type="button"
          onClick={onToggleAnonymous}
          disabled={submitting}
          className="sh-tap flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] border px-2 text-center transition active:scale-[0.98] disabled:opacity-50 md:h-11 md:min-w-[210px] md:flex-row md:justify-between md:gap-2 md:px-3 md:text-left"
          style={{
            backgroundColor: anonymous ? "rgba(63, 95, 125, 0.1)" : "#FFFFFF",
            borderColor: anonymous ? "rgba(63,95,125,0.34)" : T.border,
            color: T.navy,
          }}
          aria-pressed={anonymous}
        >
          <span className="w-full text-[10.5px] font-medium leading-tight tracking-normal md:w-auto md:text-[12px]">
            Post anonymously
          </span>

          <span
            className="relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border"
            style={{
              borderColor: anonymous ? "rgba(63,95,125,0.34)" : T.border,
              backgroundColor: anonymous ? "#3F5F7D" : "rgba(213,226,242,0.72)",
            }}
          >
            <span className="absolute left-2 text-[8px] font-black" style={{ color: "#FFFFFF", opacity: anonymous ? 1 : 0 }}>
              ON
            </span>
            <span className="absolute right-2 text-[8px] font-black" style={{ color: T.textSubtle, opacity: anonymous ? 0 : 1 }}>
              OFF
            </span>
            <span
              className="absolute left-[3px] top-[3px] h-[21px] w-[21px] rounded-full transition-transform duration-200"
              style={{ transform: anonymous ? "translateX(25px)" : "translateX(0)", backgroundColor: "#FFFFFF" }}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenImagePicker}
          disabled={submitting || imageProcessing}
          className="sh-tap inline-flex h-[58px] w-[46px] shrink-0 items-center justify-center rounded-[18px] border text-[11px] font-extrabold transition active:scale-[0.98] disabled:opacity-45 md:h-11 md:w-auto md:px-4"
          style={{
            backgroundColor: selectedImage ? "rgba(63, 95, 125, 0.12)" : "#FFFFFF",
            borderColor: selectedImage ? "rgba(63,95,125,0.28)" : T.border,
            color: T.navy,
          }}
          title={selectedImage ? "Replace photo" : "Add photo"}
          aria-label={selectedImage ? "Replace photo" : "Add photo"}
        >
          {imageProcessing ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={18} strokeWidth={2.5} />}
          <span className="hidden md:ml-1.5 md:inline">{selectedImage ? "Photo" : "Add photo"}</span>
        </button>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onSubmit}
          disabled={!canPublish || submitting || imageProcessing}
          className="h-[58px] min-w-0 rounded-[18px] px-3 text-[12px] md:h-11 md:min-w-[140px] md:rounded-full md:px-5 md:text-sm"
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {submitting ? "Posting" : "Publish"}
          </span>
        </Button>
      </div>

      <ComposerDraftStatus
        draftSaved={draftSaved}
        draftStatus={draftStatus}
        onSaveDraft={onSaveDraft}
        submitting={submitting}
        imageProcessing={imageProcessing}
      />
    </div>
  );
}
