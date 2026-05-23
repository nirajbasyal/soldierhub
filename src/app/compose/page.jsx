"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/PostComposer";

const LONG_TEXT_EDITOR_HEIGHT_TRIGGER = 232;
const LONG_TEXT_EDITOR_OVERFLOW_ALLOWANCE = 18;
const LONG_TEXT_EDITOR_SUPPRESS_MS = 750;
const LONG_TEXT_EDITOR_ANIMATION_MS = 240;
const LONG_TEXT_EDITOR_MORPH_MS = 300;
const LONG_TEXT_EDITOR_FOCUS_DELAY_MS = 20;
const LONG_TEXT_EDITOR_RETURN_DELAY_MS = 70;
const LONG_TEXT_EDITOR_HEADER_HEIGHT = 58;
const LONG_TEXT_EDITOR_TOOLBAR_HEIGHT = 57;
const LONG_TEXT_EDITOR_SMALL_ROW_LIMIT = 6.1;
const SMALL_COMPOSER_WRAP_CHARS = 34;
const LONG_TEXT_EDITOR_BACKGROUND = "#F8FAFD";
const COMPOSER_EDITOR_SELECTOR =
  'div[contenteditable="true"][aria-label="Write your SoldierHub post"]';

const LONG_EDITOR_FORMAT_ACTIONS = [
  { key: "bold", command: "bold", label: "Bold", shortLabel: "B", icon: Bold },
  { key: "italic", command: "italic", label: "Italic", shortLabel: "I", icon: Italic },
  { key: "bullet", command: "insertUnorderedList", label: "Bullet list", shortLabel: "•", icon: List },
  { key: "number", command: "insertOrderedList", label: "Numbered list", shortLabel: "1", icon: ListOrdered },
  { key: "quote", command: "formatBlock", label: "Quote", shortLabel: "Quote", icon: Quote },
];

function getEditorText(editor) {
  return (editor?.innerText || "").replace(/\u200B/g, "").replace(/\u00a0/g, " ").trim();
}

function getViewportSnapshot() {
  if (typeof window === "undefined") {
    return { height: 0, top: 0 };
  }

  const viewport = window.visualViewport;

  return {
    height: Math.max(320, Math.floor(viewport?.height || window.innerHeight || 0)),
    top: Math.max(0, Math.floor(viewport?.offsetTop || 0)),
  };
}

function estimateSmallComposerRows(rawText = "") {
  const normalized = String(rawText || "")
    .replace(/\u200B/g, "")
    .replace(/\u00a0/g, " ");

  const lines = normalized.split(/\n/);

  return lines.reduce((total, line) => {
    const visualRows = Math.max(1, Math.ceil(line.length / SMALL_COMPOSER_WRAP_CHARS));
    return total + visualRows;
  }, 0);
}

function shouldReturnToSmallEditor(editor) {
  if (!editor) return false;

  const rawText = (editor.innerText || "").replace(/\u200B/g, "").replace(/\u00a0/g, " ");
  const text = rawText.trim();

  if (!text) return true;

  return estimateSmallComposerRows(rawText) <= LONG_TEXT_EDITOR_SMALL_ROW_LIMIT;
}

function shouldOpenLongTextEditor(editor) {
  if (!editor || typeof window === "undefined") return false;

  const text = getEditorText(editor);
  if (!text) return false;

  const scrollOverflow =
    editor.scrollHeight > editor.clientHeight + LONG_TEXT_EDITOR_OVERFLOW_ALLOWANCE;
  if (scrollOverflow) return true;

  const computedStyle = window.getComputedStyle(editor);
  const maxHeight = Number.parseFloat(computedStyle.maxHeight || "0");

  if (
    Number.isFinite(maxHeight) &&
    maxHeight > 0 &&
    editor.scrollHeight > maxHeight + LONG_TEXT_EDITOR_OVERFLOW_ALLOWANCE
  ) {
    return true;
  }

  const currentHeight = editor.getBoundingClientRect().height;

  return (
    currentHeight >= LONG_TEXT_EDITOR_HEIGHT_TRIGGER &&
    editor.scrollHeight >= LONG_TEXT_EDITOR_HEIGHT_TRIGGER
  );
}

function placeCursorAtEnd(element) {
  if (typeof window === "undefined" || !element) return;

  element.focus({ preventScroll: true });

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);

  const selection = window.getSelection?.();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function queryCommandIsActive(command) {
  if (typeof document === "undefined" || typeof document.queryCommandState !== "function") {
    return false;
  }

  try {
    return Boolean(document.queryCommandState(command));
  } catch {
    return false;
  }
}

function getSelectionElement(editor) {
  if (typeof window === "undefined") return null;

  const selection = window.getSelection?.();
  const anchorNode = selection?.anchorNode;
  if (!editor || !anchorNode || !editor.contains(anchorNode)) return null;

  return anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
}

function selectionInsideTag(editor, tagName) {
  return Boolean(getSelectionElement(editor)?.closest?.(tagName));
}

function isPhoneWidth() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(max-width: 640px)")?.matches ?? window.innerWidth <= 640;
}

function dispatchComposerInput(editor) {
  if (!editor || typeof window === "undefined") return;

  const inputEvent =
    typeof InputEvent === "function"
      ? new InputEvent("input", { bubbles: true, inputType: "insertText" })
      : new Event("input", { bubbles: true });

  editor.dispatchEvent(inputEvent);
  editor.dispatchEvent(new Event("keyup", { bubbles: true }));
}

export default function ComposePage() {
  const router = useRouter();
  const [longEditorOpen, setLongEditorOpen] = useState(false);
  const [longEditorClosing, setLongEditorClosing] = useState(false);
  const [longEditorMorphing, setLongEditorMorphing] = useState(false);
  const [longEditorMorph, setLongEditorMorph] = useState(null);
  const [longEditorText, setLongEditorText] = useState("");
  const [longEditorFormats, setLongEditorFormats] = useState({});
  const [longEditorViewport, setLongEditorViewport] = useState({ height: null, top: 0 });
  const expandedEditorRef = useRef(null);
  const longEditorScrollRef = useRef(null);
  const sourceEditorRef = useRef(null);
  const sourceHtmlRef = useRef("");
  const suppressLongEditorUntilRef = useRef(0);
  const longEditorCloseTimerRef = useRef(null);
  const longEditorMorphTimerRef = useRef(null);
  const longEditorFocusTimerRef = useRef(null);
  const longEditorReturnTimerRef = useRef(null);
  const longEditorMorphingRef = useRef(false);
  const longEditorReturningRef = useRef(false);

  const getComposerEditor = () => {
    if (typeof document === "undefined") return null;
    return document.querySelector(COMPOSER_EDITOR_SELECTOR);
  };

  const getComposerEditorFromEvent = (event) => {
    const target = event?.target;
    if (!(target instanceof Element)) return null;
    return target.closest(COMPOSER_EDITOR_SELECTOR);
  };

  const scrollLongEditorCaretIntoView = () => {
    if (longEditorMorphingRef.current || longEditorReturningRef.current) return;

    const scroller = longEditorScrollRef.current;
    const editor = expandedEditorRef.current;
    if (!scroller || !editor || typeof window === "undefined") return;

    const selection = window.getSelection?.();
    if (!selection?.rangeCount || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;

    const range = selection.getRangeAt(0).cloneRange();
    let rect = range.getBoundingClientRect();

    if ((!rect || (rect.width === 0 && rect.height === 0)) && selection.anchorNode.parentElement) {
      rect = selection.anchorNode.parentElement.getBoundingClientRect();
    }

    if (!rect) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const bottomBuffer = 56;
    const topBuffer = 28;

    if (rect.bottom > scrollerRect.bottom - bottomBuffer) {
      scroller.scrollTop += rect.bottom - (scrollerRect.bottom - bottomBuffer);
      return;
    }

    if (rect.top < scrollerRect.top + topBuffer) {
      scroller.scrollTop -= scrollerRect.top + topBuffer - rect.top;
    }
  };

  const syncLongEditorFormats = () => {
    const editor = expandedEditorRef.current;
    if (!editor || typeof document === "undefined") return;

    setLongEditorFormats({
      bold: queryCommandIsActive("bold") || selectionInsideTag(editor, "strong,b"),
      italic: queryCommandIsActive("italic") || selectionInsideTag(editor, "em,i"),
      bullet: queryCommandIsActive("insertUnorderedList") || selectionInsideTag(editor, "ul"),
      number: queryCommandIsActive("insertOrderedList") || selectionInsideTag(editor, "ol"),
      quote: selectionInsideTag(editor, "blockquote"),
    });
  };

  const focusExpandedEditorAfterMorph = () => {
    const editor = expandedEditorRef.current;
    if (!editor) return;

    editor.innerHTML = sourceHtmlRef.current || editor.innerHTML || "";
    placeCursorAtEnd(editor);
    syncLongEditorFormats();
    window.requestAnimationFrame?.(scrollLongEditorCaretIntoView);
  };

  const clearTransitionTimers = () => {
    if (longEditorMorphTimerRef.current) {
      window.clearTimeout(longEditorMorphTimerRef.current);
      longEditorMorphTimerRef.current = null;
    }

    if (longEditorFocusTimerRef.current) {
      window.clearTimeout(longEditorFocusTimerRef.current);
      longEditorFocusTimerRef.current = null;
    }

    if (longEditorReturnTimerRef.current) {
      window.clearTimeout(longEditorReturnTimerRef.current);
      longEditorReturnTimerRef.current = null;
    }
  };

  const openLongTextEditor = (editor) => {
    if (!editor || longEditorOpen || !isPhoneWidth()) return;

    if (longEditorCloseTimerRef.current) {
      window.clearTimeout(longEditorCloseTimerRef.current);
      longEditorCloseTimerRef.current = null;
    }

    clearTransitionTimers();

    const rect = editor.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(editor);
    const viewport = getViewportSnapshot();
    const targetTop = LONG_TEXT_EDITOR_HEADER_HEIGHT + LONG_TEXT_EDITOR_TOOLBAR_HEIGHT;

    setLongEditorViewport({ height: viewport.height, top: viewport.top });
    setLongEditorMorph({
      left: Math.max(0, rect.left),
      top: Math.max(0, rect.top - viewport.top),
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
      targetTop,
      targetHeight: Math.max(190, viewport.height - targetTop),
      borderRadius: computedStyle.borderRadius || "24px",
      fontSize: computedStyle.fontSize || "18px",
      lineHeight: computedStyle.lineHeight || "32px",
      paddingTop: computedStyle.paddingTop || "12px",
      paddingRight: computedStyle.paddingRight || "14px",
      paddingBottom: computedStyle.paddingBottom || "12px",
      paddingLeft: computedStyle.paddingLeft || "14px",
      scrollTop: Math.max(0, editor.scrollTop || 0),
    });

    sourceEditorRef.current = editor;
    sourceHtmlRef.current = editor.innerHTML || "";
    setLongEditorText(getEditorText(editor));
    setLongEditorClosing(false);
    longEditorReturningRef.current = false;
    longEditorMorphingRef.current = true;
    setLongEditorMorphing(true);
    setLongEditorOpen(true);

    longEditorMorphTimerRef.current = window.setTimeout(() => {
      const latestViewport = getViewportSnapshot();

      setLongEditorViewport({ height: latestViewport.height, top: latestViewport.top });
      setLongEditorMorph((current) =>
        current
          ? {
              ...current,
              targetHeight: Math.max(190, latestViewport.height - current.targetTop),
            }
          : current
      );

      longEditorMorphingRef.current = false;
      setLongEditorMorphing(false);
      longEditorMorphTimerRef.current = null;

      longEditorFocusTimerRef.current = window.setTimeout(() => {
        focusExpandedEditorAfterMorph();
        longEditorFocusTimerRef.current = null;
      }, LONG_TEXT_EDITOR_FOCUS_DELAY_MS);
    }, LONG_TEXT_EDITOR_MORPH_MS);
  };

  const closeLongEditorToSmallComposer = () => {
    if (longEditorReturningRef.current) return;

    const expandedEditor = expandedEditorRef.current;
    const sourceEditor = sourceEditorRef.current || getComposerEditor();
    const nextHtml = expandedEditor?.innerHTML || sourceHtmlRef.current || "";

    if (sourceEditor) {
      sourceEditor.innerHTML = nextHtml;
      dispatchComposerInput(sourceEditor);
    }

    suppressLongEditorUntilRef.current = Date.now() + LONG_TEXT_EDITOR_SUPPRESS_MS;
    longEditorReturningRef.current = true;
    longEditorMorphingRef.current = false;
    setLongEditorMorphing(false);
    setLongEditorClosing(true);
    clearTransitionTimers();

    if (longEditorCloseTimerRef.current) {
      window.clearTimeout(longEditorCloseTimerRef.current);
    }

    longEditorCloseTimerRef.current = window.setTimeout(() => {
      setLongEditorOpen(false);
      setLongEditorClosing(false);
      setLongEditorText("");
      setLongEditorFormats({});
      setLongEditorMorph(null);
      longEditorReturningRef.current = false;
      longEditorCloseTimerRef.current = null;

      window.requestAnimationFrame?.(() => {
        placeCursorAtEnd(sourceEditor);
      });
    }, LONG_TEXT_EDITOR_ANIMATION_MS);
  };

  const syncLongEditorText = (event) => {
    const editor = expandedEditorRef.current;
    const nextText = getEditorText(editor);
    const inputType = event?.nativeEvent?.inputType || event?.inputType || "";
    const deleting = inputType.startsWith("delete");

    sourceHtmlRef.current = editor?.innerHTML || sourceHtmlRef.current;
    setLongEditorText(nextText);

    if (longEditorReturnTimerRef.current) {
      window.clearTimeout(longEditorReturnTimerRef.current);
      longEditorReturnTimerRef.current = null;
    }

    if (deleting && !longEditorMorphingRef.current && shouldReturnToSmallEditor(editor)) {
      longEditorReturnTimerRef.current = window.setTimeout(() => {
        closeLongEditorToSmallComposer();
        longEditorReturnTimerRef.current = null;
      }, LONG_TEXT_EDITOR_RETURN_DELAY_MS);
      return;
    }

    window.requestAnimationFrame?.(() => {
      syncLongEditorFormats();
      scrollLongEditorCaretIntoView();
    });
  };

  const applyLongEditorFormat = (action) => {
    const editor = expandedEditorRef.current;
    if (!editor || typeof document === "undefined") return;

    editor.focus({ preventScroll: true });

    try {
      if (action.command === "formatBlock") {
        const isQuoteActive =
          Boolean(longEditorFormats.quote) || selectionInsideTag(editor, "blockquote");
        document.execCommand("formatBlock", false, isQuoteActive ? "p" : "blockquote");
      } else {
        document.execCommand(action.command, false, null);
      }
    } catch {
      // Keep the long editor usable if a browser blocks an older execCommand call.
    }

    window.requestAnimationFrame?.(syncLongEditorText);
  };

  const handleLongEditorPaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";

    try {
      document.execCommand("insertText", false, text);
    } catch {
      const editor = expandedEditorRef.current;
      if (editor) editor.textContent = `${editor.textContent || ""}${text}`;
    }

    window.requestAnimationFrame?.(syncLongEditorText);
  };

  const finishLongTextEditor = () => {
    const expandedEditor = expandedEditorRef.current;
    const sourceEditor = sourceEditorRef.current || getComposerEditor();
    const nextHtml = expandedEditor?.innerHTML || sourceHtmlRef.current || "";

    if (sourceEditor) {
      sourceEditor.innerHTML = nextHtml;
      dispatchComposerInput(sourceEditor);
    }

    suppressLongEditorUntilRef.current = Date.now() + LONG_TEXT_EDITOR_SUPPRESS_MS;
    expandedEditor?.blur?.();
    sourceEditor?.blur?.();
    longEditorReturningRef.current = false;
    longEditorMorphingRef.current = false;
    setLongEditorMorphing(false);
    setLongEditorClosing(true);
    clearTransitionTimers();

    if (longEditorCloseTimerRef.current) {
      window.clearTimeout(longEditorCloseTimerRef.current);
    }

    longEditorCloseTimerRef.current = window.setTimeout(() => {
      setLongEditorOpen(false);
      setLongEditorClosing(false);
      setLongEditorText("");
      setLongEditorFormats({});
      setLongEditorMorph(null);
      longEditorCloseTimerRef.current = null;
    }, LONG_TEXT_EDITOR_ANIMATION_MS);
  };

  useEffect(() => {
    return () => {
      if (longEditorCloseTimerRef.current) {
        window.clearTimeout(longEditorCloseTimerRef.current);
      }

      clearTransitionTimers();
    };
  }, []);

  useEffect(() => {
    const forceSingleImagePicker = () => {
      document.querySelectorAll('input[type="file"][accept*="image"]').forEach((input) => {
        input.multiple = false;
        input.removeAttribute("multiple");
      });
    };

    forceSingleImagePicker();
    document.addEventListener("pointerdown", forceSingleImagePicker, true);
    document.addEventListener("click", forceSingleImagePicker, true);

    return () => {
      document.removeEventListener("pointerdown", forceSingleImagePicker, true);
      document.removeEventListener("click", forceSingleImagePicker, true);
    };
  }, []);

  useEffect(() => {
    const maybeOpenLongEditor = (event) => {
      if (longEditorOpen || !isPhoneWidth()) return;
      if (Date.now() < suppressLongEditorUntilRef.current) return;

      const editor = getComposerEditorFromEvent(event);
      if (!editor) return;

      if (shouldOpenLongTextEditor(editor)) {
        openLongTextEditor(editor);
      }
    };

    document.addEventListener("input", maybeOpenLongEditor, true);

    return () => {
      document.removeEventListener("input", maybeOpenLongEditor, true);
    };
  }, [longEditorOpen]);

  useEffect(() => {
    if (!longEditorOpen) return undefined;

    const sourceEditor = sourceEditorRef.current;
    if (!sourceEditor) return undefined;

    const syncFastTypingDuringMorph = () => {
      if (!longEditorMorphingRef.current) return;

      sourceHtmlRef.current = sourceEditor.innerHTML || "";
      setLongEditorText(getEditorText(sourceEditor));

      if (expandedEditorRef.current) {
        expandedEditorRef.current.innerHTML = sourceHtmlRef.current;
      }
    };

    sourceEditor.addEventListener("input", syncFastTypingDuringMorph);

    return () => {
      sourceEditor.removeEventListener("input", syncFastTypingDuringMorph);
    };
  }, [longEditorOpen]);

  useEffect(() => {
    if (!longEditorOpen) return undefined;

    const updateVisibleViewport = () => {
      if (longEditorMorphingRef.current) return;

      const nextViewport = getViewportSnapshot();

      setLongEditorViewport({ height: nextViewport.height, top: nextViewport.top });
      setLongEditorMorph((current) =>
        current
          ? {
              ...current,
              targetHeight: Math.max(190, nextViewport.height - current.targetTop),
            }
          : current
      );
      window.requestAnimationFrame?.(() => {
        scrollLongEditorCaretIntoView();
      });
      window.setTimeout(scrollLongEditorCaretIntoView, 140);
    };

    updateVisibleViewport();

    window.visualViewport?.addEventListener("resize", updateVisibleViewport);
    window.visualViewport?.addEventListener("scroll", updateVisibleViewport);
    window.addEventListener("resize", updateVisibleViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateVisibleViewport);
      window.visualViewport?.removeEventListener("scroll", updateVisibleViewport);
      window.removeEventListener("resize", updateVisibleViewport);
    };
  }, [longEditorOpen]);

  useEffect(() => {
    if (!longEditorOpen) return undefined;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    window.requestAnimationFrame?.(() => {
      if (!expandedEditorRef.current) return;
      expandedEditorRef.current.innerHTML = sourceHtmlRef.current || "";
    });

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [longEditorOpen]);

  return (
    <AppShell hideNav>
      <main
        className="compose-page min-h-[100dvh] overflow-x-hidden overflow-y-auto pb-24 md:pb-10"
        style={{ backgroundColor: T.bg, WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="sticky top-0 z-[80] border-b backdrop-blur-xl"
          style={{ borderColor: T.borderSoft, backgroundColor: "rgba(248,247,244,0.94)" }}
        >
          <div className="mx-auto flex h-[58px] w-full max-w-[860px] items-center justify-between gap-2 px-3 sm:px-6 md:h-[76px] md:px-8">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="sh-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.96]"
              style={{ backgroundColor: "rgba(255,255,255,0.94)", borderColor: T.border, color: T.navy }}
              aria-label="Back to feed"
              title="Back to feed"
            >
              <ArrowLeft size={22} strokeWidth={2.45} />
            </button>

            <h1
              className="min-w-0 flex-1 truncate text-center text-[19px] font-extrabold tracking-[-0.025em] md:text-[27px]"
              style={{ color: T.text }}
            >
              New Post
            </h1>

            <div
              className="flex min-w-0 max-w-[126px] shrink-0 items-center justify-end gap-1 rounded-full border px-2 py-1.5 text-right text-[9px] font-semibold leading-tight md:max-w-[260px] md:px-3 md:text-xs"
              style={{
                backgroundColor: "rgba(255,244,246,0.9)",
                borderColor: "rgba(179,25,66,0.16)",
                color: "#6E2333",
              }}
              title="Do not post sensitive info. Be kind."
            >
              <AlertTriangle size={12} className="shrink-0" style={{ color: "#B31942" }} />
              <span className="truncate md:hidden">No sensitive info</span>
              <span className="hidden truncate md:inline">Do not post sensitive info. Be kind.</span>
            </div>
          </div>
        </div>

        <div className="compose-shell mx-auto w-full max-w-[860px] px-3 pt-3 sm:px-6 md:px-8 md:pt-8">
          <PostComposer startOpen pageMode />
        </div>

        {longEditorOpen ? (
          <div
            className={`fixed left-0 right-0 z-[140] flex max-h-[100dvh] flex-col overflow-hidden overscroll-contain md:hidden ${
              longEditorClosing ? "sh-long-editor-exit" : "sh-long-editor-enter"
            } ${longEditorMorphing ? "sh-long-editor-morphing" : "sh-long-editor-ready"}`}
            style={{
              backgroundColor: LONG_TEXT_EDITOR_BACKGROUND,
              height: longEditorViewport.height ? `${longEditorViewport.height}px` : "100dvh",
              top: `${longEditorViewport.top || 0}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Expanded post text editor"
          >
            <div
              className="sh-long-editor-top relative z-10 flex h-[58px] shrink-0 items-center justify-between border-b px-4"
              style={{ backgroundColor: "rgba(248,250,253,0.98)", borderColor: T.borderSoft }}
            >
              <div className="w-16" />
              <div className="text-[21px] font-extrabold tracking-[-0.03em]" style={{ color: T.text }}>
                Add text
              </div>
              <button
                type="button"
                onClick={finishLongTextEditor}
                className="sh-tap w-16 rounded-full px-2 py-2 text-right text-[17px] font-bold active:scale-[0.98]"
                style={{ color: T.navy }}
              >
                Done
              </button>
            </div>

            <div
              className="sh-long-editor-toolbar relative z-10 shrink-0 border-b px-3 py-2"
              style={{ backgroundColor: "rgba(248,250,253,0.98)", borderColor: T.borderSoft }}
              aria-label="Expanded editor formatting toolbar"
            >
              <div className="grid grid-cols-5 gap-2">
                {LONG_EDITOR_FORMAT_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const active = Boolean(longEditorFormats[action.key]);

                  return (
                    <button
                      key={action.key}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyLongEditorFormat(action)}
                      className="sh-tap flex h-10 items-center justify-center rounded-full border text-[12px] font-extrabold transition active:scale-[0.98]"
                      style={{
                        backgroundColor: active ? "rgba(63, 95, 125, 0.15)" : "#FFFFFF",
                        borderColor: active ? "rgba(63, 95, 125, 0.32)" : T.border,
                        color: active ? T.navy : T.textSubtle,
                      }}
                      aria-label={action.label}
                      aria-pressed={active}
                      title={action.label}
                    >
                      <Icon size={18} strokeWidth={2.5} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              ref={longEditorScrollRef}
              className="sh-long-editor-body relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3"
              style={{
                backgroundColor: LONG_TEXT_EDITOR_BACKGROUND,
                WebkitOverflowScrolling: "touch",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 44px)",
                scrollPaddingBottom: "44px",
              }}
            >
              {!longEditorText ? (
                <div
                  className="pointer-events-none absolute left-3.5 right-14 top-3.5 text-[18px] leading-8"
                  style={{ color: "#A8ABB2" }}
                >
                  What&apos;s on your mind?
                </div>
              ) : null}

              <div
                ref={expandedEditorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Expanded SoldierHub post text"
                aria-multiline="true"
                onInput={syncLongEditorText}
                onFocus={() => {
                  syncLongEditorFormats();
                  window.setTimeout(scrollLongEditorCaretIntoView, 180);
                }}
                onKeyUp={() => {
                  syncLongEditorFormats();
                  scrollLongEditorCaretIntoView();
                }}
                onMouseUp={() => {
                  syncLongEditorFormats();
                  scrollLongEditorCaretIntoView();
                }}
                onPaste={handleLongEditorPaste}
                className="min-h-full w-full bg-transparent pr-10 text-[18px] leading-8 outline-none [&_blockquote]:my-3 [&_blockquote]:rounded-[18px] [&_blockquote]:border-0 [&_blockquote]:bg-[#DDE8F3] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:font-normal [&_blockquote]:text-[#102033] [&_div]:min-h-[1.65em] [&_div]:whitespace-pre-wrap [&_em]:italic [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:min-h-[1.65em] [&_p]:whitespace-pre-wrap [&_strong]:font-extrabold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1"
                style={{
                  color: T.text,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  paddingBottom: "28px",
                }}
              />
            </div>

            {longEditorMorphing && longEditorMorph ? (
              <div
                className="sh-editor-morph-card"
                aria-hidden="true"
                style={{
                  "--sh-origin-left": `${longEditorMorph.left}px`,
                  "--sh-origin-top": `${longEditorMorph.top}px`,
                  "--sh-origin-width": `${longEditorMorph.width}px`,
                  "--sh-origin-height": `${longEditorMorph.height}px`,
                  "--sh-target-top": `${longEditorMorph.targetTop}px`,
                  "--sh-target-height": `${longEditorMorph.targetHeight}px`,
                  "--sh-origin-radius": longEditorMorph.borderRadius,
                  "--sh-origin-font-size": longEditorMorph.fontSize,
                  "--sh-origin-line-height": longEditorMorph.lineHeight,
                  "--sh-origin-padding-top": longEditorMorph.paddingTop,
                  "--sh-origin-padding-right": longEditorMorph.paddingRight,
                  "--sh-origin-padding-bottom": longEditorMorph.paddingBottom,
                  "--sh-origin-padding-left": longEditorMorph.paddingLeft,
                  "--sh-source-scroll": `${longEditorMorph.scrollTop}px`,
                }}
              >
                <div className="sh-editor-morph-text">{longEditorText}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        <style jsx global>{`
          @keyframes soldierhubLongEditorIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes soldierhubLongEditorOut {
            from {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
            to {
              opacity: 0;
              transform: translate3d(0, 10px, 0) scale(0.995);
            }
          }

          @keyframes soldierhubLongEditorToolbarIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes soldierhubLongEditorBodyIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes soldierhubEditorMorphCard {
            0% {
              left: var(--sh-origin-left);
              top: var(--sh-origin-top);
              width: var(--sh-origin-width);
              height: var(--sh-origin-height);
              border-radius: var(--sh-origin-radius);
              padding: var(--sh-origin-padding-top) var(--sh-origin-padding-right)
                var(--sh-origin-padding-bottom) var(--sh-origin-padding-left);
              font-size: var(--sh-origin-font-size);
              line-height: var(--sh-origin-line-height);
              box-shadow: 0 18px 40px rgba(11, 28, 44, 0.08);
              opacity: 1;
            }
            84% {
              opacity: 1;
            }
            100% {
              left: 0;
              top: var(--sh-target-top);
              width: 100vw;
              height: var(--sh-target-height);
              border-radius: 0;
              padding: var(--sh-origin-padding-top) var(--sh-origin-padding-right)
                var(--sh-origin-padding-bottom) var(--sh-origin-padding-left);
              font-size: var(--sh-origin-font-size);
              line-height: var(--sh-origin-line-height);
              box-shadow: none;
              opacity: 0;
            }
          }

          @keyframes soldierhubMorphCaretBlink {
            0%,
            45% {
              opacity: 1;
            }
            46%,
            100% {
              opacity: 0;
            }
          }

          .sh-long-editor-enter {
            animation: soldierhubLongEditorIn 80ms ease-out both;
            will-change: opacity;
          }

          .sh-long-editor-exit {
            pointer-events: none;
            animation: soldierhubLongEditorOut 240ms cubic-bezier(0.4, 0, 0.2, 1) both;
            transform-origin: bottom center;
            will-change: opacity, transform;
          }

          .sh-long-editor-enter .sh-long-editor-top,
          .sh-long-editor-enter .sh-long-editor-toolbar {
            animation: soldierhubLongEditorToolbarIn 180ms ease-out 80ms both;
          }

          .sh-long-editor-morphing .sh-long-editor-body {
            opacity: 0;
          }

          .sh-long-editor-ready .sh-long-editor-body {
            animation: soldierhubLongEditorBodyIn 90ms ease-out both;
          }

          .sh-editor-morph-card {
            position: absolute;
            z-index: 35;
            overflow: hidden;
            background: #f8fafd;
            color: #102033;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            pointer-events: none;
            animation: soldierhubEditorMorphCard 300ms cubic-bezier(0.2, 0.82, 0.2, 1) both;
            will-change: left, top, width, height, border-radius, padding, opacity;
          }

          .sh-editor-morph-text {
            transform: translateY(calc(-1 * var(--sh-source-scroll, 0px)));
          }

          .sh-editor-morph-text::after {
            content: "";
            display: inline-block;
            width: 2px;
            height: 1.05em;
            margin-left: 2px;
            border-radius: 999px;
            background: #102033;
            vertical-align: -0.15em;
            animation: soldierhubMorphCaretBlink 900ms steps(1, end) infinite;
          }

          @keyframes soldierhubAnonymousComposeNotice {
            0% {
              opacity: 0;
              max-height: 0;
              margin-top: 0;
              margin-bottom: 0;
              padding-top: 0;
              padding-bottom: 0;
              border-width: 0;
              transform: translateY(8px) scale(0.985);
            }
            12% {
              opacity: 1;
              max-height: 120px;
              margin-top: 8px;
              margin-bottom: -2px;
              padding-top: 0.625rem;
              padding-bottom: 0.625rem;
              border-width: 1px;
              transform: translateY(0) scale(1);
            }
            72% {
              opacity: 1;
              max-height: 120px;
              margin-top: 8px;
              margin-bottom: -2px;
              padding-top: 0.625rem;
              padding-bottom: 0.625rem;
              border-width: 1px;
              transform: translateY(0) scale(1);
            }
            100% {
              opacity: 0;
              max-height: 0;
              margin-top: 0;
              margin-bottom: 0;
              padding-top: 0;
              padding-bottom: 0;
              border-width: 0;
              transform: translateY(4px) scale(0.99);
            }
          }

          .compose-shell > div.relative.flex.flex-col > div[class*="sticky"][class*="bottom-2"][class*="z-40"] {
            order: 40;
          }

          .compose-shell > div.relative.flex.flex-col > div.mt-2.flex.items-start.gap-2.rounded-2xl.border {
            order: 35;
            position: relative;
            z-index: 55;
            pointer-events: none;
            overflow: hidden;
            max-height: 120px;
            margin-top: 8px !important;
            margin-bottom: -2px !important;
            box-shadow: 0 14px 30px rgba(179, 25, 66, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.75);
            animation: soldierhubAnonymousComposeNotice 4.6s ease-in-out forwards;
            will-change: opacity, max-height, margin, padding, transform;
          }
        `}</style>
      </main>
    </AppShell>
  );
}
