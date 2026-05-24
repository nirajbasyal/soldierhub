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
  // Quote formatting has been removed from the composer.
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

function normalizeFormats(nextFormats) {
  return {
    bold: Boolean(nextFormats?.bold),
    italic: Boolean(nextFormats?.italic),
    bullet: Boolean(nextFormats?.bullet),
    number: Boolean(nextFormats?.number),
  };
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
    // Keep this lightweight. This function is called during typing through the
    // composer sync path; updating toolbar state on every keystroke caused
    // contentEditable typing regressions on some browsers.
    const editor = editorRef.current;
    setStructured(hasStructuredContent(editor));
  }, [editorRef, setStructured]);

  const applyFormatting = useCallback(
    (action) => {
      if (submittingValueRef.current) return;
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus({ preventScroll: true });

      const current = normalizeFormats(activeFormatsRef?.current || activeFormats);
      let nextFormats = { ...current };

      if (action.command === "bold") {
        runEditorCommand("bold");
        nextFormats.bold = !current.bold;
      }

      if (action.command === "italic") {
        runEditorCommand("italic");
        nextFormats.italic = !current.italic;
      }

      if (action.command === "insertUnorderedList") {
        if (current.number || readCommandState("insertOrderedList")) runEditorCommand("insertOrderedList");
        runEditorCommand("insertUnorderedList");
        nextFormats = { ...nextFormats, bullet: !current.bullet, number: false };
      }

      if (action.command === "insertOrderedList") {
        if (current.bullet || readCommandState("insertUnorderedList")) runEditorCommand("insertUnorderedList");
        runEditorCommand("insertOrderedList");
        nextFormats = { ...nextFormats, number: !current.number, bullet: false };
      }

      setControlledFormats(nextFormats);

      safeRequestAnimationFrame(() => {
        setStructured(hasStructuredContent(editor));
        syncEditorState();
      });
    },
    [activeFormats, activeFormatsRef, editorRef, setControlledFormats, setStructured, submittingValueRef, syncEditorState]
  );

  const handleEditorBeforeInput = useCallback(() => {
    // Do not run execCommand during beforeinput. The browser must own typing.
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
    // Keep pointer interaction passive so clicking/tapping inside the editor
    // never blocks text input or selection.
  }, []);

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
