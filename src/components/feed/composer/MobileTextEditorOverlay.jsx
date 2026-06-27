"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FORMAT_ACTIONS } from "./composerUtils";
import { T } from "@/lib/theme";

const TOOLBAR_HEIGHT = 112;

// The overlay is sized to the *visible* viewport (visualViewport), which on
// phones is the area above the on-screen keyboard. Sizing to it means the
// text shell always ends at the top of the keyboard, so the caret stays
// visible without any manual scroll math.
function getViewportBox() {
  if (typeof window === "undefined") return { top: 0, height: 720 };
  const viewport = window.visualViewport;
  return {
    top: Math.max(0, Math.floor(viewport?.offsetTop || 0)),
    height: Math.max(320, Math.floor(viewport?.height || window.innerHeight || 720)),
  };
}

export default function MobileTextEditorOverlay({ editorContent, activeFormats, onDone, onFormat, onEditorAreaClick, onOverlayReady, onViewportChange }) {
  const [viewportBox, setViewportBox] = useState(getViewportBox);
  const [entered, setEntered] = useState(false);
  const onOverlayReadyRef = useRef(onOverlayReady);
  const onViewportChangeRef = useRef(onViewportChange);

  useEffect(() => {
    onOverlayReadyRef.current = onOverlayReady;
  }, [onOverlayReady]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  const updateViewportBox = useCallback(() => {
    setViewportBox(getViewportBox());
  }, []);

  useEffect(() => {
    updateViewportBox();

    // Play the entrance transition on the next frame so it animates from the
    // initial state instead of snapping in.
    const enterRaf = window.requestAnimationFrame?.(() => setEntered(true));

    // Focus + place the caret once the overlay is laid out, so the keyboard
    // opens against a stable layout (no jump).
    const readyTimer = window.setTimeout(() => {
      onOverlayReadyRef.current?.();
    }, 130);

    let viewportTimer = null;
    const handleViewportChange = () => {
      updateViewportBox();
      if (viewportTimer) window.clearTimeout(viewportTimer);
      // After the keyboard finishes animating, re-assert caret visibility.
      viewportTimer = window.setTimeout(() => {
        updateViewportBox();
        onViewportChangeRef.current?.();
      }, 110);
    };

    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      if (enterRaf) window.cancelAnimationFrame?.(enterRaf);
      window.clearTimeout(readyTimer);
      if (viewportTimer) window.clearTimeout(viewportTimer);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, [updateViewportBox]);

  return (
    <div
      className="fixed left-0 right-0 z-[2147483000] overflow-hidden bg-[#F8FAFD] md:hidden"
      style={{
        top: `${viewportBox.top}px`,
        height: `${viewportBox.height}px`,
        maxHeight: `${viewportBox.height}px`,
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 190ms ease, transform 190ms ease",
        willChange: "opacity, transform",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Expanded post text editor"
    >
      <div
        className="soldierhub-mobile-editor-toolbar absolute left-0 right-0 top-0 z-50 border-b bg-[#F8FAFD]/98 backdrop-blur-xl"
        style={{ borderColor: T.borderSoft, paddingTop: "env(safe-area-inset-top)", boxShadow: "0 8px 22px rgba(15,23,42,0.06)" }}
      >
        <div className="flex h-[54px] items-center justify-between px-3">
          <div className="w-16" />
          <div className="text-[17px] font-bold tracking-[-0.02em]" style={{ color: T.text }}>
            Write your post
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDone?.();
            }}
            className="sh-tap w-16 rounded-full px-2 py-2 text-right text-[16px] font-bold transition active:scale-[0.98]"
            style={{ color: T.blue }}
          >
            Done
          </button>
        </div>

        <div className="border-t px-3 py-2" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center gap-1 rounded-full border p-1" style={{ borderColor: T.borderSoft, backgroundColor: T.surface }}>
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
                  className="sh-tap flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition active:scale-[0.97]"
                  style={{ backgroundColor: isActive ? T.navy : "transparent", color: isActive ? "#FFFFFF" : T.textSecondary }}
                  aria-label={action.label}
                  aria-pressed={isActive}
                  title={action.label}
                >
                  <Icon size={15} strokeWidth={2.6} />
                  <span>{action.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="soldierhub-mobile-text-shell absolute bottom-0 left-0 right-0 overflow-y-auto overscroll-contain bg-[#F8FAFD]"
        style={{ top: `calc(env(safe-area-inset-top) + ${TOOLBAR_HEIGHT}px)`, WebkitOverflowScrolling: "touch", scrollPaddingTop: "20px", scrollPaddingBottom: "120px" }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onEditorAreaClick?.();
        }}
      >
        <div className="soldierhub-writing-editor min-h-full bg-[#F8FAFD]">
          {editorContent}
        </div>
      </div>

      <style jsx global>{`
        .soldierhub-mobile-editor-toolbar,
        .soldierhub-mobile-editor-toolbar * {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .soldierhub-mobile-text-shell {
          overflow-anchor: none;
          touch-action: auto !important;
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

        .soldierhub-writing-editor .ProseMirror,
        .soldierhub-writing-editor .ProseMirror * {
          -webkit-user-select: text !important;
          user-select: text !important;
        }

        .soldierhub-writing-editor .ProseMirror {
          flex: 1 1 auto;
          min-height: 100%;
          width: 100%;
          margin: 0 !important;
          padding: 18px 18px calc(env(safe-area-inset-bottom) + 120px) !important;
          color: ${T.text};
          background: #F8FAFD !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          outline: 0 !important;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          font-size: 17px;
          line-height: 1.9rem;
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
