"use client";

import { useEffect, useRef, useState } from "react";
import { AUTO_SAVE_DELAY_MS, COMPOSER_DRAFT_KEY, readSavedDraft, sanitizeComposerHtml } from "./composerUtils";

export default function useComposerDraft({
  open,
  currentUser,
  submitting,
  imageProcessing,
  structured,
  editorRef,
  bodyValueRef,
  plainTextValueRef,
  categoryValueRef,
  anonymousValueRef,
  ensureQuoteExitSpace,
  setBody,
  setPlainText,
  setCategory,
  setAnonymous,
  setStructured,
}) {
  const [draftStatus, setDraftStatus] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const hasLoadedDraftRef = useRef(false);

  useEffect(() => {
    if (!open || hasLoadedDraftRef.current || !currentUser?.id) return;

    hasLoadedDraftRef.current = true;
    const savedDraft = readSavedDraft(currentUser.id, COMPOSER_DRAFT_KEY);
    if (!savedDraft) return;

    if (editorRef.current) {
      editorRef.current.innerHTML = savedDraft.body;
      ensureQuoteExitSpace(editorRef.current);
    }

    setBody(savedDraft.body);
    setPlainText(savedDraft.plainText || "");
    setCategory(savedDraft.category || "General Q&A");
    setAnonymous(Boolean(savedDraft.anonymous));
    setStructured(Boolean(savedDraft.structured));
    setDraftSaved(true);
    bodyValueRef.current = savedDraft.body;
    plainTextValueRef.current = savedDraft.plainText || "";
    categoryValueRef.current = savedDraft.category || "General Q&A";
    anonymousValueRef.current = Boolean(savedDraft.anonymous);
    setDraftStatus("Draft restored. Continue editing or publish when ready.");
  }, [open, currentUser?.id]);

  useEffect(() => {
    if (!open || typeof window === "undefined" || !currentUser?.id || submitting || imageProcessing) {
      return undefined;
    }

    const autoSaveTimer = window.setTimeout(() => {
      const draftBody = sanitizeComposerHtml(bodyValueRef.current);
      const draftText = plainTextValueRef.current.trim();

      if (!draftText && !draftBody) return;

      try {
        window.localStorage.setItem(
          COMPOSER_DRAFT_KEY,
          JSON.stringify({
            userId: currentUser.id,
            body: draftBody || draftText,
            plainText: draftText,
            category: categoryValueRef.current,
            anonymous: anonymousValueRef.current,
            structured,
            savedAt: Date.now(),
          })
        );
        setDraftSaved(true);
        setDraftStatus("Auto-saved on this device.");
      } catch {
        setDraftSaved(false);
        setDraftStatus("Draft could not be saved on this device.");
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(autoSaveTimer);
  }, [bodyValueRef.current, plainTextValueRef.current, categoryValueRef.current, anonymousValueRef.current, structured, open, currentUser?.id, submitting, imageProcessing]);

  const saveDraft = () => {
    if (typeof window === "undefined" || !currentUser?.id) return false;

    const draftBody = sanitizeComposerHtml(bodyValueRef.current);
    const draftText = plainTextValueRef.current.trim();

    if (!draftText && !draftBody) {
      setDraftSaved(false);
      setDraftStatus("Write something before saving a draft.");
      return false;
    }

    try {
      window.localStorage.setItem(
        COMPOSER_DRAFT_KEY,
        JSON.stringify({
          userId: currentUser.id,
          body: draftBody || draftText,
          plainText: draftText,
          category: categoryValueRef.current,
          anonymous: anonymousValueRef.current,
          structured,
          savedAt: Date.now(),
        })
      );
      setDraftSaved(true);
      setDraftStatus("Draft saved. Reopen this composer to continue later.");
      return true;
    } catch {
      setDraftSaved(false);
      setDraftStatus("Draft could not be saved on this device.");
      return false;
    }
  };

  const clearDraftState = () => {
    setDraftSaved(false);
    setDraftStatus("");
  };

  return { draftStatus, setDraftStatus, draftSaved, setDraftSaved, saveDraft, clearDraftState };
}
