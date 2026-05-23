"use client";

import { AlertTriangle, Loader2, Undo2, X } from "lucide-react";
import { T } from "@/lib/theme";
import { EDITOR_CLASSNAME } from "./composerUtils";

export default function ComposerEditor({
  editorRef,
  plainText,
  structured,
  selectedImage,
  imageProcessing,
  submitting,
  clearedDraft,
  error,
  onClearText,
  onRestoreText,
  onRemoveImage,
  onFocus,
  onPointerDown,
  onInput,
  onBeforeInput,
  onKeyDown,
  onKeyUp,
  onMouseUp,
  onPaste,
}) {
  const showTextClearControl = Boolean(plainText?.trim()) || Boolean(clearedDraft);
  const selectedImageAspectRatio =
    selectedImage?.width && selectedImage?.height
      ? `${selectedImage.width} / ${selectedImage.height}`
      : "16 / 10";

  return (
    <>
      <div
        className="relative overflow-hidden rounded-[24px] border px-3.5 py-3 md:px-4 md:py-3.5"
        style={{ backgroundColor: "#F8FAFD", borderColor: T.borderSoft }}
      >
        {showTextClearControl ? (
          <button
            type="button"
            onClick={clearedDraft ? onRestoreText : onClearText}
            disabled={submitting}
            className="sh-tap absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.96] disabled:opacity-50"
            style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: T.border, color: T.navy }}
            aria-label={clearedDraft ? "Undo cleared text" : "Clear text"}
            title={clearedDraft ? "Undo" : "Clear text"}
          >
            {clearedDraft ? <Undo2 size={16} strokeWidth={2.7} /> : <X size={16} strokeWidth={2.9} />}
          </button>
        ) : null}

        {!plainText && !structured && (
          <div
            className="pointer-events-none absolute left-3.5 right-14 top-3.5 text-[18px] leading-8 md:left-4 md:top-4 md:text-[17px] md:leading-7"
            style={{ color: "#A8ABB2" }}
          >
            Ask a question, share an update, or help the SoldierHub community...
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable={!submitting}
          suppressContentEditableWarning
          role="textbox"
          aria-label="Write your SoldierHub post"
          aria-multiline="true"
          onFocus={onFocus}
          onPointerDown={onPointerDown}
          onInput={onInput}
          onBeforeInput={onBeforeInput}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onMouseUp={onMouseUp}
          onPaste={onPaste}
          className={EDITOR_CLASSNAME}
          style={{ color: T.text, border: "none", boxShadow: "none" }}
        />

        {imageProcessing && !selectedImage ? (
          <div
            className="mt-3 flex items-center gap-3 rounded-[20px] border px-3.5 py-3"
            style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(63,95,125,0.12)", color: T.navy }}
            >
              <Loader2 size={17} className="animate-spin" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-extrabold" style={{ color: T.text }}>
                Preparing your photo
              </div>
              <div className="text-xs font-medium" style={{ color: T.textSubtle }}>
                Please wait before publishing.
              </div>
            </div>
          </div>
        ) : null}

        {selectedImage ? (
          <div
            className="mt-3 overflow-hidden rounded-[22px] border"
            style={{ backgroundColor: "#EEF3F8", borderColor: T.borderSoft }}
          >
            <div className="relative flex justify-center bg-[#EEF3F8]">
              <img
                src={selectedImage.previewUrl}
                alt="Selected post preview"
                className="block max-h-[62vh] w-full object-cover md:max-h-[340px]"
                style={{ aspectRatio: selectedImageAspectRatio }}
              />
              <button
                type="button"
                onClick={onRemoveImage}
                disabled={submitting || imageProcessing}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: "rgba(255,255,255,0.94)", borderColor: T.border, color: T.navy }}
                aria-label="Remove selected photo"
                title="Remove photo"
              >
                <X size={16} strokeWidth={2.8} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          className="my-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ backgroundColor: T.redBg, color: T.red }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </>
  );
}
