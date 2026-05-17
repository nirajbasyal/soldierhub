"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bold,
  ChevronRight,
  Italic,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Quote,
  X,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { T, TONE_STYLES } from "@/lib/theme";
import { moderateAsync } from "@/lib/moderation-client";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

const SAFETY_MESSAGE =
  "This content may violate SoldierHub community safety rules. Please revise it and try again.";

const RED = "#B31942";
const DARK_RED = "#9F1239";
const PUBLISH_SCROLL_KEY = "soldierhub_scroll_to_latest_post";
const COMPOSE_SUBMIT_EVENT = "soldierhub-compose-submit";
const COMPOSE_STATE_EVENT = "soldierhub-compose-state";

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
    return String(html || "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
  const sourceRoot = doc.body.firstElementChild;
  const outputDoc = document.implementation.createHTMLDocument("soldierhub-compose");
  const outputRoot = outputDoc.createElement("div");

  const cleanNode = (node, parent) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(outputDoc.createTextNode(node.textContent || ""));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tagName = node.tagName?.toUpperCase();

    if (!ALLOWED_EDITOR_TAGS.has(tagName)) {
      Array.from(node.childNodes).forEach((child) => cleanNode(child, parent));
      return;
    }

    const normalizedTag = tagName === "B" ? "strong" : tagName === "I" ? "em" : tagName.toLowerCase();
    const nextElement = outputDoc.createElement(normalizedTag);
    Array.from(node.childNodes).forEach((child) => cleanNode(child, nextElement));
    parent.appendChild(nextElement);
  };

  Array.from(sourceRoot?.childNodes || []).forEach((child) => cleanNode(child, outputRoot));

  return outputRoot.innerHTML
    .replace(/<div><br><\/div>/gi, "")
    .replace(/<p><br><\/p>/gi, "")
    .trim();
}

function getPlainEditorText(editor) {
  return (editor?.innerText || "").replace(/\u00a0/g, " ").trim();
}

function selectionInsideTag(editor, tagName) {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection?.();
  const anchorNode = selection?.anchorNode;
  if (!editor || !anchorNode || !editor.contains(anchorNode)) return false;
  const startElement = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
  return Boolean(startElement?.closest?.(tagName));
}

function placeCaretInElement(element) {
  if (typeof window === "undefined" || !element) return;

  const selection = window.getSelection?.();
  const range = document.createRange();

  range.selectNodeContents(element);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function isEmptyEditableBlock(element) {
  if (!element) return false;

  const tagName = element.tagName?.toLowerCase();
  if (!["p", "div"].includes(tagName)) return false;

  return !element.textContent?.replace(/\u00a0/g, " ").trim();
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
  const [textFocused, setTextFocused] = useState(false);
  const [isPhoneScreen, setIsPhoneScreen] = useState(false);
  const [hasQuoteBlock, setHasQuoteBlock] = useState(false);

  const editorRef = useRef(null);
  const bodyValueRef = useRef(body);
  const plainTextValueRef = useRef(plainText);
  const categoryValueRef = useRef(category);
  const anonymousValueRef = useRef(anonymous);
  const submittingValueRef = useRef(submitting);

  const canPublish = useMemo(() => plainText.trim().length > 0, [plainText]);

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
      new CustomEvent(COMPOSE_STATE_EVENT, { detail: { canPublish, submitting } })
    );
  }, [canPublish, submitting, pageMode]);

  useEffect(() => {
    if (open && !pageMode && editorRef.current) {
      editorRef.current.focus({ preventScroll: true });
      window.requestAnimationFrame(syncQuoteState);
    }
  }, [open, pageMode]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return undefined;

    const resizeEditor = () => {
      const viewportHeight =
        typeof window !== "undefined" ? window.visualViewport?.height || window.innerHeight : 760;
      const minHeight = pageMode ? (isPhoneScreen ? 190 : 160) : isPhoneScreen ? 180 : 122;
      const maxHeight = pageMode
        ? Math.max(220, Math.min(isPhoneScreen ? 420 : 340, Math.round(viewportHeight * 0.38)))
        : isPhoneScreen
          ? 360
          : 260;

      editor.style.minHeight = `${minHeight}px`;
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
  }, [body, pageMode, isPhoneScreen]);

  const syncQuoteState = () => {
    const editor = editorRef.current;
    setHasQuoteBlock(Boolean(editor?.querySelector?.("blockquote")));
  };

  const syncEditorState = () => {
    const editor = editorRef.current;
    const cleanHtml = sanitizeComposerHtml(editor?.innerHTML || "");
    const cleanText = getPlainEditorText(editor);

    setBody(cleanHtml);
    setPlainText(cleanText);
    setHasQuoteBlock(Boolean(editor?.querySelector?.("blockquote")));
    bodyValueRef.current = cleanHtml;
    plainTextValueRef.current = cleanText;
    setError("");
  };

  const focusComposerField = () => {
    window.requestAnimationFrame(() => {
      editorRef.current?.focus({ preventScroll: true });
      syncQuoteState();
    });
  };

  const dismissKeyboard = () => {
    editorRef.current?.blur();
    setTextFocused(false);
  };

  const selectCategory = (nextCategory) => {
    if (submittingValueRef.current) return;
    setCategory(nextCategory);
    focusComposerField();
  };

  const applyFormatting = (action) => {
    if (submittingValueRef.current) return;
    const editor = editorRef.current;
    if (!editor || typeof document === "undefined") return;

    editor.focus({ preventScroll: true });

    if (action.command === "formatBlock") {
      const isInQuote = selectionInsideTag(editor, "blockquote");
      document.execCommand("formatBlock", false, isInQuote ? "p" : "blockquote");
    } else {
      document.execCommand(action.command, false, null);
    }

    window.requestAnimationFrame(syncEditorState);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    document.execCommand("insertText", false, text);
    window.requestAnimationFrame(syncEditorState);
  };

  const insertTextNearQuote = (position) => {
    if (submittingValueRef.current) return;

    const editor = editorRef.current;
    const quote = editor?.querySelector?.("blockquote");
    if (!editor || !quote) return;

    const sibling = position === "before" ? quote.previousElementSibling : quote.nextElementSibling;
    let target = isEmptyEditableBlock(sibling) ? sibling : null;

    if (!target) {
      target = document.createElement("p");
      target.appendChild(document.createElement("br"));

      if (position === "before") {
        quote.parentNode?.insertBefore(target, quote);
      } else {
        quote.parentNode?.insertBefore(target, quote.nextSibling);
      }
    }

    editor.focus({ preventScroll: true });
    placeCaretInElement(target);
    window.requestAnimationFrame(syncEditorState);
  };

  const toggleAnonymous = () => {
    if (submittingValueRef.current) return;
    setAnonymous((value) => !value);
  };

  const clearEditor = () => {
    if (editorRef.current) editorRef.current.innerHTML = "";
    setBody("");
    setPlainText("");
    setHasQuoteBlock(false);
    bodyValueRef.current = "";
    plainTextValueRef.current = "";
  };

  const closeComposer = () => {
    if (submittingValueRef.current) return;
    clearEditor();
    setAnonymous(false);
    setError("");
    if (!startOpen) setOpen(false);
  };

  const resetComposer = () => {
    clearEditor();
    setAnonymous(false);
    setError("");
    setOpen(startOpen);
  };

  const submit = async () => {
    if (submittingValueRef.current) return;

    setError("");
    syncEditorState();

    const cleanedText = plainTextValueRef.current.trim();
    const cleanedBody = sanitizeComposerHtml(bodyValueRef.current).trim();

    if (!cleanedText) {
      setError("Write something before publishing.");
      focusComposerField();
      return;
    }

    try {
      setSubmitting(true);
      submittingValueRef.current = true;

      const mod = await moderateAsync(cleanedText);
      if (!mod.allowed) {
        setError(mod.reason || SAFETY_MESSAGE);
        focusComposerField();
        return;
      }

      const result = await createPost({
        body: cleanedBody || cleanedText,
        category: categoryValueRef.current,
        anonymous: anonymousValueRef.current,
      });

      if (result?.ok === false) {
        setError(result.error || "Could not create post. Try again.");
        focusComposerField();
        return;
      }

      resetComposer();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PUBLISH_SCROLL_KEY, "1");
      }
      setFeedCategory?.("All");
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Could not create post. Try again.");
      focusComposerField();
    } finally {
      setSubmitting(false);
      submittingValueRef.current = false;
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
        <Avatar name={currentUser.full_name} color={currentUser.avatar_color} size={46} />

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

  return (
    <div
      className={pageMode
        ? "relative flex flex-col rounded-[30px] border p-4 md:min-h-[520px] md:p-5"
        : "relative rounded-[26px] border p-4"
      }
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <button
        type="button"
        onClick={closeComposer}
        disabled={submitting}
        className="sh-tap absolute right-4 top-4 hidden h-9 w-9 items-center justify-center rounded-full border transition hover:shadow-sm disabled:opacity-50 md:flex"
        style={{ backgroundColor: "#FFFFFF", borderColor: T.border, color: T.textSubtle }}
        aria-label="Close post composer"
        title="Close composer"
      >
        <X size={16} strokeWidth={2.6} />
      </button>

      <div className="mb-3 flex items-center gap-3 pr-0 md:pr-12">
        <Avatar name={composerDisplayName} color={composerDisplayColor} size={46} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-extrabold" style={{ color: T.text }}>
            {composerDisplayName}
          </div>
          <div className="text-sm" style={{ color: T.textSubtle }}>
            Posting to SoldierHub
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
                  className="h-11 shrink-0 rounded-full border px-5 text-sm font-bold transition-all active:scale-[0.98] md:h-10 md:px-4"
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
          <ChevronRight size={22} strokeWidth={2.7} style={{ color: RED }} />
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

        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 md:flex-nowrap">
          {FORMAT_ACTIONS.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.key}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormatting(action)}
                disabled={submitting}
                className="sh-tap inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold transition active:scale-[0.98] disabled:opacity-50 md:h-8 md:px-2.5"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: T.border,
                  color: T.textSubtle,
                  boxShadow: "none",
                }}
                title={action.label}
                aria-label={action.label}
                aria-pressed={false}
              >
                <Icon size={14} strokeWidth={2.4} />
                <span>{action.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isPhoneScreen && hasQuoteBlock && (
        <div className="mb-2 grid grid-cols-2 gap-2 md:hidden" aria-label="Quote placement shortcuts">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertTextNearQuote("before")}
            className="sh-tap rounded-full border px-3 py-2 text-[11px] font-extrabold"
            style={{
              backgroundColor: "rgba(238,243,247,0.92)",
              borderColor: "rgba(63,95,125,0.20)",
              color: T.navy,
            }}
          >
            Text above quote
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertTextNearQuote("after")}
            className="sh-tap rounded-full border px-3 py-2 text-[11px] font-extrabold"
            style={{
              backgroundColor: "rgba(238,243,247,0.92)",
              borderColor: "rgba(63,95,125,0.20)",
              color: T.navy,
            }}
          >
            Text below quote
          </button>
        </div>
      )}

      <div className="relative">
        {textFocused && isPhoneScreen && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={dismissKeyboard}
            className="sh-tap absolute right-0 top-0 z-20 rounded-full border px-3 py-1.5 text-xs font-extrabold shadow-sm backdrop-blur-xl"
            style={{
              backgroundColor: "rgba(255,255,255,0.94)",
              borderColor: "rgba(179,25,66,0.18)",
              color: RED,
              boxShadow: "0 8px 18px rgba(11,28,44,0.08)",
            }}
          >
            Done
          </button>
        )}

        {!plainText && (
          <div
            className="pointer-events-none absolute left-0 top-0 text-[20px] leading-9 md:text-[17px] md:leading-7"
            style={{ color: "#A8ABB2" }}
          >
            Ask a question, share an update, or help the Soldier Hub community...
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable={!submitting}
          suppressContentEditableWarning
          role="textbox"
          aria-label="Write your SoldierHub post"
          aria-multiline="true"
          onFocus={() => {
            setTextFocused(true);
            window.requestAnimationFrame(syncQuoteState);
          }}
          onBlur={() => window.setTimeout(() => setTextFocused(false), 120)}
          onInput={syncEditorState}
          onKeyUp={syncQuoteState}
          onMouseUp={syncQuoteState}
          onPaste={handlePaste}
          className="w-full appearance-none border-0 bg-transparent p-0 text-[20px] leading-9 shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 md:text-[17px] md:leading-7 [&_blockquote]:my-3 [&_blockquote]:rounded-[18px] [&_blockquote]:border-0 [&_blockquote]:bg-[#EEF3F7] [&_blockquote]:px-6 [&_blockquote]:py-3 [&_blockquote]:font-normal [&_blockquote]:text-[#102033] [&_em]:italic [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_strong]:font-extrabold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1"
          style={{ color: T.text, border: "none", boxShadow: "none" }}
        />
      </div>

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
        className="mt-3 rounded-[22px] border px-3 py-3 md:rounded-[18px] md:py-2.5"
        style={{ borderColor: T.borderSoft, backgroundColor: "rgba(248,250,253,0.94)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleAnonymous}
            disabled={submitting}
            className="sh-tap flex min-w-0 flex-1 items-center justify-between gap-3 text-left md:justify-start md:gap-4"
          >
            <div className="min-w-0">
              <div className="text-sm font-extrabold" style={{ color: T.navy }}>
                Post anonymously
              </div>
              <div className="mt-0.5 truncate text-xs" style={{ color: T.textSubtle }}>
                {anonymous ? `Public name: ${composerDisplayName}` : "Your name will be shown publicly"}
              </div>
            </div>

            <span
              className="relative inline-flex h-8 w-[66px] shrink-0 items-center rounded-full border"
              style={{
                borderColor: anonymous ? "rgba(159,18,57,0.18)" : T.border,
                backgroundColor: anonymous ? DARK_RED : "rgba(213,226,242,0.72)",
              }}
            >
              <span className="absolute left-3 text-[9px] font-black" style={{ color: "#FFFFFF", opacity: anonymous ? 1 : 0 }}>
                ON
              </span>
              <span className="absolute right-2.5 text-[9px] font-black" style={{ color: T.textSubtle, opacity: anonymous ? 0 : 1 }}>
                OFF
              </span>
              <span
                className="absolute left-[3px] top-[3px] h-[24px] w-[24px] rounded-full transition-transform duration-200"
                style={{ transform: anonymous ? "translateX(36px)" : "translateX(0)", backgroundColor: "#FFFFFF" }}
              />
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            {canPublish && (
              <button
                type="button"
                onClick={closeComposer}
                disabled={submitting}
                className="sh-tap h-10 shrink-0 rounded-full border px-4 text-xs font-extrabold"
                style={{ backgroundColor: "#FFFFFF", borderColor: T.border, color: T.navy }}
              >
                Clear
              </button>
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={submit}
              disabled={!canPublish || submitting}
              className="hidden rounded-full md:inline-flex md:min-w-[124px]"
            >
              {submitting ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {anonymous && (
        <div
          className="mt-2 rounded-2xl border px-3 py-2.5 text-xs"
          style={{ backgroundColor: "rgba(255,241,245,0.96)", borderColor: "rgba(179,25,66,0.18)", color: DARK_RED }}
        >
          Avoid typing personal details inside the post. Your real name stays hidden publicly.
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:hidden" style={{ borderColor: T.borderSoft }}>
        <div className="text-xs font-medium" style={{ color: T.textSubtle }}>
          {canPublish ? `${plainText.trim().length} characters ready to publish.` : "Write your question or update to enable publishing."}
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={submit}
          disabled={!canPublish || submitting}
          className="w-full rounded-full"
        >
          {submitting ? "Publishing..." : "Publish"}
        </Button>
      </div>
    </div>
  );
}
