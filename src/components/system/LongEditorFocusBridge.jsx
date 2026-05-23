"use client";

import { useEffect } from "react";

const LONG_EDITOR_DIALOG_SELECTOR = '[aria-label="Expanded post text editor"]';
const LONG_EDITOR_TEXT_SELECTOR =
  '[aria-label="Expanded SoldierHub post text"][contenteditable="true"]';
const SMALL_COMPOSER_TEXT_SELECTOR =
  'div[contenteditable="true"][aria-label="Write your SoldierHub post"]';

function placeCaretAtEnd(editor) {
  if (!editor || typeof window === "undefined") return;

  const selection = window.getSelection?.();
  if (selection?.anchorNode && editor.contains(selection.anchorNode)) return;

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function focusMobileLongEditor() {
  if (typeof document === "undefined") return;

  const dialog = document.querySelector(LONG_EDITOR_DIALOG_SELECTOR);
  if (!dialog || dialog.classList.contains("sh-long-editor-exit")) return;

  const editor = dialog.querySelector(LONG_EDITOR_TEXT_SELECTOR);
  if (!editor) return;

  editor.setAttribute("tabindex", "0");
  editor.setAttribute("inputmode", "text");
  editor.style.webkitUserSelect = "text";
  editor.style.userSelect = "text";

  const activeElement = document.activeElement;
  if (activeElement === editor || editor.contains(activeElement)) return;

  const smallComposer = document.querySelector(SMALL_COMPOSER_TEXT_SELECTOR);
  if (activeElement === smallComposer) {
    smallComposer.blur?.();
  }

  editor.focus({ preventScroll: true });
  placeCaretAtEnd(editor);
}

export default function LongEditorFocusBridge() {
  useEffect(() => {
    const scheduleFocus = () => {
      window.requestAnimationFrame?.(focusMobileLongEditor);
      window.setTimeout(focusMobileLongEditor, 60);
      window.setTimeout(focusMobileLongEditor, 180);
      window.setTimeout(focusMobileLongEditor, 340);
    };

    const handlePointerInsideLongEditor = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(LONG_EDITOR_DIALOG_SELECTOR)) return;
      scheduleFocus();
    };

    const handleInputWhileDialogOpen = (event) => {
      const dialog = document.querySelector(LONG_EDITOR_DIALOG_SELECTOR);
      if (!dialog) return;

      const target = event.target;
      if (target instanceof Element && target.closest(LONG_EDITOR_DIALOG_SELECTOR)) return;

      scheduleFocus();
    };

    const observer = new MutationObserver(scheduleFocus);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-label"],
    });

    document.addEventListener("pointerdown", handlePointerInsideLongEditor, true);
    document.addEventListener("touchstart", handlePointerInsideLongEditor, true);
    document.addEventListener("click", handlePointerInsideLongEditor, true);
    document.addEventListener("input", handleInputWhileDialogOpen, true);
    window.visualViewport?.addEventListener("resize", scheduleFocus);
    window.visualViewport?.addEventListener("scroll", scheduleFocus);

    scheduleFocus();

    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", handlePointerInsideLongEditor, true);
      document.removeEventListener("touchstart", handlePointerInsideLongEditor, true);
      document.removeEventListener("click", handlePointerInsideLongEditor, true);
      document.removeEventListener("input", handleInputWhileDialogOpen, true);
      window.visualViewport?.removeEventListener("resize", scheduleFocus);
      window.visualViewport?.removeEventListener("scroll", scheduleFocus);
    };
  }, []);

  return null;
}
