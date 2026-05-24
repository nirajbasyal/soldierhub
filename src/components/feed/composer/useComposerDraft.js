"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AUTO_SAVE_DELAY_MS, COMPOSER_DRAFT_KEY, readSavedDraft, sanitizeComposerHtml } from "./composerUtils";

export default function useComposerDraft({
  open,
  currentUser,
  submitting,
  imageProcessing,
  structured,
  draftVersion = 0,
  editorRef,
  bodyValueRef,
  plainTextValueRef,
  categoryValueRef,
  anonymousValueRef,
  setBody,
  setPlainText,
  setCategory,
  setAnonymous,
  setStructured,
}) {
  const [draftStatus, setDraftStatus] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const hasLoadedDraftRef = useRef(false);

  const getCurrentDraftValues = useCallback(() => {
    const editor = editorRef.current;
    const editorHtml = editor?.innerHTML ? sanitizeComposerHtml(editor.innerHTML) : "";
    const editorText = editor?.innerText ? String(editor.innerText || "").replace(/\u00a0/g, " ").trim() : "";

    const draftBody = sanitizeComposerHtml(editorHtml || bodyValueRef.current || "");
    const draftText = String(editorText || plainTextValueRef.current || "").trim();

    return { draftBody, draftText };
  }, [bodyValueRef, editorRef, plainTextValueRef]);

  const persistDraft = useCallback(
    ({ silent = false } = {}) => {
      if (typeof window === "undefined" || !currentUser?.id || submitting || imageProcessing) return false;

      const { draftBody, draftText } = getCurrentDraftValues();
      const hasDraftContent = Boolean(
        draftText || draftBody.replace(/<p><\/p>|<p><br><\/p>|<br\s*\/?/gi, "").trim()
      );

      if (!hasDraftContent) {
        setDraftSaved(false);
        if (!silent) setDraftStatus("");
        return false;
      }

      try {
        window.localStorage.setItem(
          COMPOSER_DRAFT_KEY,
          JSON.stringify({
            userId: currentUser.id,
            body: draftBody || draftText,
            plainText: draftText,
            category: categoryValueRef.current || "General Q&A",
            anonymous: Boolean(anonymousValueRef.current),
            structured: Boolean(structured),
            savedAt: Date.now(),
          })
        );
        setDraftSaved(true);
        if (!silent) setDraftStatus("Autosaved in this device.");
        return true;
      } catch {
        setDraftSaved(false);
        if (!silent) setDraftStatus("Draft could not be saved on this device.");
        return false;
      }
    },
    [
      anonymousValueRef,
      categoryValueRef,
      currentUser?.id,
      getCurrentDraftValues,
      imageProcessing,
      structured,
      submitting,
    ]
  );

  useEffect(() => {
    if (!open || hasLoadedDraftRef.current || !currentUser?.id) return;

    hasLoadedDraftRef.current = true;
    const savedDraft = readSavedDraft(currentUser.id, COMPOSER_DRAFT_KEY);
    if (!savedDraft) return;

    const savedBody = sanitizeComposerHtml(savedDraft.body || "");
    const savedPlainText = savedDraft.plainText || "";
    const savedCategory = savedDraft.category || "General Q&A";
    const savedAnonymous = Boolean(savedDraft.anonymous);

    setBody(savedBody);
    setPlainText(savedPlainText);
    setCategory(savedCategory);
    setAnonymous(savedAnonymous);
    setStructured(Boolean(savedDraft.structured));
    setDraftSaved(true);

    bodyValueRef.current = savedBody;
    plainTextValueRef.current = savedPlainText;
    categoryValueRef.current = savedCategory;
    anonymousValueRef.current = savedAnonymous;

    if (editorRef.current) {
      editorRef.current.innerHTML = savedBody;
    }

    setDraftStatus("Draft restored. Continue editing or publish when ready.");
  }, [
    anonymousValueRef,
    bodyValueRef,
    categoryValueRef,
    currentUser?.id,
    editorRef,
    open,
    plainTextValueRef,
    setAnonymous,
    setBody,
    setCategory,
    setPlainText,
    setStructured,
  ]);

  useEffect(() => {
    if (!open || typeof window === "undefined" || !currentUser?.id || submitting || imageProcessing) {
      return undefined;
    }

    const autoSaveTimer = window.setTimeout(() => {
      persistDraft();
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(autoSaveTimer);
      persistDraft({ silent: true });
    };
  }, [
    open,
    currentUser?.id,
    submitting,
    imageProcessing,
    structured,
    draftVersion,
    persistDraft,
  ]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;

    const saveBeforeLeaving = () => persistDraft({ silent: true });
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveBeforeLeaving();
    };

    window.addEventListener("pagehide", saveBeforeLeaving);
    window.addEventListener("beforeunload", saveBeforeLeaving);
    document.addEventListener("visibilitychange", saveWhenHidden);

    return () => {
      saveBeforeLeaving();
      window.removeEventListener("pagehide", saveBeforeLeaving);
      window.removeEventListener("beforeunload", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [open, persistDraft]);

  const saveDraft = () => {
    const saved = persistDraft();
    if (!saved) {
      setDraftSaved(false);
      setDraftStatus("Write something before saving a draft.");
      return false;
    }

    setDraftStatus("Draft saved. Reopen this composer to continue later.");
    return true;
  };

  const clearDraftState = () => {
    setDraftSaved(false);
    setDraftStatus("");
  };

  return { draftStatus, setDraftStatus, draftSaved, setDraftSaved, saveDraft, clearDraftState };
}
