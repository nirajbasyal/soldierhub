"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { T } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import ComposerActionBar from "./ComposerActionBar";
import ComposerCategoryPicker from "./ComposerCategoryPicker";
import ComposerEditor from "./ComposerEditor";
import ComposerImagePicker from "./ComposerImagePicker";
import ComposerToolbar from "./ComposerToolbar";
import useComposerDraft from "./useComposerDraft";
import useComposerFormatting, {
  ensureQuoteExitSpace,
  hasStructuredContent,
  placeCursorAtEnd,
} from "./useComposerFormatting";
import useComposerImage from "./useComposerImage";
import {
  COMPOSER_DRAFT_KEY,
  clearSavedDraft,
  getAnonymousDisplayName,
  getPlainEditorText,
  safeRequestAnimationFrame,
  sanitizeComposerHtml,
} from "./composerUtils";

const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

const PUBLISH_SCROLL_KEY = "soldierhub_scroll_to_latest_post";
const COMPOSE_SUBMIT_EVENT = "soldierhub-compose-submit";
const COMPOSE_STATE_EVENT = "soldierhub-compose-state";

export default function PostComposer({ startOpen = false, pageMode = false }) {
  const router = useRouter();
  const { currentUser, requireAuth, createPost, setCategory: setFeedCategory } = useApp();

  const [open, setOpen] = useState(startOpen);
  const [category, setCategory] = useState("General Q&A");
  const [body, setBody] = useState("");
  const [plainText, setPlainText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPhoneScreen, setIsPhoneScreen] = useState(false);
  const [structured, setStructured] = useState(false);
  const [clearedDraft, setClearedDraft] = useState(null);

  const editorRef = useRef(null);
  const bodyValueRef = useRef(body);
  const plainTextValueRef = useRef(plainText);
  const categoryValueRef = useRef(category);
  const anonymousValueRef = useRef(anonymous);
  const submittingValueRef = useRef(submitting);
  const activeFormatsRef = useRef({});

  const canPublish = useMemo(
    () => plainText.trim().length > 0,
    [plainText]
  );

  const focusComposerField = () => {
    safeRequestAnimationFrame(() => {
      editorRef.current?.focus({ preventScroll: true });
      syncFormatState();
    });
  };

  const syncEditorState = () => {
    const editor = editorRef.current;
    ensureQuoteExitSpace(editor);

    const cleanHtml = sanitizeComposerHtml(editor?.innerHTML || "");
    const cleanText = getPlainEditorText(editor);

    setBody(cleanHtml);
    setPlainText(cleanText);
    setStructured(hasStructuredContent(editor));
    setClearedDraft(null);
    setDraftSaved(false);
    setDraftStatus("");
    bodyValueRef.current = cleanHtml;
    plainTextValueRef.current = cleanText;
    setError("");
    safeRequestAnimationFrame(syncFormatState);
  };

  const {
    activeFormats,
    setActiveFormats,
    syncFormatState,
    applyFormatting,
    handleEditorBeforeInput,
    handleEditorKeyDown,
    handleEditorPointerDown,
  } = useComposerFormatting({
    editorRef,
    submittingValueRef,
    activeFormatsRef,
    setStructured,
    syncEditorState,
  });

  const {
    imageInputRef,
    selectedImage,
    selectedImageRef,
    imageProcessing,
    imageNotice,
    clearSelectedImage,
    removeSelectedImage,
    openImagePicker,
    handleImageSelected,
    uploadSelectedImage,
    setImageStatus,
  } = useComposerImage({
    submittingValueRef,
    setError,
    setOpen,
    focusComposerField,
  });

  const {
    draftStatus,
    setDraftStatus,
    draftSaved,
    setDraftSaved,
    saveDraft,
    clearDraftState,
  } = useComposerDraft({
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
  });

  const canPublishWithImage = useMemo(
    () => plainText.trim().length > 0 || Boolean(selectedImage),
    [plainText, selectedImage]
  );

  useEffect(() => {
    bodyValueRef.current = body;
  }, [body]);

  useEffect(() => {
    plainTextValueRef.current = plainText;
  }, [plainText]);

  useEffect(() => {
    categoryValueRef.current = category;
  }, [category]);

  useEffect(() => {
    anonymousValueRef.current = anonymous;
  }, [anonymous]);

  useEffect(() => {
    submittingValueRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const phoneQuery = window.matchMedia("(max-width: 520px)");
    const updatePhoneScreen = () => setIsPhoneScreen(phoneQuery.matches);
    updatePhoneScreen();

    if (phoneQuery.addEventListener) {
      phoneQuery.addEventListener("change", updatePhoneScreen);
      return () => phoneQuery.removeEventListener("change", updatePhoneScreen);
    }

    phoneQuery.addListener(updatePhoneScreen);
    return () => phoneQuery.removeListener(updatePhoneScreen);
  }, []);

  useEffect(() => {
    if (!pageMode || typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent(COMPOSE_STATE_EVENT, {
        detail: { canPublish: canPublishWithImage, submitting: submitting || imageProcessing },
      })
    );
  }, [canPublishWithImage, submitting, imageProcessing, pageMode]);

  useEffect(() => {
    if (!open || !editorRef.current) return;

    safeRequestAnimationFrame(() => {
      editorRef.current?.focus({ preventScroll: true });
      syncFormatState();
    });
  }, [open, syncFormatState]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return undefined;

    const resizeEditor = () => {
      const viewportHeight =
        typeof window !== "undefined" ? window.visualViewport?.height || window.innerHeight : 760;
      const minHeight = pageMode ? (isPhoneScreen ? 180 : 150) : isPhoneScreen ? 170 : 126;

      editor.style.minHeight = `${minHeight}px`;

      if (pageMode && isPhoneScreen) {
        editor.style.maxHeight = "none";
        editor.style.overflowY = "visible";
        return;
      }

      const maxHeight = pageMode
        ? Math.max(230, Math.min(isPhoneScreen ? 390 : 320, Math.round(viewportHeight * 0.38)))
        : isPhoneScreen
          ? 330
          : 220;

      editor.style.maxHeight = `${maxHeight}px`;
      editor.style.overflowY = editor.scrollHeight > maxHeight ? "auto" : "hidden";
    };

    resizeEditor();

    if (typeof window !== "undefined") {
      window.addEventListener("resize", resizeEditor);
      window.visualViewport?.addEventListener("resize", resizeEditor);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", resizeEditor);
        window.visualViewport?.removeEventListener("resize", resizeEditor);
      }
    };
  }, [body, pageMode, isPhoneScreen, selectedImage]);

  const selectCategory = (nextCategory) => {
    if (submittingValueRef.current) return;
    setCategory(nextCategory);
    categoryValueRef.current = nextCategory;
    focusComposerField();
  };

  const handleImageChange = async (event) => {
    const result = await handleImageSelected(event);
    if (result?.ok === false) {
      setError(result.error || "Could not prepare this image. Please try another photo.");
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";

    try {
      document.execCommand("insertText", false, text);
    } catch {
      const editor = editorRef.current;
      if (editor) editor.textContent = `${editor.textContent || ""}${text}`;
    }

    safeRequestAnimationFrame(syncEditorState);
  };

  const toggleAnonymous = () => {
    if (submittingValueRef.current) return;
    setAnonymous((value) => {
      anonymousValueRef.current = !value;
      return !value;
    });
  };

  const clearEditor = () => {
    if (editorRef.current) editorRef.current.innerHTML = "";
    setBody("");
    setPlainText("");
    setActiveFormats({});
    activeFormatsRef.current = {};
    setStructured(false);
    bodyValueRef.current = "";
    plainTextValueRef.current = "";
  };

  const clearTextWithUndo = () => {
    if (submittingValueRef.current || !plainTextValueRef.current.trim()) return;

    setClearedDraft({
      body: bodyValueRef.current,
      plainText: plainTextValueRef.current,
      structured,
    });
    clearEditor();
    setDraftSaved(false);
    setDraftStatus("Text cleared. Tap undo to restore it.");
    focusComposerField();
  };

  const restoreClearedText = () => {
    if (!clearedDraft || submittingValueRef.current) return;

    if (editorRef.current) {
      editorRef.current.innerHTML = clearedDraft.body;
      ensureQuoteExitSpace(editorRef.current);
    }

    setBody(clearedDraft.body);
    setPlainText(clearedDraft.plainText);
    setStructured(clearedDraft.structured);
    bodyValueRef.current = clearedDraft.body;
    plainTextValueRef.current = clearedDraft.plainText;
    setClearedDraft(null);
    setDraftStatus("Text restored.");

    safeRequestAnimationFrame(() => {
      placeCursorAtEnd(editorRef.current);
      syncFormatState();
    });
  };

  const resetComposer = () => {
    clearEditor();
    clearSelectedImage();
    setAnonymous(false);
    setError("");
    setClearedDraft(null);
    clearDraftState();
    setOpen(startOpen);
  };

  const handleSaveDraft = () => {
    const saved = saveDraft();
    if (!saved) focusComposerField();
  };

  const submit = async () => {
    if (submittingValueRef.current || imageProcessing) return;

    setError("");
    syncEditorState();

    const cleanedText = plainTextValueRef.current.trim();
    const cleanedBody = sanitizeComposerHtml(bodyValueRef.current);
    const imageToUpload = selectedImageRef.current;

    if (!cleanedText && !imageToUpload) {
      setError("Write something or add a photo before publishing.");
      focusComposerField();
      return;
    }

    try {
      setSubmitting(true);
      submittingValueRef.current = true;

      if (cleanedText) {
        const mod = await moderateAsync(cleanedText);
        if (!mod.allowed) {
          setError(mod.reason || SAFETY_MESSAGE);
          focusComposerField();
          return;
        }
      }

      const uploadedImage = imageToUpload ? await uploadSelectedImage() : null;

      const result = await createPost({
        body: cleanedBody || cleanedText,
        category: categoryValueRef.current,
        anonymous: anonymousValueRef.current,
        image: uploadedImage,
      });

      if (result?.ok === false) {
        setError(result.error || "Could not create post. Try again.");
        focusComposerField();
        return;
      }

      resetComposer();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PUBLISH_SCROLL_KEY, "1");
        clearSavedDraft(COMPOSER_DRAFT_KEY);
      }
      setFeedCategory?.("All");
      router.push("/");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Could not create post. Try again.");
      focusComposerField();
    } finally {
      setSubmitting(false);
      submittingValueRef.current = false;
      setImageStatus((current) => (current === "Uploading photo…" ? "" : current));
    }
  };

  useEffect(() => {
    if (!pageMode || typeof window === "undefined") return undefined;
    const handleExternalSubmit = () => submit();
    window.addEventListener(COMPOSE_SUBMIT_EVENT, handleExternalSubmit);
    return () => window.removeEventListener(COMPOSE_SUBMIT_EVENT, handleExternalSubmit);
  }, [pageMode]);

  if (!currentUser || currentUser.status !== "verified") {
    return (
      <button
        type="button"
        onClick={requireAuth}
        className="flex w-full items-center gap-3 rounded-[24px] border p-5 text-left"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: T.goldBg }}
        >
          <Pencil size={16} style={{ color: T.gold }} />
        </div>

        <div className="flex-1">
          <div className="text-sm font-medium" style={{ color: T.text }}>
            Share a question or update
          </div>
          <div className="text-xs" style={{ color: T.textSubtle }}>
            Sign in as a verified member to post.
          </div>
        </div>
      </button>
    );
  }

  if (!open) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[26px] border p-5"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <Avatar
          name={currentUser.full_name}
          color={currentUser.avatar_color}
          src={currentUser.avatar_url}
          size={46}
        />

        <div
          className="min-w-0 flex-1 rounded-full border px-4 py-4"
          style={{ backgroundColor: "#F4F8FD", borderColor: T.border }}
        >
          <div className="truncate text-[15px] font-medium" style={{ color: T.textMuted }}>
            What do you want to ask or share?
          </div>
        </div>

        <Button variant="primary" icon={Plus}>
          Post
        </Button>
      </div>
    );
  }

  const composerDisplayName = anonymous
    ? getAnonymousDisplayName(currentUser.id)
    : currentUser.full_name;
  const composerDisplayColor = anonymous ? "#5C6470" : currentUser.avatar_color;
  const composerAvatarSrc = anonymous ? null : currentUser.avatar_url;

  return (
    <div
      className={
        pageMode
          ? "relative flex flex-col rounded-[30px] border p-3.5 md:min-h-[500px] md:p-5"
          : "relative rounded-[26px] border p-4"
      }
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="mb-3 flex items-center gap-3">
        <Avatar
          name={composerDisplayName}
          color={composerDisplayColor}
          src={composerAvatarSrc}
          size={44}
        />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-extrabold" style={{ color: T.text }}>
            {composerDisplayName}
          </div>
          <div className="truncate text-sm font-medium" style={{ color: T.textSubtle }}>
            Posting on SoldierHub
          </div>
        </div>
      </div>

      <ComposerCategoryPicker
        category={category}
        onSelectCategory={selectCategory}
        submitting={submitting}
      />

      <ComposerToolbar
        activeFormats={activeFormats}
        applyFormatting={applyFormatting}
        submitting={submitting}
      />

      <ComposerImagePicker
        imageInputRef={imageInputRef}
        onImageSelected={handleImageChange}
      />

      <ComposerEditor
        editorRef={editorRef}
        plainText={plainText}
        structured={structured}
        selectedImage={selectedImage}
        imageProcessing={imageProcessing}
        submitting={submitting}
        clearedDraft={clearedDraft}
        onClearText={clearTextWithUndo}
        onRestoreText={restoreClearedText}
        onRemoveImage={removeSelectedImage}
        onFocus={() => safeRequestAnimationFrame(syncFormatState)}
        onPointerDown={handleEditorPointerDown}
        onInput={syncEditorState}
        onBeforeInput={handleEditorBeforeInput}
        onKeyDown={handleEditorKeyDown}
        onKeyUp={syncFormatState}
        onMouseUp={syncFormatState}
        onPaste={handlePaste}
      />

      {imageNotice ? (
        <div
          className="mt-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold"
          style={{ backgroundColor: "#FFF8E8", borderColor: "rgba(232,160,32,0.28)", color: "#7A5412" }}
        >
          {imageNotice}
        </div>
      ) : null}

      {error && (
        <div
          className="my-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ backgroundColor: T.redBg, color: T.red }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <ComposerActionBar
        pageMode={pageMode}
        anonymous={anonymous}
        onToggleAnonymous={toggleAnonymous}
        selectedImage={selectedImage}
        imageProcessing={imageProcessing}
        onOpenImagePicker={openImagePicker}
        canPublish={canPublishWithImage || canPublish}
        submitting={submitting}
        onSubmit={submit}
        draftSaved={draftSaved}
        draftStatus={draftStatus}
        onSaveDraft={handleSaveDraft}
      />

      {anonymous && (
        <div
          className="mt-2 flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs font-medium"
          style={{ backgroundColor: T.redBg, borderColor: "rgba(179, 25, 66, 0.18)", color: T.red }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Anonymous mode is on. Do not include names, unit details, or personal contact info in the post body.</span>
        </div>
      )}
    </div>
  );
}
