"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bold,
  ChevronRight,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Quote,
  Save,
  Send,
  Undo2,
  X,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import { compressPostImage, revokePreviewUrl } from "@/lib/media/imageCompression";
import { uploadCompressedImageToR2 } from "@/lib/media/upload";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

const PUBLISH_SCROLL_KEY = "soldierhub_scroll_to_latest_post";
const COMPOSE_SUBMIT_EVENT = "soldierhub-compose-submit";
const COMPOSE_STATE_EVENT = "soldierhub-compose-state";
const COMPOSER_DRAFT_KEY = "soldierhub_post_composer_draft_v1";
const AUTO_SAVE_DELAY_MS = 1200;
const FORMAT_BOUNDARY = "\u200B";

const COMPOSER_CATEGORY_LABELS = {
  "General Q&A": "Q&A",
  "Resources & Support": "Resources",
  "New Soldier Help": "New Soldier",
  "Things To Do": "Things To Do",
};

const FORMAT_ACTIONS = [
  { key: "bold", command: "bold", label: "Bold", shortLabel: "B", icon: Bold },
  { key: "italic", command: "italic", label: "Italic", shortLabel: "I", icon: Italic },
  { key: "bullet", command: "insertUnorderedList", label: "Bullet list", shortLabel: "• List", icon: List },
  { key: "number", command: "insertOrderedList", label: "Numbered list", shortLabel: "1. List", icon: ListOrdered },
  { key: "quote", command: "formatBlock", label: "Quote", shortLabel: "Quote", icon: Quote },
];

const ALLOWED_EDITOR_TAGS = new Set([
  "B",
  "BLOCKQUOTE",
  "BR",
  "DIV",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "UL",
]);

function getAnonymousDisplayName(seed) {
  const source = String(seed || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  return `Anonymous${String(total % 10000).padStart(4, "0")}`;
}

function sanitizeComposerHtml(html = "") {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return String(html || "").replaceAll(FORMAT_BOUNDARY, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
  const sourceRoot = doc.body.firstElementChild;
  const outputDoc = document.implementation.createHTMLDocument("soldierhub-compose");
  const outputRoot = outputDoc.createElement("div");

  const cleanNode = (node, parent) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(
        outputDoc.createTextNode((node.textContent || "").replaceAll(FORMAT_BOUNDARY, ""))
      );
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName?.toUpperCase();

    if (!ALLOWED_EDITOR_TAGS.has(tagName)) {
      Array.from(node.childNodes).forEach((child) => cleanNode(child, parent));
      return;
    }

    const normalizedTag =
      tagName === "B" ? "strong" : tagName === "I" ? "em" : tagName.toLowerCase();
    const nextElement = outputDoc.createElement(normalizedTag);
    Array.from(node.childNodes).forEach((child) => cleanNode(child, nextElement));
    parent.appendChild(nextElement);
  };

  Array.from(sourceRoot?.childNodes || []).forEach((child) => cleanNode(child, outputRoot));

  return outputRoot.innerHTML.replaceAll(FORMAT_BOUNDARY, "").trim();
}

function getPlainEditorText(editor) {
  return (editor?.innerText || "")
    .replaceAll(FORMAT_BOUNDARY, "")
    .replace(/\u00a0/g, " ")
    .trim();
}

function getSelectionElement(editor) {
  if (typeof window === "undefined") return null;

  const selection = window.getSelection?.();
  const anchorNode = selection?.anchorNode;
  if (!editor || !anchorNode || !editor.contains(anchorNode)) return null;

  return anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
}

function selectionInsideTag(editor, tagName) {
  return Boolean(getSelectionElement(editor)?.closest?.(tagName));
}

function queryCommandIsActive(command) {
  if (typeof document === "undefined" || typeof document.queryCommandState !== "function") {
    return false;
  }

  try {
    return Boolean(document.queryCommandState(command));
  } catch {
    return false;
  }
}

function hasStructuredContent(editor) {
  return Boolean(editor?.querySelector?.("blockquote, ul, ol, li"));
}

function safeRequestAnimationFrame(callback) {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    callback?.();
    return;
  }

  window.requestAnimationFrame(callback);
}

function placeCursorAtEnd(element) {
  if (typeof window === "undefined" || !element) return;

  element.focus({ preventScroll: true });

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);

  const selection = window.getSelection?.();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function readSavedDraft(userId) {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const raw = window.localStorage.getItem(COMPOSER_DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId || !parsed?.body) return null;

    return parsed;
  } catch {
    window.localStorage.removeItem(COMPOSER_DRAFT_KEY);
    return null;
  }
}

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
  const [activeFormats, setActiveFormats] = useState({});
  const [structured, setStructured] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageStatus, setImageStatus] = useState("");
  const [imageNotice, setImageNotice] = useState("");
  const [clearedDraft, setClearedDraft] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const bodyValueRef = useRef(body);
  const plainTextValueRef = useRef(plainText);
  const categoryValueRef = useRef(category);
  const anonymousValueRef = useRef(anonymous);
  const submittingValueRef = useRef(submitting);
  const activeFormatsRef = useRef(activeFormats);
  const selectedImageRef = useRef(selectedImage);
  const hasLoadedDraftRef = useRef(false);

  const canPublish = useMemo(
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
    activeFormatsRef.current = activeFormats;
  }, [activeFormats]);

  useEffect(() => {
    selectedImageRef.current = selectedImage;
  }, [selectedImage]);

  useEffect(() => {
    return () => {
      revokePreviewUrl(selectedImageRef.current?.previewUrl);
    };
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

    window.dispatchEvent(
      new CustomEvent(COMPOSE_STATE_EVENT, {
        detail: { canPublish, submitting: submitting || imageProcessing },
      })
    );
  }, [canPublish, submitting, imageProcessing, pageMode]);

  useEffect(() => {
    if (!open || !editorRef.current) return;

    safeRequestAnimationFrame(() => {
      editorRef.current?.focus({ preventScroll: true });
      syncFormatState();
    });
  }, [open]);

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

  useEffect(() => {
    if (!open || hasLoadedDraftRef.current || !currentUser?.id) return;

    hasLoadedDraftRef.current = true;
    const savedDraft = readSavedDraft(currentUser.id);
    if (!savedDraft) return;

    if (editorRef.current) {
      editorRef.current.innerHTML = savedDraft.body;
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
  }, [body, plainText, category, anonymous, structured, open, currentUser?.id, submitting, imageProcessing]);

  const syncFormatState = () => {
    const editor = editorRef.current;
    setStructured(hasStructuredContent(editor));

    if (!editor || typeof document === "undefined") return;

    const nextFormats = {
      bold: queryCommandIsActive("bold") || selectionInsideTag(editor, "strong,b"),
      italic: queryCommandIsActive("italic") || selectionInsideTag(editor, "em,i"),
      bullet: queryCommandIsActive("insertUnorderedList") || selectionInsideTag(editor, "ul"),
      number: queryCommandIsActive("insertOrderedList") || selectionInsideTag(editor, "ol"),
      quote: selectionInsideTag(editor, "blockquote"),
    };

    activeFormatsRef.current = nextFormats;
    setActiveFormats(nextFormats);
  };

  const syncEditorState = () => {
    const editor = editorRef.current;
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

  const focusComposerField = () => {
    safeRequestAnimationFrame(() => {
      editorRef.current?.focus({ preventScroll: true });
      syncFormatState();
    });
  };

  const selectCategory = (nextCategory) => {
    if (submittingValueRef.current) return;
    setCategory(nextCategory);
    categoryValueRef.current = nextCategory;
    focusComposerField();
  };

  const clearSelectedImage = () => {
    setSelectedImage((current) => {
      revokePreviewUrl(current?.previewUrl);
      return null;
    });
    selectedImageRef.current = null;
    setImageStatus("");
    setImageNotice("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeSelectedImage = () => {
    if (submittingValueRef.current || imageProcessing) return;
    clearSelectedImage();
    focusComposerField();
  };

  const openImagePicker = () => {
    if (submittingValueRef.current || imageProcessing) return;
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    const file = files[0];
    if (event.target) event.target.value = "";
    if (!file) return;

    setError("");
    setImageNotice(
      files.length > 1 ? "Only one photo is allowed per post. We used the first selected photo." : ""
    );
    setImageStatus("Preparing photo…");
    setImageProcessing(true);

    try {
      const compressed = await compressPostImage(file);
      setSelectedImage((current) => {
        revokePreviewUrl(current?.previewUrl);
        selectedImageRef.current = compressed;
        return compressed;
      });
      setImageStatus("");
      setOpen(true);
    } catch (err) {
      setError(err?.message || "Could not prepare this image. Please try another photo.");
      setImageStatus("");
    } finally {
      setImageProcessing(false);
    }
  };

  const applyFormatting = (action) => {
    if (submittingValueRef.current) return;
    const editor = editorRef.current;
    if (!editor || typeof document === "undefined") return;

    editor.focus({ preventScroll: true });

    try {
      if (action.command === "formatBlock") {
        const isQuoteActive =
          Boolean(activeFormatsRef.current?.quote) || selectionInsideTag(editor, "blockquote");
        document.execCommand("formatBlock", false, isQuoteActive ? "p" : "blockquote");
      } else {
        document.execCommand(action.command, false, null);
      }
    } catch {
      // Keep the composer usable even if a browser blocks an older execCommand call.
    }

    safeRequestAnimationFrame(syncEditorState);
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

    const previousBody = bodyValueRef.current;
    const previousPlainText = plainTextValueRef.current;
    const previousStructured = structured;

    setClearedDraft({ body: previousBody, plainText: previousPlainText, structured: previousStructured });
    clearEditor();
    setDraftSaved(false);
    setDraftStatus("Text cleared. Tap undo to restore it.");
    focusComposerField();
  };

  const restoreClearedText = () => {
    if (!clearedDraft || submittingValueRef.current) return;

    if (editorRef.current) {
      editorRef.current.innerHTML = clearedDraft.body;
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
    setDraftSaved(false);
    setDraftStatus("");
    setOpen(startOpen);
  };

  const saveDraft = () => {
    if (typeof window === "undefined" || !currentUser?.id) return;

    const draftBody = sanitizeComposerHtml(bodyValueRef.current);
    const draftText = plainTextValueRef.current.trim();

    if (!draftText && !draftBody) {
      setDraftSaved(false);
      setDraftStatus("Write something before saving a draft.");
      focusComposerField();
      return;
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
    } catch {
      setDraftSaved(false);
      setDraftStatus("Draft could not be saved on this device.");
    }
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

      let uploadedImage = null;
      if (imageToUpload) {
        setImageStatus("Uploading photo…");
        uploadedImage = await uploadCompressedImageToR2(imageToUpload, { purpose: "post" });
      }

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
        window.localStorage.removeItem(COMPOSER_DRAFT_KEY);
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
    if (!pageMode) return undefined;
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
  const showTextClearControl = Boolean(plainText.trim()) || Boolean(clearedDraft);
  const actionBarClassName = `${pageMode ? "sticky bottom-2 z-40 md:static" : ""} mt-3 rounded-[24px] border px-2.5 py-2 md:rounded-[20px] md:px-3 md:py-2.5`;

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

      <div className="relative -mx-1 mb-3">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex w-max gap-2 px-1 pr-14">
            {CATEGORIES.filter((c) => c.key !== "All").map((c) => {
              const active = c.key === category;
              const s = TONE_STYLES[c.tone];
              const label = COMPOSER_CATEGORY_LABELS[c.label] || COMPOSER_CATEGORY_LABELS[c.key] || c.label;

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => selectCategory(c.key)}
                  className="h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: active ? s.bg : "#FFFFFF",
                    color: active ? s.text : T.textMuted,
                    borderColor: active ? s.border : T.border,
                    boxShadow: active ? "0 10px 20px rgba(11,28,44,0.06)" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-end pr-2"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.82) 62%, rgba(255,255,255,1) 100%)",
          }}
        >
          <ChevronRight size={22} strokeWidth={2.7} style={{ color: T.textSubtle }} />
        </div>
      </div>

      <div
        className="mb-3 flex flex-wrap items-center gap-1.5 rounded-[20px] border px-2 py-2 md:flex-nowrap md:gap-2 md:rounded-2xl md:py-1.5"
        style={{ backgroundColor: "rgba(238,243,247,0.92)", borderColor: T.borderSoft }}
        aria-label="Post formatting toolbar"
      >
        <span
          className="hidden shrink-0 pl-1 text-[11px] font-extrabold uppercase tracking-[0.12em] md:inline"
          style={{ color: T.textSubtle }}
        >
          Format
        </span>

        <div className="grid w-full grid-cols-5 gap-1.5 md:flex md:min-w-0 md:flex-1 md:flex-nowrap">
          {FORMAT_ACTIONS.map((action) => {
            const Icon = action.icon;
            const active = Boolean(activeFormats[action.key]);

            return (
              <button
                key={action.key}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormatting(action)}
                disabled={submitting}
                className="sh-tap inline-flex h-9 items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-extrabold transition active:scale-[0.98] disabled:opacity-50 md:w-auto md:px-3 md:text-xs"
                style={{
                  backgroundColor: active ? "rgba(63, 95, 125, 0.16)" : "#FFFFFF",
                  borderColor: active ? "rgba(63, 95, 125, 0.34)" : T.border,
                  color: active ? T.navy : T.textSubtle,
                  boxShadow: active ? "0 8px 18px rgba(11, 28, 44, 0.08)" : "none",
                }}
                title={action.label}
                aria-label={action.label}
                aria-pressed={active}
              >
                <Icon size={14} strokeWidth={2.4} />
                <span>{action.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleImageSelected}
      />

      <div
        className="relative overflow-hidden rounded-[24px] border px-3.5 py-3 md:px-4 md:py-3.5"
        style={{ backgroundColor: "#F8FAFD", borderColor: T.borderSoft }}
      >
        {showTextClearControl ? (
          <button
            type="button"
            onClick={clearedDraft ? restoreClearedText : clearTextWithUndo}
            disabled={submitting}
            className="sh-tap absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.96] disabled:opacity-50"
            style={{ backgroundColor: "rgba(255,255,255,0.96)", borderColor: T.border, color: T.navy }}
            aria-label={clearedDraft ? "Undo cleared text" : "Clear text"}
            title={clearedDraft ? "Undo" : "Clear text"}
          >
            {clearedDraft ? <Undo2 size={16} strokeWidth={2.7} /> : <X size={16} strokeWidth={2.9} />}
          </button>
        ) : null}

        {!plainText && !structured && (
          <div
            className="pointer-events-none absolute left-3.5 right-14 top-3.5 text-[18px] leading-8 md:left-4 md:top-4 md:text-[17px] md:leading-7"
            style={{ color: "#A8ABB2" }}
          >
            Ask a question, share an update, or help the SoldierHub community...
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable={!submitting}
          suppressContentEditableWarning
          role="textbox"
          aria-label="Write your SoldierHub post"
          aria-multiline="true"
          onFocus={() => safeRequestAnimationFrame(syncFormatState)}
          onInput={syncEditorState}
          onKeyUp={syncFormatState}
          onMouseUp={syncFormatState}
          onPaste={handlePaste}
          className="w-full appearance-none border-0 bg-transparent pr-10 text-[18px] leading-8 shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 md:text-[17px] md:leading-7 [&_blockquote]:my-3 [&_blockquote]:rounded-[18px] [&_blockquote]:border-0 [&_blockquote]:bg-[#DDE8F3] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:font-normal [&_blockquote]:text-[#102033] [&_div]:min-h-[1.65em] [&_div]:whitespace-pre-wrap [&_em]:italic [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:min-h-[1.65em] [&_p]:whitespace-pre-wrap [&_strong]:font-extrabold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1"
          style={{ color: T.text, border: "none", boxShadow: "none" }}
        />

        {imageProcessing && !selectedImage ? (
          <div
            className="mt-3 flex items-center gap-3 rounded-[20px] border px-3.5 py-3"
            style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(63,95,125,0.12)", color: T.navy }}
            >
              <Loader2 size={17} className="animate-spin" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-extrabold" style={{ color: T.text }}>
                Preparing your photo
              </div>
              <div className="text-xs font-medium" style={{ color: T.textSubtle }}>
                Please wait before publishing.
              </div>
            </div>
          </div>
        ) : null}

        {selectedImage ? (
          <div
            className="mt-3 overflow-hidden rounded-[22px] border"
            style={{ backgroundColor: "#EEF3F8", borderColor: T.borderSoft }}
          >
            <div className="relative flex justify-center bg-[#EEF3F8]">
              <img
                src={selectedImage.previewUrl}
                alt="Selected post preview"
                className="block max-h-[62vh] w-full object-cover md:max-h-[340px]"
                style={{
                  aspectRatio:
                    selectedImage.width && selectedImage.height
                      ? `${selectedImage.width} / ${selectedImage.height}`
                      : "16 / 10",
                }}
              />
              <button
                type="button"
                onClick={removeSelectedImage}
                disabled={submitting || imageProcessing}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: "rgba(255,255,255,0.94)", borderColor: T.border, color: T.navy }}
                aria-label="Remove selected photo"
                title="Remove photo"
              >
                <X size={16} strokeWidth={2.8} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

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

      <div
        className={actionBarClassName}
        style={{
          borderColor: T.borderSoft,
          backgroundColor: "rgba(248,250,253,0.98)",
          boxShadow: pageMode ? "0 14px 30px rgba(11,28,44,0.08)" : "none",
        }}
      >
        <div className="grid grid-cols-[minmax(108px,1fr)_46px_minmax(96px,0.82fr)] items-center gap-2 md:flex md:items-center md:justify-between md:gap-3">
          <button
            type="button"
            onClick={toggleAnonymous}
            disabled={submitting}
            className="sh-tap flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] border px-2 text-center transition active:scale-[0.98] disabled:opacity-50 md:h-11 md:min-w-[210px] md:flex-row md:justify-between md:gap-2 md:px-3 md:text-left"
            style={{
              backgroundColor: anonymous ? "rgba(63, 95, 125, 0.1)" : "#FFFFFF",
              borderColor: anonymous ? "rgba(63,95,125,0.34)" : T.border,
              color: T.navy,
            }}
            aria-pressed={anonymous}
          >
            <span className="w-full text-[10.5px] font-medium leading-tight tracking-normal md:w-auto md:text-[12px]">
              Post anonymously
            </span>

            <span
              className="relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border"
              style={{
                borderColor: anonymous ? "rgba(63,95,125,0.34)" : T.border,
                backgroundColor: anonymous ? "#3F5F7D" : "rgba(213,226,242,0.72)",
              }}
            >
              <span className="absolute left-2 text-[8px] font-black" style={{ color: "#FFFFFF", opacity: anonymous ? 1 : 0 }}>
                ON
              </span>
              <span className="absolute right-2 text-[8px] font-black" style={{ color: T.textSubtle, opacity: anonymous ? 0 : 1 }}>
                OFF
              </span>
              <span
                className="absolute left-[3px] top-[3px] h-[21px] w-[21px] rounded-full transition-transform duration-200"
                style={{ transform: anonymous ? "translateX(25px)" : "translateX(0)", backgroundColor: "#FFFFFF" }}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={openImagePicker}
            disabled={submitting || imageProcessing}
            className="sh-tap inline-flex h-[58px] w-[46px] shrink-0 items-center justify-center rounded-[18px] border text-[11px] font-extrabold transition active:scale-[0.98] disabled:opacity-45 md:h-11 md:w-auto md:px-4"
            style={{
              backgroundColor: selectedImage ? "rgba(63, 95, 125, 0.12)" : "#FFFFFF",
              borderColor: selectedImage ? "rgba(63,95,125,0.28)" : T.border,
              color: T.navy,
            }}
            title={selectedImage ? "Replace photo" : "Add photo"}
            aria-label={selectedImage ? "Replace photo" : "Add photo"}
          >
            {imageProcessing ? <Loader2 size={17} className="animate-spin" /> : <ImagePlus size={18} strokeWidth={2.5} />}
            <span className="hidden md:ml-1.5 md:inline">{selectedImage ? "Photo" : "Add photo"}</span>
          </button>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={submit}
            disabled={!canPublish || submitting || imageProcessing}
            className="h-[58px] min-w-0 rounded-[18px] px-3 text-[12px] md:h-11 md:min-w-[140px] md:rounded-full md:px-5 md:text-sm"
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {submitting ? "Posting" : "Publish"}
            </span>
          </Button>
        </div>

        <div
          className="mt-2 flex items-center justify-between gap-2 rounded-[18px] border px-3 py-2"
          style={{
            backgroundColor: draftSaved ? "rgba(63, 95, 125, 0.08)" : "#FFFFFF",
            borderColor: draftSaved ? "rgba(63,95,125,0.24)" : T.border,
          }}
        >
          <button
            type="button"
            onClick={saveDraft}
            disabled={submitting || imageProcessing}
            className="sh-tap inline-flex shrink-0 items-center gap-2 rounded-full px-1 py-1 text-[12px] font-black disabled:opacity-50"
            style={{ color: draftSaved ? T.navy : T.text }}
          >
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: draftSaved ? "rgba(63,95,125,0.16)" : "rgba(213,226,242,0.72)" }}
            >
              <Save size={14} strokeWidth={2.5} />
            </span>
            {draftSaved ? "Draft saved" : "Save draft"}
          </button>

          <span className="min-w-0 flex-1 text-right text-[10.5px] font-semibold leading-snug" style={{ color: T.textSubtle }}>
            {draftStatus || "Auto-restores when you reopen compose."}
          </span>
        </div>
      </div>

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
