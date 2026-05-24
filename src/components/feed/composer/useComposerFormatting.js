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

function forceCommandState(command, shouldBeActive) {
  const isActive = readCommandState(command);
  if (isActive === shouldBeActive) return;
  runEditorCommand(command);
}

function forceExclusiveListState(activeFormats) {
  const wantsBullet = Boolean(activeFormats?.bullet);
  const wantsNumber = Boolean(activeFormats?.number);
  const isBullet = readCommandState("insertUnorderedList");
  const isNumber = readCommandState("insertOrderedList");

  if (wantsBullet) {
    if (isNumber) runEditorCommand("insertOrderedList");
    if (!readCommandState("insertUnorderedList")) runEditorCommand("insertUnorderedList");
    return;
  }

  if (wantsNumber) {
    if (isBullet) runEditorCommand("insertUnorderedList");
    if (!readCommandState("insertOrderedList")) runEditorCommand("insertOrderedList");
    return;
  }

  if (isBullet) runEditorCommand("insertUnorderedList");
  if (isNumber) runEditorCommand("insertOrderedList");
}

function applyControlledTypingState(activeFormats) {
  forceCommandState("bold", Boolean(activeFormats?.bold));
  forceCommandState("italic", Boolean(activeFormats?.italic));
  forceExclusiveListState(activeFormats);
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
    const nextFormats = {
      ...(activeFormatsRef?.current || activeFormats),
      bullet: false,
      number: false,
    };

    setControlledFormats(nextFormats);
    return nextFormats;
  }, [activeFormats, activeFormatsRef, setControlledFormats]);

  const syncFormatState = useCallback(() => {
    const editor = editorRef.current;
    setStructured(hasStructuredContent(editor));

    const controlled = normalizeFormats(activeFormatsRef?.current || activeFormats);
    setActiveFormats(controlled);
  }, [activeFormats, activeFormatsRef, editorRef, setStructured]);

  const applyFormatting = useCallback(
    (action) => {
      if (submittingValueRef.current) return;
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus({ preventScroll: true });

      const current = normalizeFormats(activeFormatsRef?.current || activeFormats);
      const nextFormats = { ...current };

      if (action.command === "bold") {
        nextFormats.bold = !current.bold;
      } else if (action.command === "italic") {
        nextFormats.italic = !current.italic;
      } else if (action.command === "insertUnorderedList") {
        nextFormats.bullet = !current.bullet;
        if (nextFormats.bullet) nextFormats.number = false;
      } else if (action.command === "insertOrderedList") {
        nextFormats.number = !current.number;
        if (nextFormats.number) nextFormats.bullet = false;
      }

      const controlled = setControlledFormats(nextFormats);
      applyControlledTypingState(controlled);

      safeRequestAnimationFrame(() => {
        applyControlledTypingState(controlled);
        syncEditorState();
      });
    },
    [activeFormats, activeFormatsRef, editorRef, setControlledFormats, submittingValueRef, syncEditorState]
  );

  const handleEditorBeforeInput = useCallback(
    () => {
      if (submittingValueRef.current) return;
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus({ preventScroll: true });
      applyControlledTypingState(activeFormatsRef?.current || activeFormats);
    },
    [activeFormats, activeFormatsRef, editorRef, submittingValueRef]
  );

  const handleEditorKeyDown = useCallback(
    (event) => {
      if (submittingValueRef.current) return;

      const editor = editorRef.current;
      if (!editor) return;

      const current = normalizeFormats(activeFormatsRef?.current || activeFormats);

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

      if (event.key !== "Enter") return;

      // Keep Enter predictable. Browser creates the next line/list item, then we
      // re-apply only the toolbar state the user selected. Nothing is auto-enabled.
      safeRequestAnimationFrame(() => {
        editor.focus({ preventScroll: true });
        applyControlledTypingState(current);
        syncEditorState();
      });
    },
    [activeFormats, activeFormatsRef, applyFormatting, editorRef, submittingValueRef, syncEditorState]
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
