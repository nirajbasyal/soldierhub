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
  { key: "bold", label: "Bold", shortLabel: "B", icon: Bold },
  { key: "italic", label: "Italic", shortLabel: "I", icon: Italic },
  { key: "bullet", label: "Bullet list", shortLabel: "• List", icon: List },
  { key: "number", label: "Numbered list", shortLabel: "1. List", icon: ListOrdered },
  { key: "quote", label: "Quote", shortLabel: "Quote", icon: Quote },
];

function getAnonymousDisplayName(seed) {
  const source = String(seed || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  return `Anonymous${String(total % 10000).padStart(4, "0")}`;
}

function formatSelectedLines(value, type) {
  const fallback = type === "quote" ? "Important note" : "List item";
  const lines = (value || fallback).split("\n");

  if (type === "bullet") {
    return lines
      .map((line) => {
        const cleaned = line.replace(/^\s*[-*•]\s+/, "").trim();
        return `- ${cleaned || "List item"}`;
      })
      .join("\n");
  }

  if (type === "number") {
    return lines
      .map((line, index) => {
        const cleaned = line.replace(/^\s*\d+[.)]\s+/, "").trim();
        return `${index + 1}. ${cleaned || "List item"}`;
      })
      .join("\n");
  }

  if (type === "quote") {
    return lines
      .map((line) => {
        const cleaned = line.replace(/^\s*>\s?/, "").trim();
        return `> ${cleaned || "Important note"}`;
      })
      .join("\n");
  }

  return value;
}

export default function PostComposer({ startOpen = false, pageMode = false }) {
  const router = useRouter();
  const {
    currentUser,
    requireAuth,
    createPost,
    setCategory: setFeedCategory,
  } = useApp();

  const [open, setOpen] = useState(startOpen);
  const [category, setCategory] = useState("General Q&A");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [textFocused, setTextFocused] = useState(false);
  const [isPhoneScreen, setIsPhoneScreen] = useState(false);

  const bodyRef = useRef(null);
  const bodyValueRef = useRef(body);
  const categoryValueRef = useRef(category);
  const anonymousValueRef = useRef(anonymous);
  const submittingValueRef = useRef(submitting);

  const canPublish = useMemo(() => body.trim().length > 0, [body]);

  useEffect(() => {
    bodyValueRef.current = body;
  }, [body]);

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
        detail: {
          canPublish,
          submitting,
        },
      })
    );
  }, [canPublish, submitting, pageMode]);

  useEffect(() => {
    if (open && !pageMode && bodyRef.current) {
      bodyRef.current.focus();
    }
  }, [open, pageMode]);

  useEffect(() => {
    const textarea = bodyRef.current;
    if (!textarea) return undefined;

    const resizeTextarea = () => {
      const viewportHeight =
        typeof window !== "undefined" ? window.visualViewport?.height || window.innerHeight : 760;
      const minHeight = pageMode ? (isPhoneScreen ? 190 : 160) : isPhoneScreen ? 180 : 122;
      const maxHeight = pageMode
        ? Math.max(220, Math.min(isPhoneScreen ? 420 : 340, Math.round(viewportHeight * 0.38)))
        : isPhoneScreen
          ? 360
          : 260;

      textarea.style.height = "auto";
      textarea.style.minHeight = `${minHeight}px`;
      textarea.style.maxHeight = `${maxHeight}px`;
      textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    };

    resizeTextarea();

    if (typeof window !== "undefined") {
      window.addEventListener("resize", resizeTextarea);
      window.visualViewport?.addEventListener("resize", resizeTextarea);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", resizeTextarea);
        window.visualViewport?.removeEventListener("resize", resizeTextarea);
      }
    };
  }, [body, pageMode, isPhoneScreen]);

  const focusComposerField = () => {
    window.requestAnimationFrame(() => {
      bodyRef.current?.focus({ preventScroll: true });
    });
  };

  const dismissKeyboard = () => {
    bodyRef.current?.blur();
    setTextFocused(false);
  };

  const selectCategory = (nextCategory) => {
    if (submittingValueRef.current) return;
    setCategory(nextCategory);
    focusComposerField();
  };

  const applyFormatting = (formatType) => {
    if (submittingValueRef.current) return;

    const textarea = bodyRef.current;
    const currentBody = bodyValueRef.current || "";
    const start = textarea?.selectionStart ?? currentBody.length;
    const end = textarea?.selectionEnd ?? currentBody.length;
    const selectedText = currentBody.slice(start, end);

    let replacement = selectedText;
    let selectStartOffset = 0;
    let selectEndOffset = 0;

    if (formatType === "bold") {
      const content = selectedText || "bold text";
      replacement = `**${content}**`;
      selectStartOffset = 2;
      selectEndOffset = 2 + content.length;
    } else if (formatType === "italic") {
      const content = selectedText || "italic text";
      replacement = `*${content}*`;
      selectStartOffset = 1;
      selectEndOffset = 1 + content.length;
    } else {
      replacement = formatSelectedLines(selectedText, formatType);
      selectStartOffset = 0;
      selectEndOffset = replacement.length;
    }

    const needsLeadingBreak = start > 0 && currentBody[start - 1] !== "\n" && ["bullet", "number", "quote"].includes(formatType);
    const needsTrailingBreak = end < currentBody.length && currentBody[end] !== "\n" && ["bullet", "number", "quote"].includes(formatType);
    const finalReplacement = `${needsLeadingBreak ? "\n" : ""}${replacement}${needsTrailingBreak ? "\n" : ""}`;
    const finalSelectStartOffset = selectStartOffset + (needsLeadingBreak ? 1 : 0);
    const finalSelectEndOffset = selectEndOffset + (needsLeadingBreak ? 1 : 0);
    const nextBody = `${currentBody.slice(0, start)}${finalReplacement}${currentBody.slice(end)}`;

    setBody(nextBody);
    bodyValueRef.current = nextBody;
    setError("");

    window.requestAnimationFrame(() => {
      const nextTextarea = bodyRef.current;
      if (!nextTextarea) return;
      nextTextarea.focus({ preventScroll: true });
      nextTextarea.setSelectionRange(start + finalSelectStartOffset, start + finalSelectEndOffset);
    });
  };

  const toggleAnonymous = () => {
    if (submittingValueRef.current) return;
    setAnonymous((value) => !value);
  };

  const closeComposer = () => {
    if (submittingValueRef.current) return;

    if (startOpen) {
      setBody("");
      setAnonymous(false);
      setError("");
      return;
    }

    setOpen(false);
  };

  const resetComposer = () => {
    setBody("");
    setAnonymous(false);
    setError("");
    setOpen(startOpen);
  };

  const submit = async () => {
    if (submittingValueRef.current) return;

    setError("");

    const cleanedBody = bodyValueRef.current.trim();

    if (!cleanedBody) {
      setError("Write something before publishing.");
      focusComposerField();
      return;
    }

    try {
      setSubmitting(true);
      submittingValueRef.current = true;

      const mod = await moderateAsync(cleanedBody);

      if (!mod.allowed) {
        setError(mod.reason || SAFETY_MESSAGE);
        focusComposerField();
        return;
      }

      const result = await createPost({
        body: cleanedBody,
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

    const handleExternalSubmit = () => {
      submit();
    };

    window.addEventListener(COMPOSE_SUBMIT_EVENT, handleExternalSubmit);

    return () => {
      window.removeEventListener(COMPOSE_SUBMIT_EVENT, handleExternalSubmit);
    };
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
        ? "flex flex-col rounded-[30px] border p-4 md:min-h-[520px] md:p-5"
        : "rounded-[26px] border p-4"
      }
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="mb-3 flex items-center gap-3">
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
        style={{ backgroundColor: "rgba(244,248,253,0.78)", borderColor: T.borderSoft }}
        aria-label="Post formatting toolbar"
      >
        <span className="hidden shrink-0 pl-1 text-[11px] font-extrabold uppercase tracking-[0.12em] md:inline" style={{ color: T.textSubtle }}>
          Format
        </span>

        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 md:flex-nowrap">
          {FORMAT_ACTIONS.map(({ key, label, shortLabel, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => applyFormatting(key)}
              disabled={submitting}
              className="sh-tap inline-flex h-9 items-center gap-1.5 rounded-full border bg-white px-3 text-xs font-extrabold transition active:scale-[0.98] disabled:opacity-50 md:h-8 md:px-2.5"
              style={{ borderColor: T.border, color: T.navy }}
              title={label}
              aria-label={label}
            >
              <Icon size={14} strokeWidth={2.4} />
              <span>{shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

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

        <textarea
          ref={bodyRef}
          value={body}
          onFocus={() => setTextFocused(true)}
          onBlur={() => window.setTimeout(() => setTextFocused(false), 120)}
          onChange={(event) => {
            setBody(event.target.value);
            setError("");
          }}
          disabled={submitting}
          placeholder="Ask a question, share an update, or help the Soldier Hub community..."
          rows={5}
          className="w-full resize-none appearance-none border-0 bg-transparent p-0 text-[20px] leading-9 shadow-none outline-none ring-0 placeholder:text-[#A8ABB2] focus:border-0 focus:outline-none focus:ring-0 disabled:opacity-70 md:text-[17px] md:leading-7"
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
        style={{
          borderColor: T.borderSoft,
          backgroundColor: "rgba(248,250,253,0.94)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleAnonymous}
            disabled={submitting}
            className="sh-tap flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
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
              <span
                className="absolute left-3 text-[9px] font-black"
                style={{ color: "#FFFFFF", opacity: anonymous ? 1 : 0 }}
              >
                ON
              </span>

              <span
                className="absolute right-2.5 text-[9px] font-black"
                style={{ color: T.textSubtle, opacity: anonymous ? 0 : 1 }}
              >
                OFF
              </span>

              <span
                className="absolute left-[3px] top-[3px] h-[24px] w-[24px] rounded-full transition-transform duration-200"
                style={{
                  transform: anonymous ? "translateX(36px)" : "translateX(0)",
                  backgroundColor: "#FFFFFF",
                }}
              />
            </span>
          </button>

          {body.trim() && (
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
        </div>
      </div>

      {anonymous && (
        <div
          className="mt-2 rounded-2xl border px-3 py-2.5 text-xs"
          style={{
            backgroundColor: "rgba(255,241,245,0.96)",
            borderColor: "rgba(179,25,66,0.18)",
            color: DARK_RED,
          }}
        >
          Avoid typing personal details inside the post. Your real name stays hidden publicly.
        </div>
      )}

      <div
        className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between md:justify-end md:pt-3"
        style={{ borderColor: T.borderSoft }}
      >
        <div className="text-xs font-medium md:hidden" style={{ color: T.textSubtle }}>
          {canPublish
            ? `${body.trim().length} characters ready to publish.`
            : "Write your question or update to enable publishing."}
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={submit}
          disabled={!canPublish || submitting}
          className="w-full rounded-full sm:w-auto md:min-w-[132px]"
        >
          {submitting ? "Publishing..." : "Publish"}
        </Button>
      </div>
    </div>
  );
}
