"use client";

import { useCallback, useRef, useState } from "react";

const FORMAT_BOUNDARY = "\u200B";

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

export function hasStructuredContent(editor) {
  return Boolean(editor?.querySelector?.("blockquote, ul, ol, li"));
}

export function safeRequestAnimationFrame(callback) {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    callback?.();
    return;
  }

  window.requestAnimationFrame(callback);
}

function createEmptyParagraph() {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";
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

export function ensureQuoteExitSpace(editor) {
  if (!editor || typeof document === "undefined") return;

  Array.from(editor.querySelectorAll("blockquote")).forEach((quote) => {
    if (!quote.nextElementSibling) {
      quote.parentNode?.insertBefore(createEmptyParagraph(), quote.nextSibling);
    }
  });
}

export function placeCaretInElement(element) {
  if (typeof window === "undefined" || !element) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);

  const selection = window.getSelection?.();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function placeCursorAtEnd(element) {
  if (typeof window === "undefined" || !element) return;

  element.focus({ preventScroll: true });
  placeCaretInElement(element);
}

export default function useComposerFormatting({
  editorRef,
  submittingValueRef,
  activeFormatsRef,
  setStructured,
  syncEditorState,
}) {
  const [activeFormats, setActiveFormats] = useState({});
  const lastQuoteEnterAtRef = useRef(0);

  const clearBlockFormats = useCallback(() => {
    setActiveFormats((current) => ({ ...current, bullet: false, number: false, quote: false }));
  }, []);

  const syncFormatState = useCallback(() => {
    const editor = editorRef.current;
    ensureQuoteExitSpace(editor);
    setStructured(hasStructuredContent(editor));

    if (!editor || typeof document === "undefined") return;

    const nextFormats = {
      bold: queryCommandIsActive("bold") || selectionInsideTag(editor, "strong,b"),
      italic: queryCommandIsActive("italic") || selectionInsideTag(editor, "em,i"),
      bullet: queryCommandIsActive("insertUnorderedList") || selectionInsideTag(editor, "ul"),
      number: queryCommandIsActive("insertOrderedList") || selectionInsideTag(editor, "ol"),
      quote: selectionInsideTag(editor, "blockquote"),
    };

    if (activeFormatsRef) activeFormatsRef.current = nextFormats;
    setActiveFormats(nextFormats);
  }, [activeFormatsRef, editorRef, setStructured]);

  const exitEmptyQuote = useCallback(
    (quote) => {
      const editor = editorRef.current;
      if (!editor || !quote) return false;

      const paragraph = createEmptyParagraph();
      const nextElement = quote.nextElementSibling;

      quote.parentNode?.insertBefore(paragraph, quote);
      quote.remove();

      if (isEmptyEditableBlock(nextElement)) {
        nextElement.remove();
      }

      editor.focus({ preventScroll: true });
      placeCaretInElement(paragraph);
      clearBlockFormats();
      safeRequestAnimationFrame(syncEditorState);
      return true;
    },
    [clearBlockFormats, editorRef, syncEditorState]
  );

  const exitEmptyListItem = useCallback(
    (listItem) => {
      const editor = editorRef.current;
      const list = listItem?.closest?.("ul,ol");
      if (!editor || !listItem || !list) return false;

      const paragraph = createEmptyParagraph();
      const listHasOneItem = list.querySelectorAll(":scope > li").length <= 1;

      if (listHasOneItem) {
        list.parentNode?.insertBefore(paragraph, list);
        list.remove();
      } else {
        list.parentNode?.insertBefore(paragraph, list.nextSibling);
        listItem.remove();
      }

      editor.focus({ preventScroll: true });
      placeCaretInElement(paragraph);
      clearBlockFormats();
      safeRequestAnimationFrame(syncEditorState);
      return true;
    },
    [clearBlockFormats, editorRef, syncEditorState]
  );

  const exitEmptyStructureIfNeeded = useCallback(
    (event) => {
      const editor = editorRef.current;
      if (!editor) return false;

      const quote = getCurrentQuote(editor);
      if (quote && isElementContentEmpty(quote)) {
        event.preventDefault();
        return exitEmptyQuote(quote);
      }

      const listItem = getCurrentListItem(editor);
      if (listItem && isElementContentEmpty(listItem)) {
        event.preventDefault();
        return exitEmptyListItem(listItem);
      }

      return false;
    },
    [editorRef, exitEmptyListItem, exitEmptyQuote]
  );

  const applyFormatting = useCallback(
    (action) => {
      if (submittingValueRef.current) return;
      const editor = editorRef.current;
      if (!editor || typeof document === "undefined") return;

      editor.focus({ preventScroll: true });

      try {
        if (action.command === "formatBlock") {
          const isQuoteActive =
            Boolean(activeFormatsRef?.current?.quote) || selectionInsideTag(editor, "blockquote");
          document.execCommand("formatBlock", false, isQuoteActive ? "p" : "blockquote");
          safeRequestAnimationFrame(() => ensureQuoteExitSpace(editor));
        } else {
          document.execCommand(action.command, false, null);
        }
      } catch {
        // Keep the composer usable even if a browser blocks an older execCommand call.
      }

      safeRequestAnimationFrame(syncEditorState);
    },
    [activeFormatsRef, editorRef, submittingValueRef, syncEditorState]
  );

  const insertQuoteLineBreak = useCallback(
    (event) => {
      const editor = editorRef.current;
      if (!editor || !selectionInsideTag(editor, "blockquote")) return false;

      event?.preventDefault?.();

      const now =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();

      // Prevent duplicate Enter handling from beforeinput + keydown firing together.
      if (now - lastQuoteEnterAtRef.current < 180) return true;
      lastQuoteEnterAtRef.current = now;

      try {
        document.execCommand("insertLineBreak", false, null);
      } catch {
        document.execCommand("insertHTML", false, "<br>");
      }
      setActiveFormats((current) => ({ ...current, quote: true }));
      safeRequestAnimationFrame(syncEditorState);
      return true;
    },
    [editorRef, syncEditorState]
  );

  const handleEditorBeforeInput = useCallback(
    (event) => {
      if (submittingValueRef.current) return;

      if (event.nativeEvent?.inputType === "deleteContentBackward") {
        exitEmptyStructureIfNeeded(event);
        return;
      }

      if (event.nativeEvent?.inputType === "insertParagraph") {
        insertQuoteLineBreak(event);
      }
    },
    [exitEmptyStructureIfNeeded, insertQuoteLineBreak, submittingValueRef]
  );

  const handleEditorKeyDown = useCallback(
    (event) => {
      if (event.key === "Backspace" && exitEmptyStructureIfNeeded(event)) return;
      if (event.key === "Enter") insertQuoteLineBreak(event);
    },
    [exitEmptyStructureIfNeeded, insertQuoteLineBreak]
  );

  const handleEditorPointerDown = useCallback(
    (event) => {
      const editor = editorRef.current;
      if (!editor || submittingValueRef.current) return;

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
        clearBlockFormats();
        return;
      }

      const quoteToExit = Array.from(editor.querySelectorAll("blockquote")).find((quote) => {
        const quoteRect = quote.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        return (
          event.clientY >= quoteRect.bottom &&
          event.clientY <= Math.max(quoteRect.bottom + 80, editorRect.bottom) &&
          event.clientX >= editorRect.left - 18 &&
          event.clientX <= editorRect.right + 18
        );
      });

      if (!quoteToExit) return;

      ensureQuoteExitSpace(editor);
      const exitBlock = quoteToExit.nextElementSibling;
      if (!isEmptyEditableBlock(exitBlock)) return;

      event.preventDefault();
      editor.focus({ preventScroll: true });
      placeCaretInElement(exitBlock);
      clearBlockFormats();
      safeRequestAnimationFrame(syncEditorState);
    },
    [clearBlockFormats, editorRef, submittingValueRef, syncEditorState]
  );

  return {
    activeFormats,
    setActiveFormats,
    clearBlockFormats,
    syncFormatState,
    applyFormatting,
    handleEditorBeforeInput,
    handleEditorKeyDown,
    handleEditorPointerDown,
  };
}
