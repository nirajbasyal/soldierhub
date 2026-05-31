"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function htmlToMobileText(html = "") {
  const raw = String(html || "").trim();
  if (!raw) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return normalizeText(raw.replace(/<br\s*\/?/gi, "\n").replace(/<[^>]*>/g, ""));
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${sanitizeComposerHtml(raw)}</div>`, "text/html");

  const readNode = (node, listContext = null, index = 1) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName?.toUpperCase();
    if (tag === "BR") return "\n";

    const children = Array.from(node.childNodes).map((child, childIndex) => readNode(child, listContext, childIndex + 1)).join("");

    if (tag === "STRONG" || tag === "B") return children ? `**${children}**` : "";
    if (tag === "EM" || tag === "I") return children ? `*${children}*` : "";

    if (tag === "LI") {
      const clean = children.trim();
      if (!clean) return "";
      if (listContext?.type === "ol") return `${listContext.index}. ${clean}\n`;
      return `• ${clean}\n`;
    }

    if (tag === "UL" || tag === "OL") {
      return Array.from(node.children)
        .filter((child) => child.tagName?.toUpperCase() === "LI")
        .map((child, childIndex) => readNode(child, { type: tag === "OL" ? "ol" : "ul", index: childIndex + 1 }, childIndex + 1))
        .join("") + "\n";
    }

    if (tag === "P" || tag === "DIV") return `${children}\n`;
    return children;
  };

  return normalizeText(Array.from(doc.body.firstElementChild?.childNodes || []).map((node) => readNode(node)).join(""))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inlineMobileTextToHtml(value = "") {
  let output = escapeHtml(value);

  output = output.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/(^|[^*])\*([^*\n]+?)\*/g, "$1<em>$2</em>");

  return output;
}

function mobileTextToHtml(text = "") {
  const lines = normalizeText(text).split("\n");
  const htmlParts = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      htmlParts.push("<p><br /></p>");
      continue;
    }

    if (/^(•|-|\*)\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^(•|-|\*)\s+/.test(lines[index].trim())) {
        items.push(`<li>${inlineMobileTextToHtml(lines[index].trim().replace(/^(•|-|\*)\s+/, ""))}</li>`);
        index += 1;
      }
      index -= 1;
      htmlParts.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(`<li>${inlineMobileTextToHtml(lines[index].trim().replace(/^\d+[.)]\s+/, ""))}</li>`);
        index += 1;
      }
      index -= 1;
      htmlParts.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    htmlParts.push(`<p>${inlineMobileTextToHtml(line)}</p>`);
  }

  return sanitizeComposerHtml(htmlParts.join(""));
}

function wrapSelection(value, start, end, before, after = before) {
  const selected = value.slice(start, end);
  const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  return {
    value: nextValue,
    start: start + before.length,
    end: end + before.length + selected.length,
  };
}

function formatSelectedLines(value, start, end, type) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const selectedBlock = value.slice(lineStart, lineEnd);
  const lines = selectedBlock.split("\n");

  const formattedLines = lines.map((line, lineIndex) => {
    const clean = line.replace(/^(•|-|\*)\s+/, "").replace(/^\d+[.)]\s+/, "");
    if (!clean.trim()) return clean;
    if (type === "number") return `${lineIndex + 1}. ${clean}`;
    return `• ${clean}`;
  });

  const formattedBlock = formattedLines.join("\n");
  return {
    value: `${value.slice(0, lineStart)}${formattedBlock}${value.slice(lineEnd)}`,
    start: lineStart,
    end: lineStart + formattedBlock.length,
  };
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
  const [nativeText, setNativeText] = useState(() => htmlToMobileText(nativeEditorHtml));
  const textareaRef = useRef(null);

  const toolbarFormats = useMemo(() => (nativeMode ? { bold: false, italic: false, bullet: false, number: false } : activeFormats), [activeFormats, nativeMode]);

  const updateViewportBox = useCallback(() => {
    setViewportBox(getViewportBox());
  }, []);

  const focusNativeEditor = useCallback((selectionStart = null, selectionEnd = null) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus({ preventScroll: true });

    if (selectionStart !== null && selectionEnd !== null) {
      window.setTimeout(() => {
        textarea.setSelectionRange(selectionStart, selectionEnd);
      }, 0);
    }
  }, []);

  const finishEditor = useCallback(() => {
    if (!nativeMode) {
      onDone?.();
      return;
    }

    onNativeDone?.(mobileTextToHtml(nativeText));
    onDone?.();
  }, [nativeMode, nativeText, onDone, onNativeDone]);

  const runFormat = useCallback(
    (command) => {
      if (!nativeMode) {
        onFormat?.(command);
        return;
      }

      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? start;
      let result = { value: nativeText, start, end };

      if (command === "bold") result = wrapSelection(nativeText, start, end, "**");
      if (command === "italic") result = wrapSelection(nativeText, start, end, "*");
      if (command === "insertUnorderedList") result = formatSelectedLines(nativeText, start, end, "bullet");
      if (command === "insertOrderedList") result = formatSelectedLines(nativeText, start, end, "number");

      setNativeText(result.value);
      focusNativeEditor(result.start, result.end);
    },
    [focusNativeEditor, nativeMode, nativeText, onFormat]
  );

  useEffect(() => {
    if (nativeMode) setNativeText(htmlToMobileText(nativeEditorHtml));
  }, [nativeEditorHtml, nativeMode]);

  useEffect(() => {
    updateViewportBox();

    const readyTimer = window.setTimeout(() => {
      if (nativeMode) {
        const textarea = textareaRef.current;
        textarea?.focus({ preventScroll: true });
        const end = textarea?.value?.length ?? 0;
        textarea?.setSelectionRange(end, end);
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
  }, [nativeMode, onOverlayReady, updateViewportBox]);

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
              finishEditor();
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
                    runFormat(action.command);
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
        className="soldierhub-mobile-text-shell absolute bottom-0 left-0 right-0 overflow-hidden bg-[#F8FAFD]"
        style={{ top: `calc(env(safe-area-inset-top) + ${TOOLBAR_HEIGHT}px)` }}
        onClick={nativeMode ? undefined : onEditorAreaClick}
      >
        <div className="soldierhub-writing-editor min-h-full bg-[#F8FAFD] transition-opacity duration-150 ease-out" style={{ opacity: editorVisible ? 1 : 0 }}>
          {nativeMode ? (
            <textarea
              ref={textareaRef}
              className="soldierhub-native-mobile-textarea"
              value={nativeText}
              onChange={(event) => setNativeText(event.target.value)}
              placeholder="Ask, share, or help the Fort Bliss community."
              spellCheck
              aria-label="Write your Soldier Hub post"
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
        .soldierhub-native-mobile-textarea {
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
          -webkit-touch-callout: default !important;
          -webkit-user-select: text !important;
          user-select: text !important;
          touch-action: auto !important;
        }

        .soldierhub-native-mobile-textarea {
          resize: none !important;
          overflow-y: auto !important;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
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
