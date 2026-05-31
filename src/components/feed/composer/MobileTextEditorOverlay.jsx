"use client";

import { useCallback, useEffect, useState } from "react";
import { FORMAT_ACTIONS } from "./composerUtils";
import { T } from "@/lib/theme";

const TOOLBAR_HEIGHT = 113;

function getViewportBox() {
  if (typeof window === "undefined") return { top: 0, height: 720 };
  const viewport = window.visualViewport;
  return {
    top: Math.max(0, Math.floor(viewport?.offsetTop || 0)),
    height: Math.max(320, Math.floor(viewport?.height || window.innerHeight || 720)),
  };
}

export default function MobileTextEditorOverlay({ editorContent, activeFormats, onDone, onFormat, onEditorAreaClick, onOverlayReady }) {
  const [viewportBox, setViewportBox] = useState(() => getViewportBox());
  const [editorVisible, setEditorVisible] = useState(false);

  const updateViewportBox = useCallback(() => {
    setViewportBox(getViewportBox());
  }, []);

  useEffect(() => {
    updateViewportBox();

    const readyTimer = window.setTimeout(() => {
      onOverlayReady?.();
      window.setTimeout(() => setEditorVisible(true), 90);
    }, 90);

    const delayedUpdate = () => {
      updateViewportBox();
      window.setTimeout(updateViewportBox, 120);
    };

    window.visualViewport?.addEventListener("resize", delayedUpdate);
    window.visualViewport?.addEventListener("scroll", delayedUpdate);
    window.addEventListener("resize", delayedUpdate);
    window.addEventListener("orientationchange", delayedUpdate);

    return () => {
      window.clearTimeout(readyTimer);
      window.visualViewport?.removeEventListener("resize", delayedUpdate);
      window.visualViewport?.removeEventListener("scroll", delayedUpdate);
      window.removeEventListener("resize", delayedUpdate);
      window.removeEventListener("orientationchange", delayedUpdate);
    };
  }, [onOverlayReady, updateViewportBox]);

  return (
    <div
      className="fixed left-0 right-0 z-[2147483000] overflow-hidden bg-[#F8FAFD] md:hidden"
      style={{ top: `${viewportBox.top}px`, height: `${viewportBox.height}px`, maxHeight: `${viewportBox.height}px` }}
      role="dialog"
      aria-modal="true"
      aria-label="Expanded post text editor"
    >
      <div
        className="absolute left-0 right-0 top-0 z-50 border-b bg-[#F8FAFD]/98 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl"
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
                  style={{ backgroundColor: isActive ? T.navy : "#FFFFFF", borderColor: isActive ? T.navy : T.border, color: isActive ? "#FFFFFF" : T.navy }}
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

      <div
        className="soldierhub-mobile-text-shell absolute bottom-0 left-0 right-0 overflow-y-auto overscroll-contain bg-[#F8FAFD]"
        style={{ top: `calc(env(safe-area-inset-top) + ${TOOLBAR_HEIGHT}px)`, WebkitOverflowScrolling: "touch", scrollPaddingTop: "18px", scrollPaddingBottom: "96px" }}
        onClick={onEditorAreaClick}
      >
        <div
          className="soldierhub-writing-editor min-h-full bg-[#F8FAFD] transition-opacity duration-150 ease-out"
          style={{ opacity: editorVisible ? 1 : 0 }}
        >
          {editorContent}
        </div>
      </div>

      <style jsx global>{`
        .soldierhub-mobile-text-shell,
        .soldierhub-mobile-text-shell * {
          -webkit-tap-highlight-color: transparent;
        }

        .soldierhub-mobile-text-shell {
          overflow-anchor: none;
          touch-action: pan-y;
        }

        .soldierhub-writing-editor,
        .soldierhub-writing-editor * {
          -webkit-touch-callout: default !important;
          -webkit-user-select: text !important;
          user-select: text !important;
        }

        .soldierhub-writing-editor,
        .soldierhub-writing-editor > div {
          width: 100%;
          min-height: 100%;
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
          min-height: 100%;
          width: 100%;
          margin: 0 !important;
          padding: 20px 18px calc(env(safe-area-inset-bottom) + 104px) !important;
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
          caret-color: auto !important;
          cursor: text !important;
          touch-action: auto !important;
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
