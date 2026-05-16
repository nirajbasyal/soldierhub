"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, Pencil, Plus } from "lucide-react";
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

function getAnonymousDisplayName(seed) {
  const source = String(seed || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  return `Anonymous${String(total % 10000).padStart(4, "0")}`;
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
      const minHeight = pageMode ? 190 : 180;
      const maxHeight = pageMode
        ? Math.max(240, Math.min(420, Math.round(viewportHeight * 0.38)))
        : 360;

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
  }, [body, pageMode]);

  const focusComposerField = () => {
    window.requestAnimationFrame(() => {
      bodyRef.current?.focus({ preventScroll: true });
    });
  };

  const selectCategory = (nextCategory) => {
    if (submittingValueRef.current) return;
    setCategory(nextCategory);
    focusComposerField();
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
        ? "flex flex-col rounded-[30px] border p-4 md:min-h-[620px] md:p-6"
        : "rounded-[26px] border p-4"
      }
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={composerDisplayName} color={composerDisplayColor} size={46} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-extrabold" style={{ color: T.text }}>
            {composerDisplayName}
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>
            {body.length.toLocaleString()} characters
          </div>
        </div>
      </div>

      <div className="relative -mx-1 mb-4">
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
                  className="h-11 shrink-0 rounded-full border px-5 text-sm font-bold transition-all active:scale-[0.98]"
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

      <textarea
        ref={bodyRef}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setError("");
        }}
        disabled={submitting}
        placeholder="Ask a question, share an update, or help the Soldier Hub community..."
        rows={6}
        className="w-full resize-none appearance-none border-0 bg-transparent p-0 text-[20px] leading-9 shadow-none outline-none ring-0 placeholder:text-[#A8ABB2] focus:border-0 focus:outline-none focus:ring-0 disabled:opacity-70"
        style={{ color: T.text, border: "none", boxShadow: "none" }}
      />

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
        className="mt-3 rounded-[22px] border px-3 py-3"
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
    </div>
  );
}
