"use client";

import { FORMAT_ACTIONS } from "./composerUtils";
import { T } from "@/lib/theme";

export default function MobileTextEditorOverlay({
  editorContent,
  activeFormats,
  onDone,
  onFormat,
  onEditorAreaClick,
}) {
  return (
    <div
      className="fixed inset-0 z-[2147483000] overflow-hidden bg-[#F8FAFD] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Expanded post text editor"
    >
      <div
        className="soldierhub-mobile-text-shell h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-contain bg-[#F8FAFD]"
        style={{ WebkitOverflowScrolling: "touch", scrollPaddingTop: "128px", scrollPaddingBottom: "240px" }}
        onClick={onEditorAreaClick}
      >
        <div
          className="sticky top-0 z-50 border-b bg-[#F8FAFD]/98 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          style={{ borderColor: T.borderSoft, paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex h-[56px] items-center justify-between px-4">
            <div className="w-16" />
            <div className="text-[21px] font-extrabold tracking-[-0.03em]" style={{ color: T.text }}>
              Add Text
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDone?.();
              }}
              className="sh-tap w-16 rounded-full px-2 py-2 text-right text-[17px] font-bold transition active:scale-[0.98]"
              style={{ color: T.navy }}
            >
              Done
            </button>
          </div>

          <div className="border-t px-3 py-2" style={{ borderColor: T.borderSoft }}>
            <div className="grid grid-cols-4 items-center gap-2">
              {FORMAT_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isActive = Boolean(activeFormats?.[action.key]);

                return (
                  <button
                    key={action.key}
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onFormat?.(action.command);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    className="sh-tap flex h-10 w-full items-center justify-center rounded-full border shadow-sm transition active:scale-[0.97]"
                    style={{
                      backgroundColor: isActive ? T.navy : "#FFFFFF",
                      borderColor: isActive ? T.navy : T.border,
                      color: isActive ? "#FFFFFF" : T.navy,
                    }}
                    aria-label={action.label}
                    aria-pressed={isActive}
                    title={action.label}
                  >
                    <Icon size={18} strokeWidth={2.65} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="soldierhub-writing-editor min-h-[calc(100dvh-128px)] bg-[#F8FAFD]">
          {editorContent}
        </div>
      </div>

      <style jsx global>{`
        .soldierhub-mobile-text-shell,
        .soldierhub-mobile-text-shell * {
          -webkit-tap-highlight-color: transparent;
        }

        .soldierhub-writing-editor,
        .soldierhub-writing-editor > div {
          width: 100%;
          display: flex;
          flex: 1 1 auto;
          background: #F8FAFD !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          outline: 0 !important;
        }

        .soldierhub-writing-editor .ProseMirror {
          flex: 1 1 auto;
          min-height: calc(100dvh - 128px);
          width: 100%;
          margin: 0 !important;
          padding: 20px 18px calc(env(safe-area-inset-bottom) + 260px) !important;
          color: ${T.text};
          background: #F8FAFD !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          outline: 0 !important;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          font-size: 18px;
          line-height: 2rem;
        }

        .soldierhub-writing-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #a8abb2;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
