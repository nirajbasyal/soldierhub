"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bold,
  Check,
  Edit3,
  Italic,
  List,
  ListOrdered,
  Quote,
  X,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const FORMAT_BOUNDARY = "\u200B";

const FORMAT_ACTIONS = [
  { key: "bold", command: "bold", label: "Bold", shortLabel: "B", icon: Bold },
  { key: "italic", command: "italic", label: "Italic", shortLabel: "I", icon: Italic },
  { key: "bullet", command: "insertUnorderedList", label: "Bullet list", shortLabel: "• List", icon: List },
  { key: "number", command: "insertOrderedList", label: "Numbered list", shortLabel: "1. List", icon: ListOrdered },
  { key: "quote", command: "formatBlock", label: "Quote", shortLabel: "Quote", icon: Quote },
];

const ALLOWED_EDITOR_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "DIV",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "UL",
]);

function sanitizeEditorHtml(html = "") {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return String(html || "").replaceAll(FORMAT_BOUNDARY, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
  const sourceRoot = doc.body.firstElementChild;
  const outputDoc = document.implementation.createHTMLDocument("soldierhub-edit-post");
  const outputRoot = outputDoc.createElement("div");

  const cleanNode = (node, parent) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(outputDoc.createTextNode((node.textContent || "").replaceAll(FORMAT_BOUNDARY, "")));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName?.toUpperCase();

    if (!ALLOWED_EDITOR_TAGS.has(tagName)) {
      Array.from(node.childNodes).forEach((child) => cleanNode(child, parent));
      return;
    }

    if (tagName === "A") {
      const rawHref = node.getAttribute("href") || node.textContent || "";
      try {
        const href = /^https?:\/\//i.test(rawHref) ? rawHref : `https://${rawHref}`;
        const parsed = new URL(href);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          Array.from(node.childNodes).forEach((child) => cleanNode(child, parent));
          return;
        }

        const link = outputDoc.createElement("a");
        link.setAttribute("href", parsed.href);
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer nofollow");
        link.appendChild(outputDoc.createTextNode(node.textContent || parsed.hostname));
        parent.appendChild(link);
        return;
      } catch {
        Array.from(node.childNodes).forEach((child) => cleanNode(child, parent));
        return;
      }
    }

    const normalizedTag = tagName === "B" ? "strong" : tagName === "I" ? "em" : tagName.toLowerCase();
    const nextElement = outputDoc.createElement(normalizedTag);
    Array.from(node.childNodes).forEach((child) => cleanNode(child, nextElement));
    parent.appendChild(nextElement);
  };

  Array.from(sourceRoot?.childNodes || []).forEach((child) => cleanNode(child, outputRoot));

  return outputRoot.innerHTML
    .replaceAll(FORMAT_BOUNDARY, "")
    .replace(/<div><br><\/div>/gi, "")
    .replace(/<p><br><\/p>/gi, "")
    .trim();
}

function getPlainEditorText(editor) {
  return (editor?.innerText || "").replaceAll(FORMAT_BOUNDARY, "").replace(/\u00a0/g, " ").trim();
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

function placeCaretInElement(element, atEnd = false) {
  if (typeof window === "undefined" || !element) return;

  const selection = window.getSelection?.();
  const range = document.createRange();

  range.selectNodeContents(element);
  range.collapse(!atEnd);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function createEmptyParagraph() {
  const paragraph = document.createElement("p");
  paragraph.appendChild(document.createElement("br"));
  return paragraph;
}

function isElementContentEmpty(element) {
  if (!element) return false;
  return !element.textContent?.replaceAll(FORMAT_BOUNDARY, "").replace(/\u00a0/g, " ").trim();
}

function isEmptyEditableBlock(element) {
  if (!element) return false;

  const tagName = element.tagName?.toLowerCase();
  if (!["p", "div"].includes(tagName)) return false;

  return isElementContentEmpty(element);
}

function getCurrentQuote(editor) {
  const startElement = getSelectionElement(editor);
  const quote = startElement?.closest?.("blockquote");
  return quote && editor?.contains(quote) ? quote : null;
}

function getCurrentListItem(editor) {
  const startElement = getSelectionElement(editor);
  const listItem = startElement?.closest?.("li");
  return listItem && editor?.contains(listItem) ? listItem : null;
}

function ensureQuoteExitSpace(editor) {
  if (!editor || typeof document === "undefined") return;

  Array.from(editor.querySelectorAll("blockquote")).forEach((quote) => {
    if (!quote.nextElementSibling) {
      quote.parentNode?.insertBefore(createEmptyParagraph(), quote.nextSibling);
    }
  });
}

function hasStructuredContent(editor) {
  return Boolean(editor?.querySelector?.("blockquote, ul, ol, li"));
}

function insertSingleLineBreakAtCursor(editor) {
  if (!editor || typeof window === "undefined" || typeof document === "undefined") return false;

  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return false;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  range.deleteContents();

  const lineBreak = document.createElement("br");
  const marker = document.createTextNode(FORMAT_BOUNDARY);

  range.insertNode(lineBreak);
  range.setStartAfter(lineBreak);
  range.collapse(true);
  range.insertNode(marker);
  range.setStartAfter(marker);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function escapePlainTextToHtml(text = "") {
  if (typeof document === "undefined") return String(text || "");
  const wrapper = document.createElement("div");
  String(text || "")
    .split("\n")
    .forEach((line, index) => {
      if (index > 0) wrapper.appendChild(document.createElement("br"));
      wrapper.appendChild(document.createTextNode(line));
    });
  return wrapper.innerHTML;
}

function looksLikeHtml(text = "") {
  return /<\/?(a|p|div|strong|em|ul|ol|li|blockquote|br|b|i)\b/i.test(String(text || ""));
}

export default function EditPostModal({ post, onClose, onSave }) {
  const [category, setCategory] = useState(post.category);
  const [body, setBody] = useState(post.body || "");
  const [plainText, setPlainText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});
  const [structured, setStructured] = useState(false);

  const editorRef = useRef(null);
  const bodyRef = useRef(post.body || "");
  const plainTextRef = useRef("");
  const lastQuoteEnterAtRef = useRef(0);

  const canSave = useMemo(() => plainText.trim().length > 0, [plainText]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const startingHtml = looksLikeHtml(post.body)
      ? sanitizeEditorHtml(post.body || "")
      : escapePlainTextToHtml(post.body || "");

    editor.innerHTML = startingHtml;
    syncEditorState();
    window.requestAnimationFrame(() => editor.focus({ preventScroll: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  const syncFormatState = () => {
    const editor = editorRef.current;
    ensureQuoteExitSpace(editor);
    setStructured(hasStructuredContent(editor));

    if (!editor || typeof document === "undefined") return;

    setActiveFormats({
      bold: queryCommandIsActive("bold") || selectionInsideTag(editor, "strong,b"),
      italic: queryCommandIsActive("italic") || selectionInsideTag(editor, "em,i"),
      bullet: queryCommandIsActive("insertUnorderedList") || selectionInsideTag(editor, "ul"),
      number: queryCommandIsActive("insertOrderedList") || selectionInsideTag(editor, "ol"),
      quote: selectionInsideTag(editor, "blockquote"),
    });
  };

  const syncEditorState = () => {
    const editor = editorRef.current;
    ensureQuoteExitSpace(editor);
    const cleanHtml = sanitizeEditorHtml(editor?.innerHTML || "");
    const cleanText = getPlainEditorText(editor);

    bodyRef.current = cleanHtml;
    plainTextRef.current = cleanText;
    setBody(cleanHtml);
    setPlainText(cleanText);
    setStructured(hasStructuredContent(editor));
    setError("");
    window.requestAnimationFrame(syncFormatState);
  };

  const applyFormatting = (action) => {
    if (submitting) return;
    const editor = editorRef.current;
    if (!editor || typeof document === "undefined") return;

    editor.focus({ preventScroll: true });

    if (action.command === "formatBlock") {
      const isQuoteActive = selectionInsideTag(editor, "blockquote");

      if (isQuoteActive) {
        const quote = getCurrentQuote(editor);
        const paragraph = createEmptyParagraph();
        quote?.parentNode?.insertBefore(paragraph, quote.nextSibling);
        placeCaretInElement(paragraph);
      } else {
        document.execCommand("formatBlock", false, "blockquote");
        window.requestAnimationFrame(() => ensureQuoteExitSpace(editor));
      }
    } else {
      document.execCommand(action.command, false, null);
    }

    window.requestAnimationFrame(syncEditorState);
  };

  const exitEmptyStructureIfNeeded = (event) => {
    const editor = editorRef.current;
    if (!editor) return false;

    const quote = getCurrentQuote(editor);
    if (quote && isElementContentEmpty(quote)) {
      event.preventDefault();
      const paragraph = createEmptyParagraph();
      quote.parentNode?.insertBefore(paragraph, quote);
      quote.remove();
      placeCaretInElement(paragraph);
      window.requestAnimationFrame(syncEditorState);
      return true;
    }

    const listItem = getCurrentListItem(editor);
    const list = listItem?.closest?.("ul,ol");
    if (listItem && list && isElementContentEmpty(listItem)) {
      event.preventDefault();
      const paragraph = createEmptyParagraph();
      const listHasOneItem = list.querySelectorAll(":scope > li").length <= 1;

      if (listHasOneItem) {
        list.parentNode?.insertBefore(paragraph, list);
        list.remove();
      } else {
        list.parentNode?.insertBefore(paragraph, list.nextSibling);
        listItem.remove();
      }

      placeCaretInElement(paragraph);
      window.requestAnimationFrame(syncEditorState);
      return true;
    }

    return false;
  };

  const handleBeforeInput = (event) => {
    if (submitting) return;

    const inputType = event.nativeEvent?.inputType;
    if (inputType === "deleteContentBackward") {
      exitEmptyStructureIfNeeded(event);
      return;
    }

    if (inputType === "insertParagraph" && selectionInsideTag(editorRef.current, "blockquote")) {
      event.preventDefault();
      insertQuoteLineBreak();
    }
  };

  const insertQuoteLineBreak = () => {
    const editor = editorRef.current;
    if (!editor || !selectionInsideTag(editor, "blockquote")) return false;

    const now =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();

    if (now - lastQuoteEnterAtRef.current < 120) return true;
    lastQuoteEnterAtRef.current = now;

    if (!insertSingleLineBreakAtCursor(editor)) {
      document.execCommand("insertHTML", false, "<br>");
    }

    window.requestAnimationFrame(syncEditorState);
    return true;
  };

  const handleKeyDown = (event) => {
    if (event.key === "Backspace" && exitEmptyStructureIfNeeded(event)) return;

    if (event.key === "Enter" && selectionInsideTag(editorRef.current, "blockquote")) {
      event.preventDefault();
      insertQuoteLineBreak();
    }
  };

  const handleEditorPointerDown = (event) => {
    const editor = editorRef.current;
    if (!editor || submitting) return;

    const clickedElement = event.target instanceof Element ? event.target : null;
    const clickedInsideQuote = clickedElement?.closest?.("blockquote");
    if (clickedInsideQuote && editor.contains(clickedInsideQuote)) return;

    const clickedEditableBlock = clickedElement?.closest?.("p,div");
    if (
      clickedEditableBlock &&
      editor.contains(clickedEditableBlock) &&
      isEmptyEditableBlock(clickedEditableBlock) &&
      clickedEditableBlock.previousElementSibling?.tagName?.toLowerCase() === "blockquote"
    ) {
      setActiveFormats((current) => ({ ...current, bullet: false, number: false, quote: false }));
      return;
    }

    const quoteToExit = Array.from(editor.querySelectorAll("blockquote")).find((quote) => {
      const rect = quote.getBoundingClientRect();
      return (
        event.clientY >= rect.bottom &&
        event.clientY <= rect.bottom + 52 &&
        event.clientX >= rect.left - 14 &&
        event.clientX <= rect.right + 14
      );
    });

    if (!quoteToExit) return;

    ensureQuoteExitSpace(editor);
    const exitBlock = quoteToExit.nextElementSibling;
    if (!isEmptyEditableBlock(exitBlock)) return;

    event.preventDefault();
    editor.focus({ preventScroll: true });
    placeCaretInElement(exitBlock);
    setActiveFormats((current) => ({ ...current, bullet: false, number: false, quote: false }));
    window.requestAnimationFrame(syncEditorState);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    document.execCommand("insertText", false, text);
    window.requestAnimationFrame(syncEditorState);
  };

  const submit = async () => {
    setError("");
    syncEditorState();

    const cleanedBody = sanitizeEditorHtml(bodyRef.current).trim();
    const cleanedPlainText = plainTextRef.current.trim();

    if (!cleanedPlainText) {
      setError("Post body is required.");
      editorRef.current?.focus({ preventScroll: true });
      return;
    }

    const m = await moderateAsync(cleanedPlainText);

    if (!m.allowed) {
      setError(m.reason);
      editorRef.current?.focus({ preventScroll: true });
      return;
    }

    setSubmitting(true);

    const result = await onSave({
      body: cleanedBody || cleanedPlainText,
      category,
    });

    setSubmitting(false);

    if (result?.ok === false) {
      setError(result.error || "Could not save changes.");
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth={680}>
      <div className="relative overflow-hidden rounded-[28px]" style={{ backgroundColor: T.card }}>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close edit post"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft, color: T.textSubtle }}
        >
          <X size={16} strokeWidth={2.7} />
        </button>

        <div className="p-4 md:p-6">
          <div
            className="mb-4 rounded-[26px] border p-4 pr-12"
            style={{
              background: "linear-gradient(135deg, rgba(238,243,247,0.98), rgba(253,254,255,0.98))",
              borderColor: T.borderSoft,
            }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em]"
              style={{ backgroundColor: "#FFFFFF", borderColor: T.borderSoft, color: T.navy }}
            >
              <Edit3 size={14} />
              Edit post
            </div>

            <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] md:text-3xl" style={{ color: T.navy }}>
              Update your post
            </h3>

            <p className="mt-1 text-sm leading-6" style={{ color: T.textMuted }}>
              Keep the post helpful, clean, and easy to read for the SoldierHub community.
            </p>
          </div>

          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.filter((c) => c.key !== "All").map((c) => {
              const active = c.key === category;
              const s = TONE_STYLES[c.tone];

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  disabled={submitting}
                  className="h-9 shrink-0 rounded-full border px-3 text-xs font-extrabold transition active:scale-[0.98] disabled:opacity-50"
                  style={{
                    backgroundColor: active ? s.bg : "#FFFFFF",
                    color: active ? s.text : T.textMuted,
                    borderColor: active ? s.border : T.border,
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div
            className="mb-3 flex flex-wrap items-center gap-1.5 rounded-[20px] border px-2 py-2 md:flex-nowrap md:gap-2 md:rounded-2xl md:py-1.5"
            style={{ backgroundColor: "rgba(238,243,247,0.92)", borderColor: T.borderSoft }}
            aria-label="Edit post formatting toolbar"
          >
            <span
              className="hidden shrink-0 pl-1 text-[11px] font-extrabold uppercase tracking-[0.12em] md:inline"
              style={{ color: T.textSubtle }}
            >
              Format
            </span>

            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 md:flex-nowrap">
              {FORMAT_ACTIONS.map((action) => {
                const Icon = action.icon;
                const active = Boolean(activeFormats[action.key]);

                return (
                  <button
                    key={action.key}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyFormatting(action)}
                    disabled={submitting}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold transition active:scale-[0.98] disabled:opacity-50 md:h-8 md:px-2.5"
                    style={{
                      backgroundColor: active ? "rgba(63, 95, 125, 0.16)" : "#FFFFFF",
                      borderColor: active ? "rgba(63, 95, 125, 0.34)" : T.border,
                      color: active ? T.navy : T.textSubtle,
                      boxShadow: active ? "0 8px 18px rgba(11, 28, 44, 0.08)" : "none",
                    }}
                    title={action.label}
                    aria-label={action.label}
                    aria-pressed={active}
                  >
                    <Icon size={14} strokeWidth={2.4} />
                    <span>{action.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="relative rounded-[24px] border px-4 py-3"
            style={{ backgroundColor: "#FDFEFF", borderColor: T.borderSoft }}
          >
            {!plainText && !structured && (
              <div
                className="pointer-events-none absolute left-4 top-3 text-[17px] leading-8"
                style={{ color: "#A8ABB2" }}
              >
                Edit your post...
              </div>
            )}

            <div
              ref={editorRef}
              contentEditable={!submitting}
              suppressContentEditableWarning
              role="textbox"
              aria-label="Edit post body"
              aria-multiline="true"
              onFocus={() => window.requestAnimationFrame(syncFormatState)}
              onPointerDown={handleEditorPointerDown}
              onInput={syncEditorState}
              onBeforeInput={handleBeforeInput}
              onKeyDown={handleKeyDown}
              onKeyUp={syncFormatState}
              onMouseUp={syncFormatState}
              onPaste={handlePaste}
              className="min-h-[190px] max-h-[420px] w-full overflow-y-auto border-0 bg-transparent p-0 text-[17px] leading-8 shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 [&_a]:break-words [&_a]:font-semibold [&_a]:text-[#245B8F] [&_a]:underline [&_a]:decoration-[#7EA4C5] [&_a]:underline-offset-2 [&_blockquote]:mx-4 [&_blockquote]:my-3 [&_blockquote]:rounded-[18px] [&_blockquote]:border-0 [&_blockquote]:bg-[#E7F0F8] [&_blockquote]:px-6 [&_blockquote]:py-3 [&_blockquote]:font-normal [&_blockquote]:text-[#102033] [&_em]:italic [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_strong]:font-extrabold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1"
              style={{ color: T.text, border: "none", boxShadow: "none" }}
            />
          </div>

          {error && (
            <div
              className="mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs"
              style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} icon={Check} disabled={submitting || !canSave}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
