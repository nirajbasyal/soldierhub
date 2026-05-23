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

const LONG_TEXT_EDITOR_THRESHOLD = 420;
const LONG_TEXT_EDITOR_SUPPRESS_MS = 750;
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
  const [longEditorText, setLongEditorText] = useState("");
  const [longEditorFormats, setLongEditorFormats] = useState({});
  const expandedEditorRef = useRef(null);
  const sourceEditorRef = useRef(null);
  const sourceHtmlRef = useRef("");
  const suppressLongEditorUntilRef = useRef(0);

  const getComposerEditor = () => {
    if (typeof document === "undefined") return null;
    return document.querySelector(COMPOSER_EDITOR_SELECTOR);
  };

  const getComposerEditorFromEvent = (event) => {
    const target = event?.target;
    if (!(target instanceof Element)) return null;
    return target.closest(COMPOSER_EDITOR_SELECTOR);
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

  const openLongTextEditor = (editor) => {
    if (!editor || longEditorOpen || !isPhoneWidth()) return;

    sourceEditorRef.current = editor;
    sourceHtmlRef.current = editor.innerHTML || "";
    setLongEditorText(getEditorText(editor));
    setLongEditorOpen(true);
  };

  const syncLongEditorText = () => {
    const editor = expandedEditorRef.current;
    setLongEditorText(getEditorText(editor));
    window.requestAnimationFrame?.(syncLongEditorFormats);
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
    const nextHtml = expandedEditor?.innerHTML || "";

    if (sourceEditor) {
      sourceEditor.innerHTML = nextHtml;
      dispatchComposerInput(sourceEditor);
    }

    suppressLongEditorUntilRef.current = Date.now() + LONG_TEXT_EDITOR_SUPPRESS_MS;
    expandedEditor?.blur?.();
    sourceEditor?.blur?.();
    setLongEditorOpen(false);
    setLongEditorText("");
    setLongEditorFormats({});
  };

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

      if (getEditorText(editor).length >= LONG_TEXT_EDITOR_THRESHOLD) {
        openLongTextEditor(editor);
      }
    };

    document.addEventListener("pointerdown", maybeOpenLongEditor, true);
    document.addEventListener("click", maybeOpenLongEditor, true);
    document.addEventListener("input", maybeOpenLongEditor, true);
    document.addEventListener("focusin", maybeOpenLongEditor, true);

    return () => {
      document.removeEventListener("pointerdown", maybeOpenLongEditor, true);
      document.removeEventListener("click", maybeOpenLongEditor, true);
      document.removeEventListener("input", maybeOpenLongEditor, true);
      document.removeEventListener("focusin", maybeOpenLongEditor, true);
    };
  }, [longEditorOpen]);

  useEffect(() => {
    if (!longEditorOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    window.requestAnimationFrame?.(() => {
      if (!expandedEditorRef.current) return;
      expandedEditorRef.current.innerHTML = sourceHtmlRef.current || "";
      placeCursorAtEnd(expandedEditorRef.current);
      syncLongEditorFormats();
    });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
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
            className="fixed inset-0 z-[140] flex h-[100dvh] flex-col overflow-hidden md:hidden"
            style={{ backgroundColor: T.bg }}
            role="dialog"
            aria-modal="true"
            aria-label="Expanded post text editor"
          >
            <div
              className="relative z-10 flex h-[58px] shrink-0 items-center justify-between border-b px-4"
              style={{ backgroundColor: "rgba(248,247,244,0.98)", borderColor: T.borderSoft }}
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
              style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: T.borderSoft }}
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
              className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {!longEditorText ? (
                <div
                  className="pointer-events-none absolute left-5 right-5 top-5 text-[28px] font-extrabold leading-tight tracking-[-0.03em]"
                  style={{ color: "#707783" }}
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
                onFocus={syncLongEditorFormats}
                onKeyUp={syncLongEditorFormats}
                onMouseUp={syncLongEditorFormats}
                onPaste={handleLongEditorPaste}
                className="min-h-full w-full bg-transparent text-[22px] leading-9 tracking-[-0.02em] outline-none [&_blockquote]:my-3 [&_blockquote]:rounded-[18px] [&_blockquote]:border-0 [&_blockquote]:bg-[#DDE8F3] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:font-normal [&_blockquote]:text-[#102033] [&_div]:min-h-[1.65em] [&_div]:whitespace-pre-wrap [&_em]:italic [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:min-h-[1.65em] [&_p]:whitespace-pre-wrap [&_strong]:font-extrabold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1"
                style={{ color: T.text, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              />
            </div>
          </div>
        ) : null}

        <style jsx global>{`
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
