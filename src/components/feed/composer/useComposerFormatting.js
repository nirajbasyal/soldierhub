"use client";

import { useCallback, useState } from "react";

export function hasStructuredContent(editor) {
  if (!editor) return false;
  if (typeof editor.hasStructuredContent === "function") return editor.hasStructuredContent();
  return Boolean(editor?.querySelector?.("ul, ol, li"));
}

export function safeRequestAnimationFrame(callback) {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    callback?.();
    return;
  }

  window.requestAnimationFrame(callback);
}

export function ensureQuoteExitSpace() {
  // Quote formatting has been removed from the composer.
}

export function placeCaretInElement(element) {
  if (typeof window === "undefined" || !element) return;

  if (typeof element.focus === "function") {
    element.focus({ preventScroll: true });
  }

  if (!element.nodeType) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);

  const selection = window.getSelection?.();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function placeCursorAtEnd(element) {
  if (typeof window === "undefined" || !element) return;

  if (typeof element.focusEnd === "function") {
    element.focusEnd();
    return;
  }

  element.focus?.({ preventScroll: true });
  placeCaretInElement(element);
}

function normalizeFormats(nextFormats) {
  return {
    bold: Boolean(nextFormats?.bold),
    italic: Boolean(nextFormats?.italic),
    bullet: Boolean(nextFormats?.bullet),
    number: Boolean(nextFormats?.number),
  };
}

function readAdapterFormats(editor) {
  if (typeof editor?.getActiveFormats === "function") return normalizeFormats(editor.getActiveFormats());
  return { bold: false, italic: false, bullet: false, number: false };
}

export default function useComposerFormatting({
  editorRef,
  submittingValueRef,
  activeFormatsRef,
  setStructured,
  syncEditorState,
}) {
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    bullet: false,
    number: false,
  });

  const setControlledFormats = useCallback(
    (nextFormats) => {
      const normalized = normalizeFormats(nextFormats);
      if (activeFormatsRef) activeFormatsRef.current = normalized;
      setActiveFormats(normalized);
      return normalized;
    },
    [activeFormatsRef]
  );

  const clearBlockFormats = useCallback(() => {
    const editor = editorRef.current;
    editor?.clearList?.();

    const nextFormats = {
      ...(activeFormatsRef?.current || activeFormats),
      bullet: false,
      number: false,
    };

    setControlledFormats(nextFormats);
    return nextFormats;
  }, [activeFormats, activeFormatsRef, editorRef, setControlledFormats]);

  const syncFormatState = useCallback(() => {
    const editor = editorRef.current;
    setStructured(hasStructuredContent(editor));
    setControlledFormats(readAdapterFormats(editor));
  }, [editorRef, setControlledFormats, setStructured]);

  const applyFormatting = useCallback(
    (action) => {
      if (submittingValueRef.current) return;
      const editor = editorRef.current;
      if (!editor) return;

      // Do not call focus before running the command. Focusing first can collapse
      // the selected text range on mobile/desktop, which makes partial-word
      // formatting feel broken. The TipTap adapter focuses inside runCommand
      // while preserving the current selection.
      editor.runCommand?.(action.command);

      safeRequestAnimationFrame(() => {
        setControlledFormats(readAdapterFormats(editor));
        setStructured(hasStructuredContent(editor));
        syncEditorState();
      });
    },
    [editorRef, setControlledFormats, setStructured, submittingValueRef, syncEditorState]
  );

  const handleEditorBeforeInput = useCallback(() => {
    // TipTap owns typing and paste behavior.
  }, []);

  const handleEditorKeyDown = useCallback(
    (event) => {
      if (submittingValueRef.current) return;

      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const key = event.key.toLowerCase();

        if (key === "b") {
          event.preventDefault();
          applyFormatting({ command: "bold" });
        }

        if (key === "i") {
          event.preventDefault();
          applyFormatting({ command: "italic" });
        }
      }
    },
    [applyFormatting, submittingValueRef]
  );

  const handleEditorPointerDown = useCallback(() => {
    safeRequestAnimationFrame(syncFormatState);
  }, [syncFormatState]);

  return {
    activeFormats,
    setActiveFormats: setControlledFormats,
    clearBlockFormats,
    syncFormatState,
    applyFormatting,
    handleEditorBeforeInput,
    handleEditorKeyDown,
    handleEditorPointerDown,
  };
}
