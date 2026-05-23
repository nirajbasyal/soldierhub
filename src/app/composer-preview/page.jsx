"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Bold, Italic, List, ListOrdered, Quote } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/composer/PostComposer";

const COMPOSER_EDITOR_SELECTOR =
  'div[contenteditable="true"][aria-label="Write your SoldierHub post"]';
const LONG_EDITOR_TRIGGER_ROWS = 6;
const LONG_EDITOR_TRIGGER_HEIGHT = 232;
const LONG_EDITOR_BACKGROUND = "#F8FAFD";

const EXPANDED_FORMAT_ACTIONS = [
  { key: "bold", label: "Bold", icon: Bold, command: "bold" },
  { key: "italic", label: "Italic", icon: Italic, command: "italic" },
  { key: "bullet", label: "Bullets", icon: List, command: "insertUnorderedList" },
  { key: "number", label: "Numbered", icon: ListOrdered, command: "insertOrderedList" },
  { key: "quote", label: "Quote", icon: Quote, command: "formatBlock" },
];

function isPhoneWidth() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(max-width: 640px)")?.matches ?? window.innerWidth <= 640;
}

function getEditorText(editor) {
  return (editor?.innerText || "").replace(/\u200B/g, "").replace(/\u00a0/g, " ").trim();
}

function getEditorRows(editor) {
  const rawText = (editor?.innerText || "").replace(/\u200B/g, "").replace(/\u00a0/g, " ");
  return rawText.split(/\n/).reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 34)), 0);
}

function shouldOpenLongEditor(editor) {
  if (!editor || !isPhoneWidth()) return false;
  if (!getEditorText(editor)) return false;

  if (getEditorRows(editor) > LONG_EDITOR_TRIGGER_ROWS) return true;
  if (editor.scrollHeight > editor.clientHeight + 18) return true;

  const height = editor.getBoundingClientRect?.().height || 0;
  return height >= LONG_EDITOR_TRIGGER_HEIGHT && editor.scrollHeight >= LONG_EDITOR_TRIGGER_HEIGHT;
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

function dispatchComposerInput(editor) {
  if (!editor || typeof window === "undefined") return;

  const inputEvent =
    typeof InputEvent === "function"
      ? new InputEvent("input", { bubbles: true, inputType: "insertText" })
      : new Event("input", { bubbles: true });

  editor.dispatchEvent(inputEvent);
  editor.dispatchEvent(new Event("keyup", { bubbles: true }));
}

function selectionInsideTag(editor, selector) {
  if (typeof window === "undefined" || !editor) return false;
  const selection = window.getSelection?.();
  const anchorNode = selection?.anchorNode;
  if (!anchorNode || !editor.contains(anchorNode)) return false;
  const element = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
  return Boolean(element?.closest?.(selector));
}

export default function ComposerPreviewPage() {
  const router = useRouter();
  const [longEditorOpen, setLongEditorOpen] = useState(false);
  const [longEditorText, setLongEditorText] = useState("");
  const [longEditorViewport, setLongEditorViewport] = useState({ height: null, top: 0 });
  const expandedEditorRef = useRef(null);
  const sourceEditorRef = useRef(null);
  const sourceHtmlRef = useRef("");
  const suppressLongEditorUntilRef = useRef(0);

  const getViewportSnapshot = () => {
    const viewport = window.visualViewport;
    return {
      height: Math.max(320, Math.floor(viewport?.height || window.innerHeight || 0)),
      top: Math.max(0, Math.floor(viewport?.offsetTop || 0)),
    };
  };

  const openLongEditor = (editor) => {
    if (!editor || longEditorOpen) return;

    const viewport = getViewportSnapshot();
    sourceEditorRef.current = editor;
    sourceHtmlRef.current = editor.innerHTML || "";
    setLongEditorText(getEditorText(editor));
    setLongEditorViewport(viewport);
    setLongEditorOpen(true);

    window.requestAnimationFrame?.(() => {
      if (!expandedEditorRef.current) return;
      expandedEditorRef.current.innerHTML = sourceHtmlRef.current || "";
      placeCursorAtEnd(expandedEditorRef.current);
    });
  };

  const closeLongEditor = ({ focusSmallEditor = false } = {}) => {
    const expandedEditor = expandedEditorRef.current;
    const sourceEditor = sourceEditorRef.current || document.querySelector(COMPOSER_EDITOR_SELECTOR);
    const nextHtml = expandedEditor?.innerHTML || sourceHtmlRef.current || "";

    if (sourceEditor) {
      sourceEditor.innerHTML = nextHtml;
      dispatchComposerInput(sourceEditor);
      if (focusSmallEditor) {
        window.requestAnimationFrame?.(() => placeCursorAtEnd(sourceEditor));
      } else {
        sourceEditor.blur?.();
      }
    }

    suppressLongEditorUntilRef.current = Date.now() + 750;
    setLongEditorOpen(false);
    setLongEditorText("");
  };

  const applyExpandedFormatting = (action) => {
    const editor = expandedEditorRef.current;
    if (!editor || typeof document === "undefined") return;

    editor.focus({ preventScroll: true });

    try {
      if (action.command === "formatBlock") {
        const isQuoteActive = selectionInsideTag(editor, "blockquote");
        document.execCommand("formatBlock", false, isQuoteActive ? "p" : "blockquote");
      } else {
        document.execCommand(action.command, false, null);
      }
    } catch {
      // Keep typing available if a browser blocks an older execCommand call.
    }

    window.requestAnimationFrame?.(() => {
      setLongEditorText(getEditorText(editor));
      placeCursorAtEnd(editor);
    });
  };

  useEffect(() => {
    const maybeOpenLongEditor = (event) => {
      if (longEditorOpen || Date.now() < suppressLongEditorUntilRef.current) return;
      const target = event?.target;
      if (!(target instanceof Element)) return;

      const editor = target.closest(COMPOSER_EDITOR_SELECTOR);
      if (shouldOpenLongEditor(editor)) openLongEditor(editor);
    };

    document.addEventListener("input", maybeOpenLongEditor, true);
    return () => document.removeEventListener("input", maybeOpenLongEditor, true);
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

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [longEditorOpen]);

  useEffect(() => {
    if (!longEditorOpen) return undefined;

    const updateViewport = () => setLongEditorViewport(getViewportSnapshot());
    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
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
            className="fixed left-0 right-0 z-[140] flex max-h-[100dvh] flex-col overflow-hidden overscroll-contain md:hidden"
            style={{
              backgroundColor: LONG_EDITOR_BACKGROUND,
              height: longEditorViewport.height ? `${longEditorViewport.height}px` : "100dvh",
              top: `${longEditorViewport.top || 0}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Expanded post text editor"
          >
            <div
              className="relative z-10 flex h-[58px] shrink-0 items-center justify-between border-b px-4"
              style={{ backgroundColor: "rgba(248,250,253,0.98)", borderColor: T.borderSoft }}
            >
              <div className="w-16" />
              <div className="text-[21px] font-extrabold tracking-[-0.03em]" style={{ color: T.text }}>
                Add text
              </div>
              <button
                type="button"
                onClick={() => closeLongEditor()}
                className="sh-tap w-16 rounded-full px-2 py-2 text-right text-[17px] font-bold active:scale-[0.98]"
                style={{ color: T.navy }}
              >
                Done
              </button>
            </div>

            <div
              className="sticky top-[58px] z-20 shrink-0 border-b px-3 py-2"
              style={{ backgroundColor: "rgba(248,250,253,0.98)", borderColor: T.borderSoft }}
            >
              <div className="grid grid-cols-5 items-center gap-2">
                {EXPANDED_FORMAT_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyExpandedFormatting(action)}
                      className="sh-tap flex h-10 w-full items-center justify-center rounded-full border transition active:scale-[0.97]"
                      style={{ backgroundColor: "#FFFFFF", borderColor: T.border, color: T.navy }}
                      aria-label={action.label}
                      title={action.label}
                    >
                      <Icon size={18} strokeWidth={2.65} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3"
              style={{
                backgroundColor: LONG_EDITOR_BACKGROUND,
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
                onInput={() => setLongEditorText(getEditorText(expandedEditorRef.current))}
                onPaste={(event) => {
                  event.preventDefault();
                  const text = event.clipboardData?.getData("text/plain") || "";
                  try {
                    document.execCommand("insertText", false, text);
                  } catch {
                    if (expandedEditorRef.current) {
                      expandedEditorRef.current.textContent = `${expandedEditorRef.current.textContent || ""}${text}`;
                    }
                  }
                  window.requestAnimationFrame?.(() => setLongEditorText(getEditorText(expandedEditorRef.current)));
                }}
                className="min-h-full w-full bg-transparent pr-10 text-[18px] leading-8 outline-none [&_blockquote]:my-3 [&_blockquote]:rounded-[18px] [&_blockquote]:border-0 [&_blockquote]:bg-[#DDE8F3] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:font-normal [&_blockquote]:text-[#102033] [&_div]:min-h-[1.65em] [&_div]:whitespace-pre-wrap [&_em]:italic [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:min-h-[1.65em] [&_p]:whitespace-pre-wrap [&_strong]:font-extrabold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1"
                style={{ color: T.text, whiteSpace: "pre-wrap", overflowWrap: "anywhere", paddingBottom: "28px" }}
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
            12%,
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
