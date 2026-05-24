"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Lock, Pencil, Plus, X } from "lucide-react";
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
import useComposerImage from "./useComposerImage";
import {
  COMPOSER_DRAFT_KEY,
  clearSavedDraft,
  getAnonymousDisplayName,
  getPlainEditorText,
  safeRequestAnimationFrame,
  sanitizeComposerHtml,
} from "./composerUtils";

const SAFETY_MESSAGE = "This content may violate Soldier Hub community safety rules. Please revise it and try again.";
const ANONYMOUS_NOTICE = "Anonymous mode hides your public name. Avoid names, unit details, phone numbers, or sensitive information.";
const PUBLISH_SCROLL_KEY = "soldierhub_scroll_to_latest_post";
const COMPOSE_SUBMIT_EVENT = "soldierhub-compose-submit";
const COMPOSE_STATE_EVENT = "soldierhub-compose-state";
const ANONYMOUS_NOTICE_MS = 4600;

export default function PostComposer({ startOpen = false, pageMode = false }) {
  const router = useRouter();
  const { currentUser, requireAuth, createPost, setCategory: setFeedCategory } = useApp();

  const [open, setOpen] = useState(startOpen);
  const [category, setCategory] = useState("General Q&A");
  const [body, setBody] = useState("");
  const [plainText, setPlainText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [showAnonymousNotice, setShowAnonymousNotice] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPhoneScreen, setIsPhoneScreen] = useState(false);
  const [structured, setStructured] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});
  const [draftVersion, setDraftVersion] = useState(0);
  const [clearedTextDraft, setClearedTextDraft] = useState(null);

  const editorRef = useRef(null);
  const bodyValueRef = useRef(body);
  const plainTextValueRef = useRef(plainText);
  const categoryValueRef = useRef(category);
  const anonymousValueRef = useRef(anonymous);
  const submittingValueRef = useRef(submitting);
  const didInitialPageModePassRef = useRef(false);
  const anonymousNoticeTimeoutRef = useRef(null);

  const canPublish = useMemo(() => plainText.trim().length > 0, [plainText]);
  const canPublishWithImage = useMemo(() => plainText.trim().length > 0 || Boolean(selectedImageRefForMemoFallback()), [plainText]);

  function selectedImageRefForMemoFallback() {
    return selectedImageRef?.current || null;
  }

  const syncFormatState = () => setActiveFormats(editorRef.current?.getActiveFormats?.() || {});

  const focusComposerField = () => {
    safeRequestAnimationFrame(() => {
      if (pageMode && isPhoneScreen) {
        editorRef.current?.openLongEditor?.();
        return;
      }
      editorRef.current?.focus?.();
      syncFormatState();
    });
  };

  const touchDraftVersion = () => setDraftVersion((value) => value + 1);

  const syncEditorState = () => {
    const editor = editorRef.current;
    const cleanHtml = sanitizeComposerHtml(editor?.innerHTML || editor?.getHTML?.() || "");
    const cleanText = getPlainEditorText(editor);

    setBody(cleanHtml);
    setPlainText(cleanText);
    setStructured(Boolean(editor?.hasStructuredContent?.()));
    setDraftSaved(false);
    setDraftStatus("");
    bodyValueRef.current = cleanHtml;
    plainTextValueRef.current = cleanText;
    setError("");
    safeRequestAnimationFrame(syncFormatState);
    touchDraftVersion();
  };

  const handleEditorChange = ({ html, text, structured: nextStructured }) => {
    const cleanHtml = sanitizeComposerHtml(html || "");
    const cleanText = String(text || "").trim();

    setBody(cleanHtml);
    setPlainText(cleanText);
    setStructured(Boolean(nextStructured));
    setDraftSaved(false);
    setDraftStatus("");
    setClearedTextDraft(null);
    bodyValueRef.current = cleanHtml;
    plainTextValueRef.current = cleanText;
    setError("");
    touchDraftVersion();
  };

  const handleFormatChange = (nextFormats) => setActiveFormats(nextFormats || {});

  const applyFormatting = (action) => {
    if (submittingValueRef.current || !action?.command) return;
    editorRef.current?.runCommand?.(action.command);
    safeRequestAnimationFrame(syncFormatState);
  };

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
  } = useComposerImage({ submittingValueRef, setError, setOpen, focusComposerField });

  const canPublishWithImageFinal = useMemo(() => plainText.trim().length > 0 || Boolean(selectedImage), [plainText, selectedImage]);

  const { draftStatus, setDraftStatus, draftSaved, setDraftSaved, saveDraft, clearDraftState } = useComposerDraft({
    open,
    currentUser,
    submitting,
    imageProcessing,
    structured,
    draftVersion,
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
  });

  useEffect(() => { bodyValueRef.current = body; }, [body]);
  useEffect(() => { plainTextValueRef.current = plainText; }, [plainText]);
  useEffect(() => { categoryValueRef.current = category; touchDraftVersion(); }, [category]);
  useEffect(() => { anonymousValueRef.current = anonymous; touchDraftVersion(); }, [anonymous]);
  useEffect(() => { submittingValueRef.current = submitting; }, [submitting]);

  useEffect(() => () => {
    if (anonymousNoticeTimeoutRef.current) window.clearTimeout(anonymousNoticeTimeoutRef.current);
  }, []);

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
    window.dispatchEvent(new CustomEvent(COMPOSE_STATE_EVENT, { detail: { canPublish: canPublishWithImageFinal, submitting: submitting || imageProcessing } }));
  }, [canPublishWithImageFinal, submitting, imageProcessing, pageMode]);

  useEffect(() => {
    if (!open || !editorRef.current) return;
    if (pageMode && !didInitialPageModePassRef.current) {
      didInitialPageModePassRef.current = true;
      syncFormatState();
      return;
    }
    if (pageMode && isPhoneScreen) {
      syncFormatState();
      return;
    }
    safeRequestAnimationFrame(() => {
      editorRef.current?.focus?.();
      syncFormatState();
    });
  }, [open, pageMode, isPhoneScreen]);

  const selectCategory = (nextCategory) => {
    if (submittingValueRef.current) return;
    setCategory(nextCategory);
    categoryValueRef.current = nextCategory;
    if (!isPhoneScreen) focusComposerField();
  };

  const handleImageChange = async (event) => {
    const result = await handleImageSelected(event);
    if (result?.ok === false) setError(result.error || "Could not prepare this image. Please try another photo.");
  };

  const showTemporaryAnonymousNotice = () => {
    setShowAnonymousNotice(true);
    if (anonymousNoticeTimeoutRef.current) window.clearTimeout(anonymousNoticeTimeoutRef.current);
    anonymousNoticeTimeoutRef.current = window.setTimeout(() => {
      setShowAnonymousNotice(false);
      anonymousNoticeTimeoutRef.current = null;
    }, ANONYMOUS_NOTICE_MS);
  };

  const hideTemporaryAnonymousNotice = () => {
    if (anonymousNoticeTimeoutRef.current) {
      window.clearTimeout(anonymousNoticeTimeoutRef.current);
      anonymousNoticeTimeoutRef.current = null;
    }
    setShowAnonymousNotice(false);
  };

  const toggleAnonymous = () => {
    if (submittingValueRef.current) return;
    setAnonymous((value) => {
      const nextValue = !value;
      anonymousValueRef.current = nextValue;
      if (nextValue) showTemporaryAnonymousNotice();
      else hideTemporaryAnonymousNotice();
      return nextValue;
    });
  };

  const clearEditor = () => {
    editorRef.current?.clearText?.();
    if (editorRef.current) editorRef.current.innerHTML = "";
    setBody("");
    setPlainText("");
    setActiveFormats({});
    setStructured(false);
    bodyValueRef.current = "";
    plainTextValueRef.current = "";
    touchDraftVersion();
  };

  const handleClearText = () => {
    const currentBody = sanitizeComposerHtml(editorRef.current?.innerHTML || bodyValueRef.current || "");
    const currentText = String(editorRef.current?.innerText || plainTextValueRef.current || "").trim();
    if (!currentText && !currentBody) return;
    setClearedTextDraft({ body: currentBody, plainText: currentText, structured });
    clearEditor();
  };

  const handleRestoreText = () => {
    if (!clearedTextDraft) return;
    const restoredBody = sanitizeComposerHtml(clearedTextDraft.body || "");
    const restoredText = String(clearedTextDraft.plainText || "").trim();
    editorRef.current && (editorRef.current.innerHTML = restoredBody);
    setBody(restoredBody);
    setPlainText(restoredText);
    setStructured(Boolean(clearedTextDraft.structured));
    bodyValueRef.current = restoredBody;
    plainTextValueRef.current = restoredText;
    setClearedTextDraft(null);
    touchDraftVersion();
    focusComposerField();
  };

  const resetComposer = () => {
    clearEditor();
    clearSelectedImage();
    setAnonymous(false);
    hideTemporaryAnonymousNotice();
    setError("");
    setClearedTextDraft(null);
    clearDraftState();
    setOpen(startOpen);
  };

  const handleSaveDraft = () => {
    syncEditorState();
    const saved = saveDraft();
    if (!saved) focusComposerField();
  };

  const closeComposer = () => {
    if (submittingValueRef.current || imageProcessing) return;
    if (pageMode) {
      router.push("/");
      return;
    }
    setOpen(false);
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
      const result = await createPost({ body: cleanedBody || cleanedText, category: categoryValueRef.current, anonymous: anonymousValueRef.current, image: uploadedImage });

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
      <button type="button" onClick={requireAuth} className="flex w-full items-center gap-3 rounded-[24px] border p-5 text-left" style={{ backgroundColor: T.card, borderColor: T.border }}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: T.goldBg }}><Pencil size={16} style={{ color: T.gold }} /></div>
        <div className="flex-1"><div className="text-sm font-medium" style={{ color: T.text }}>Share a question or update</div><div className="text-xs" style={{ color: T.textSubtle }}>Sign in as a verified member to post.</div></div>
      </button>
    );
  }

  if (!open) {
    return (
      <div role="button" tabIndex={0} onClick={() => setOpen(true)} className="flex w-full cursor-pointer items-center gap-3 rounded-[26px] border p-5" style={{ backgroundColor: T.card, borderColor: T.border }}>
        <Avatar name={currentUser.full_name} color={currentUser.avatar_color} src={currentUser.avatar_url} size={46} />
        <div className="min-w-0 flex-1 rounded-full border px-4 py-4" style={{ backgroundColor: "#F4F8FD", borderColor: T.border }}><div className="truncate text-[15px] font-medium" style={{ color: T.textMuted }}>What do you want to ask or share?</div></div>
        <Button variant="primary" icon={Plus}>Post</Button>
      </div>
    );
  }

  const composerDisplayName = anonymous ? getAnonymousDisplayName(currentUser.id) : currentUser.full_name;
  const composerDisplayColor = anonymous ? "#5C6470" : currentUser.avatar_color;
  const composerAvatarSrc = anonymous ? null : currentUser.avatar_url;

  return (
    <div className={pageMode ? "relative flex flex-col rounded-[30px] border p-3.5 md:min-h-[500px] md:p-5" : "relative rounded-[26px] border p-4"} style={{ backgroundColor: T.card, borderColor: T.border }}>
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={composerDisplayName} color={composerDisplayColor} src={composerAvatarSrc} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5 text-[16px] font-extrabold" style={{ color: T.text }}><span className="truncate">{composerDisplayName}</span>{anonymous ? <Lock size={15} strokeWidth={2.8} className="shrink-0" style={{ color: T.textSubtle }} aria-label="Anonymous posting enabled" /> : null}</div>
          <div className="truncate text-sm font-medium" style={{ color: T.textSubtle }}>Posting on Soldier Hub</div>
        </div>
        <button type="button" onClick={closeComposer} disabled={submitting || imageProcessing} className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition hover:-translate-y-0.5 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 md:inline-flex" style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: T.border, color: T.navy }} aria-label="Close composer" title="Close composer"><X size={18} strokeWidth={2.8} /></button>
      </div>

      <ComposerCategoryPicker category={category} onSelectCategory={selectCategory} submitting={submitting} />

      {!(pageMode && isPhoneScreen) ? (
        <ComposerToolbar activeFormats={activeFormats} applyFormatting={applyFormatting} submitting={submitting} />
      ) : null}

      <ComposerImagePicker imageInputRef={imageInputRef} onImageSelected={handleImageChange} />

      <ComposerEditor
        editorRef={editorRef}
        body={body}
        plainText={plainText}
        structured={structured}
        selectedImage={selectedImage}
        imageProcessing={imageProcessing}
        submitting={submitting}
        pageMode={pageMode}
        onRemoveImage={removeSelectedImage}
        onChange={handleEditorChange}
        onFormatChange={handleFormatChange}
        onClearText={handleClearText}
        onRestoreText={handleRestoreText}
        canRestoreText={Boolean(clearedTextDraft)}
      />

      {imageNotice ? <div className="mt-2 rounded-2xl border px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: "#FFF8E8", borderColor: "rgba(232,160,32,0.28)", color: "#7A5412" }}>{imageNotice}</div> : null}
      {error && <div className="my-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: T.redBg, color: T.red }}><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

      <div className="mt-2 md:mt-3">
        <ComposerActionBar pageMode={pageMode} anonymous={anonymous} showAnonymousNotice={showAnonymousNotice} anonymousNotice={ANONYMOUS_NOTICE} onToggleAnonymous={toggleAnonymous} selectedImage={selectedImage} imageProcessing={imageProcessing} onOpenImagePicker={openImagePicker} canPublish={canPublishWithImageFinal || canPublish} submitting={submitting} onSubmit={submit} draftSaved={draftSaved} draftStatus={draftStatus} onSaveDraft={handleSaveDraft} />
      </div>
    </div>
  );
}
