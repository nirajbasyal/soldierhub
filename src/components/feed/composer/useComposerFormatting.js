"use client";

import { useCallback, useState } from "react";

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

export function ensureQuoteExitSpace() {
  // Intentionally empty.
  // Formatting is controlled only by the user's toolbar selections and editor clicks.
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

function normalizeCommandState(command, active) {
  if (typeof document === "undefined" || typeof document.queryCommandState !== "function") {
    return;
  }

  try {
    const current = Boolean(document.queryCommandState(command));
    if (current !== active) {
      document.execCommand(command, false, null);
    }
  } catch {
    // Older browser editing APIs are inconsistent. Keep composer usable.
  }
}

function normalizeBlockState(activeFormats) {
  if (typeof document === "undefined") return;

  try {
    const inBulletList = Boolean(document.queryCommandState?.("insertUnorderedList"));
    const inNumberList = Boolean(document.queryCommandState?.("insertOrderedList"));

    if (activeFormats?.bullet && !inBulletList) {
      document.execCommand("insertUnorderedList", false, null);
    } else if (!activeFormats?.bullet && inBulletList) {
      document.execCommand("insertUnorderedList", false, null);
    }

    if (activeFormats?.number && !inNumberList) {
      document.execCommand("insertOrderedList", false, null);
    } else if (!activeFormats?.number && inNumberList) {
      document.execCommand("insertOrderedList", false, null);
    }

    if (activeFormats?.quote) {
      document.execCommand("formatBlock", false, "blockquote");
    } else {
      document.execCommand("formatBlock", false, "p");
    }
  } catch {
    // Keep typing available even if browser blocks the command.
  }
}

function applyActiveTypingState(activeFormats) {
  normalizeCommandState("bold", Boolean(activeFormats?.bold));
  normalizeCommandState("italic", Boolean(activeFormats?.italic));
  normalizeBlockState(activeFormats);
}

function createPlainParagraphAfter(editor) {
  if (typeof document === "undefined" || !editor) return null;

  const paragraph = document.createElement("p");
  paragraph.appendChild(document.createElement("br"));
  editor.appendChild(paragraph);
  return paragraph;
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
    quote: false,
  });

  const setControlledFormats = useCallback(
    (nextFormats) => {
      const normalized = {
        bold: Boolean(nextFormats?.bold),
        italic: Boolean(nextFormats?.italic),
        bullet: Boolean(nextFormats?.bullet),
        number: Boolean(nextFormats?.number),
        quote: Boolean(nextFormats?.quote),
      };

      if (activeFormatsRef) activeFormatsRef.current = normalized;
      setActiveFormats(normalized);
      return normalized;
    },
    [activeFormatsRef]
  );

  const clearBlockFormats = useCallback(() => {
    const nextFormats = {
      ...(activeFormatsRef?.current || activeFormats),
      bullet: false,
      number: false,
      quote: false,
    };

    setControlledFormats(nextFormats);
    return nextFormats;
  }, [activeFormats, activeFormatsRef, setControlledFormats]);

  const syncFormatState = useCallback(() => {
    const editor = editorRef.current;
    setStructured(hasStructuredContent(editor));

    if (activeFormatsRef) {
      setActiveFormats({
        bold: Boolean(activeFormatsRef.current?.bold),
        italic: Boolean(activeFormatsRef.current?.italic),
        bullet: Boolean(activeFormatsRef.current?.bullet),
        number: Boolean(activeFormatsRef.current?.number),
        quote: Boolean(activeFormatsRef.current?.quote),
      });
    }
  }, [activeFormatsRef, editorRef, setStructured]);

  const applyFormatting = useCallback(
    (action) => {
      if (submittingValueRef.current) return;
      const editor = editorRef.current;
      if (!editor || typeof document === "undefined") return;

      editor.focus({ preventScroll: true });

      const current = activeFormatsRef?.current || activeFormats;
      const nextFormats = { ...current };

      if (action.command === "bold") {
        nextFormats.bold = !Boolean(current.bold);
      } else if (action.command === "italic") {
        nextFormats.italic = !Boolean(current.italic);
      } else if (action.command === "insertUnorderedList") {
        nextFormats.bullet = !Boolean(current.bullet);
        if (nextFormats.bullet) {
          nextFormats.number = false;
          nextFormats.quote = false;
        }
      } else if (action.command === "insertOrderedList") {
        nextFormats.number = !Boolean(current.number);
        if (nextFormats.number) {
          nextFormats.bullet = false;
          nextFormats.quote = false;
        }
      } else if (action.command === "formatBlock") {
        nextFormats.quote = !Boolean(current.quote);
        if (nextFormats.quote) {
          nextFormats.bullet = false;
          nextFormats.number = false;
        }
      }

      const controlled = setControlledFormats(nextFormats);
      applyActiveTypingState(controlled);
      safeRequestAnimationFrame(syncEditorState);
    },
    [activeFormats, activeFormatsRef, editorRef, setControlledFormats, submittingValueRef, syncEditorState]
  );

  const handleEditorBeforeInput = useCallback(
    () => {
      if (submittingValueRef.current) return;
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus({ preventScroll: true });
      applyActiveTypingState(activeFormatsRef?.current || activeFormats);
    },
    [activeFormats, activeFormatsRef, editorRef, submittingValueRef]
  );

  const handleEditorKeyDown = useCallback(
    () => {
      if (submittingValueRef.current) return;
      // Do not auto-disable quote, list, bold, or italic on Enter.
      // Enter keeps the current user-selected mode active, including new lines inside quote blocks.
    },
    [submittingValueRef]
  );

  const handleEditorPointerDown = useCallback(
    (event) => {
      if (submittingValueRef.current) return;

      const editor = editorRef.current;
      const current = activeFormatsRef?.current || activeFormats;

      if (current.quote && editor && event?.target === editor) {
        event.preventDefault?.();

        const nextFormats = {
          ...current,
          bullet: false,
          number: false,
          quote: false,
        };

        const paragraph = createPlainParagraphAfter(editor);
        setControlledFormats(nextFormats);

        safeRequestAnimationFrame(() => {
          editor.focus({ preventScroll: true });
          placeCaretInElement(paragraph || editor);
          applyActiveTypingState(nextFormats);
          syncEditorState();
        });
        return;
      }

      safeRequestAnimationFrame(() => {
        applyActiveTypingState(activeFormatsRef?.current || activeFormats);
      });
    },
    [activeFormats, activeFormatsRef, editorRef, setControlledFormats, submittingValueRef, syncEditorState]
  );

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
