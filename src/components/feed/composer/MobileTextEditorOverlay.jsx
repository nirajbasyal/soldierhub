"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FORMAT_ACTIONS, sanitizeComposerHtml } from "./composerUtils";
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

function moveSelectionToEnd(element) {
  if (!element || typeof window === "undefined") return;
  const selection = window.getSelection?.();
  if (!selection || typeof document === "undefined") return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default function MobileTextEditorOverlay({
  editorContent,
  activeFormats,
  onDone,
  onFormat,
  onEditorAreaClick,
  onOverlayReady,
  nativeEditorHtml = "",
  nativeMode = false,
  onNativeDone,
}) {
  const [viewportBox, setViewportBox] = useState(() => getViewportBox());
  const [editorVisible, setEditorVisible] = useState(false);
  const [nativeFormats, setNativeFormats] = useState({ bold: false, italic: false, bullet: false, number: false });
  const nativeEditorRef = useRef(null);
  const savedNativeRangeRef = useRef(null);

  const updateViewportBox = useCallback(() => {
    setViewportBox(getViewportBox());
  }, []);

  const nativeSelectionIsInside = useCallback(() => {
    if (!nativeMode || typeof window === "undefined") return false;
    const element = nativeEditorRef.current;
    const selection = window.getSelection?.();
    if (!element || !selection || selection.rangeCount === 0) return false;

    const anchorInside = selection.anchorNode ? element.contains(selection.anchorNode) : false;
    const focusInside = selection.focusNode ? element.contains(selection.focusNode) : false;
    return anchorInside || focusInside;
  }, [nativeMode]);

  const saveNativeSelection = useCallback(() => {
    if (!nativeSelectionIsInside()) return;
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0) return;
    savedNativeRangeRef.current = selection.getRangeAt(0).cloneRange();
  }, [nativeSelectionIsInside]);

  const restoreNativeSelection = useCallback(() => {
    const element = nativeEditorRef.current;
    const range = savedNativeRangeRef.current;
    const selection = window.getSelection?.();
    if (!element || !range || !selection) return;

    element.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const updateNativeFormats = useCallback(() => {
    if (!nativeMode || typeof document === "undefined") return;
    setNativeFormats({
      bold: Boolean(document.queryCommandState?.("bold")),
      italic: Boolean(document.queryCommandState?.("italic")),
      bullet: Boolean(document.queryCommandState?.("insertUnorderedList")),
      number: Boolean(document.queryCommandState?.("insertOrderedList")),
    });
  }, [nativeMode]);

  const finishNativeEditor = useCallback(() => {
    if (!nativeMode) {
      onDone?.();
      return;
    }

    const cleanHtml = sanitizeComposerHtml(nativeEditorRef.current?.innerHTML || "");
    onNativeDone?.(cleanHtml);
    onDone?.();
  }, [nativeMode, onDone, onNativeDone]);

  const runNativeFormat = useCallback(
    (command) => {
      if (!nativeMode || typeof document === "undefined") {
        onFormat?.(command);
        return;
      }

      restoreNativeSelection();

      const commandMap = {
        bold: "bold",
        italic: "italic",
        insertUnorderedList: "insertUnorderedList",
        insertOrderedList: "insertOrderedList",
      };

      const execCommand = commandMap[command];
      if (execCommand) document.execCommand(execCommand, false, null);

      saveNativeSelection();
      updateNativeFormats();
    },
    [nativeMode, onFormat, restoreNativeSelection, saveNativeSelection, updateNativeFormats]
  );

  useEffect(() => {
    updateViewportBox();

    const readyTimer = window.setTimeout(() => {
      if (nativeMode) {
        const element = nativeEditorRef.current;
        element?.focus({ preventScroll: true });
        moveSelectionToEnd(element);
        saveNativeSelection();
        updateNativeFormats();
      } else {
        onOverlayReady?.();
      }
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
  }, [nativeMode, onOverlayReady, saveNativeSelection, updateNativeFormats, updateViewportBox]);

  useEffect(() => {
    if (!nativeMode || typeof document === "undefined") return undefined;

    const handleSelectionChange = () => {
      if (!nativeSelectionIsInside()) return;
      saveNativeSelection();
      updateNativeFormats();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [nativeMode, nativeSelectionIsInside, saveNativeSelection, updateNativeFormats]);

  const toolbarFormats = nativeMode ? nativeFormats : activeFormats;

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
              finishNativeEditor();
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
              const isActive = Boolean(toolbarFormats?.[action.key]);
              return (
                <button
                  key={action.key}
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    runNativeFormat(action.command);
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
        onClick={nativeMode ? undefined : onEditorAreaClick}
      >
        <div
          className="soldierhub-writing-editor min-h-full bg-[#F8FAFD] transition-opacity duration-150 ease-out"
          style={{ opacity: editorVisible ? 1 : 0 }}
        >
          {nativeMode ? (
            <div
              ref={nativeEditorRef}
              className="soldierhub-native-mobile-editor"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              role="textbox"
              aria-label="Write your Soldier Hub post"
              aria-multiline="true"
              data-placeholder="Ask, share, or help the Fort Bliss community."
              dangerouslySetInnerHTML={{ __html: sanitizeComposerHtml(nativeEditorHtml || "") }}
              onInput={() => {
                saveNativeSelection();
                updateNativeFormats();
              }}
              onKeyUp={() => {
                saveNativeSelection();
                updateNativeFormats();
              }}
              onMouseUp={() => {
                saveNativeSelection();
                updateNativeFormats();
              }}
              onTouchEnd={() => {
                window.setTimeout(() => {
                  saveNativeSelection();
                  updateNativeFormats();
                }, 0);
              }}
            />
          ) : (
            editorContent
          )}
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

        .soldierhub-writing-editor .ProseMirror,
        .soldierhub-native-mobile-editor {
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

        .soldierhub-native-mobile-editor:empty::before,
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
