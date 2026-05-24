"use client";

import { useCallback, useState } from "react";

export function hasStructuredContent(editor) {
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
  // Legacy no-op retained for existing composer imports.
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

function runEditorCommand(command, value = null) {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;

  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
}

function readCommandState(command) {
  if (typeof document === "undefined" || typeof document.queryCommandState !== "function") return false;

  try {
    return Boolean(document.queryCommandState(command));
  } catch {
    return false;
  }
}

function readEditorFormats() {
  return {
    bold: readCommandState("bold"),
    italic: readCommandState("italic"),
    bullet: readCommandState("insertUnorderedList"),
    number: readCommandState("insertOrderedList"),
  };
}

function normalizeFormats(nextFormats) {
  return {
    bold: Boolean(nextFormats?.bold),
    italic: Boolean(nextFormats?.italic),
    bullet: Boolean(nextFormats?.bullet),
    number: Boolean(nextFormats?.number),
  };
}

function clearInlineFormatIfNeeded(command) {
  if (readCommandState(command)) runEditorCommand(command);
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

    if (editor) {
      editor.focus({ preventScroll: true });
      if (readCommandState("insertUnorderedList")) runEditorCommand("insertUnorderedList");
      if (readCommandState("insertOrderedList")) runEditorCommand("insertOrderedList");
    }

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

    if (!editor || typeof document === "undefined") {
      setControlledFormats(activeFormatsRef?.current || activeFormats);
      return;
    }

    setControlledFormats(readEditorFormats());
  }, [activeFormats, activeFormatsRef, editorRef, setControlledFormats, setStructured]);

  const applyFormatting = useCallback(
    (action) => {
      if (submittingValueRef.current) return;
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus({ preventScroll: true });

      if (action.command === "insertUnorderedList" && readCommandState("insertOrderedList")) {
        runEditorCommand("insertOrderedList");
      }

      if (action.command === "insertOrderedList" && readCommandState("insertUnorderedList")) {
        runEditorCommand("insertUnorderedList");
      }

      runEditorCommand(action.command);

      safeRequestAnimationFrame(() => {
        const nextFormats = readEditorFormats();
        setControlledFormats(nextFormats);
        setStructured(hasStructuredContent(editor));
        syncEditorState();
      });
    },
    [editorRef, setControlledFormats, setStructured, submittingValueRef, syncEditorState]
  );

  const handleEditorBeforeInput = useCallback(() => {
    // Important: do not force execCommand here. Forcing formatting before every
    // keystroke can break contentEditable typing on mobile and desktop browsers.
  }, []);

  const handleEditorKeyDown = useCallback(
    (event) => {
      if (submittingValueRef.current) return;

      const editor = editorRef.current;
      if (!editor) return;

      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const key = event.key.toLowerCase();

        if (key === "b") {
          event.preventDefault();
          applyFormatting({ command: "bold" });
          return;
        }

        if (key === "i") {
          event.preventDefault();
          applyFormatting({ command: "italic" });
          return;
        }
      }

      if (event.key === "Enter") {
        safeRequestAnimationFrame(() => {
          setStructured(hasStructuredContent(editor));
          setControlledFormats(readEditorFormats());
          syncEditorState();
        });
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key.length === 1) {
        safeRequestAnimationFrame(() => {
          setStructured(hasStructuredContent(editor));
          setControlledFormats(readEditorFormats());
          syncEditorState();
        });
      }
    },
    [applyFormatting, editorRef, setControlledFormats, setStructured, submittingValueRef, syncEditorState]
  );

  const handleEditorPointerDown = useCallback(() => {
    if (submittingValueRef.current) return;
    safeRequestAnimationFrame(syncFormatState);
  }, [submittingValueRef, syncFormatState]);

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
