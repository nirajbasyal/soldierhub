"use client";

import { useEffect } from "react";

const CLEAR_BUTTON_ID = "soldierhub-compose-mobile-clear-undo";

function getEditor() {
  if (typeof document === "undefined") return null;
  return document.querySelector('[aria-label="Write your SoldierHub post"][contenteditable="true"], [aria-label="Write your SoldierHub post"]');
}

function getEditorText(editor) {
  return (editor?.innerText || "").replace(/\u200B/g, "").replace(/\u00a0/g, " ").trim();
}

function dispatchEditorInput(editor) {
  if (!editor) return;
  editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: null }));
}

function styleComposerImagePreview() {
  if (typeof document === "undefined") return;

  const image = document.querySelector('img[alt="Selected post preview"]');
  if (!image) return;

  image.style.objectFit = "contain";
  image.style.maxHeight = window.innerWidth < 768 ? "58vh" : "360px";
  image.style.width = "100%";
  image.style.backgroundColor = "#EEF3F8";

  const imageFrame = image.parentElement;
  if (imageFrame) {
    imageFrame.style.display = "flex";
    imageFrame.style.alignItems = "center";
    imageFrame.style.justifyContent = "center";
    imageFrame.style.backgroundColor = "#EEF3F8";
  }

  const card = imageFrame?.parentElement;
  if (card) {
    card.style.maxWidth = window.innerWidth >= 768 ? "560px" : "100%";
    card.style.marginLeft = "auto";
    card.style.marginRight = "auto";
    card.style.borderRadius = "26px";
  }
}

function stylePageModeEditor() {
  const editor = getEditor();
  if (!editor) return;

  editor.style.maxHeight = "none";
  editor.style.overflowY = "visible";

  const editorBox = editor.parentElement;
  if (editorBox) {
    editorBox.style.position = "relative";
    editorBox.style.borderRadius = "24px";
  }
}

function hideMobileClearButton() {
  if (typeof document === "undefined") return;
  const isPhone = window.innerWidth <= 520;

  document.querySelectorAll("button").forEach((button) => {
    if ((button.textContent || "").trim() !== "Clear") return;
    button.style.display = isPhone ? "none" : "";
  });
}

export default function ComposeUxBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    let lastClearedHtml = "";
    let lastClearedText = "";
    let mounted = true;

    const ensureButton = () => {
      const editor = getEditor();
      if (!editor) return;

      const editorBox = editor.parentElement;
      if (!editorBox) return;

      let button = document.getElementById(CLEAR_BUTTON_ID);
      if (!button) {
        button = document.createElement("button");
        button.id = CLEAR_BUTTON_ID;
        button.type = "button";
        button.setAttribute("aria-label", "Clear or undo post text");
        button.style.position = "absolute";
        button.style.right = "12px";
        button.style.top = "12px";
        button.style.zIndex = "20";
        button.style.height = "32px";
        button.style.minWidth = "32px";
        button.style.borderRadius = "999px";
        button.style.border = "1px solid rgba(207,218,232,0.95)";
        button.style.background = "rgba(244,248,253,0.96)";
        button.style.color = "#0B1C2C";
        button.style.boxShadow = "0 8px 16px rgba(11,28,44,0.08)";
        button.style.fontSize = "12px";
        button.style.fontWeight = "800";
        button.style.padding = "0 10px";
        button.style.cursor = "pointer";
        button.style.touchAction = "manipulation";
        editorBox.appendChild(button);
      }

      const isPhone = window.innerWidth <= 520;
      const hasText = getEditorText(editor).length > 0 || Boolean(editor.querySelector?.("blockquote, ul, ol, li"));

      button.style.display = isPhone && (hasText || lastClearedHtml) ? "inline-flex" : "none";
      button.style.alignItems = "center";
      button.style.justifyContent = "center";
      button.textContent = hasText ? "×" : "↶ Undo";
      button.style.fontSize = hasText ? "20px" : "12px";
      button.style.lineHeight = "1";

      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const liveEditor = getEditor();
        if (!liveEditor) return;

        const liveHasText = getEditorText(liveEditor).length > 0 || Boolean(liveEditor.querySelector?.("blockquote, ul, ol, li"));

        if (liveHasText) {
          lastClearedHtml = liveEditor.innerHTML;
          lastClearedText = getEditorText(liveEditor);
          liveEditor.innerHTML = "";
          dispatchEditorInput(liveEditor);
          liveEditor.focus({ preventScroll: true });
          ensureButton();
          return;
        }

        if (lastClearedHtml || lastClearedText) {
          liveEditor.innerHTML = lastClearedHtml;
          dispatchEditorInput(liveEditor);
          liveEditor.focus({ preventScroll: true });
          lastClearedHtml = "";
          lastClearedText = "";
          ensureButton();
        }
      };
    };

    const refresh = () => {
      if (!mounted) return;
      stylePageModeEditor();
      styleComposerImagePreview();
      hideMobileClearButton();
      ensureButton();
    };

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", refresh);
    document.addEventListener("input", refresh, true);
    document.addEventListener("keyup", refresh, true);

    const timer = window.setTimeout(refresh, 80);
    refresh();

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      window.removeEventListener("resize", refresh);
      document.removeEventListener("input", refresh, true);
      document.removeEventListener("keyup", refresh, true);
      observer.disconnect();
      document.getElementById(CLEAR_BUTTON_ID)?.remove();
    };
  }, []);

  return null;
}
