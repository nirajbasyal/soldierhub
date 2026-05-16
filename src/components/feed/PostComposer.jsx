"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Lock,
  Pencil,
  Plus,
  Send,
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

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.focus();
    }
  }, [open]);

  const focusComposerField = () => {
    window.requestAnimationFrame(() => {
      bodyRef.current?.focus({ preventScroll: true });
    });
  };

  const selectCategory = (nextCategory) => {
    if (submitting) return;
    setCategory(nextCategory);
    focusComposerField();
  };

  const toggleAnonymous = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (submitting) return;

    setAnonymous((value) => !value);
    focusComposerField();
  };

  const closeComposer = () => {
    if (submitting) return;

    if (startOpen) {
      setBody("");
      setAnonymous(false);
      setError("");
      focusComposerField();
      return;
    }

    setOpen(false);
    setError("");
  };

  const resetComposer = () => {
    setBody("");
    setAnonymous(false);
    setError("");
    setOpen(startOpen);
  };

  const submit = async () => {
    if (submitting) return;

    setError("");
    const cleanedBody = body.trim();

    if (!cleanedBody) {
      setError("Write something before publishing.");
      return;
    }

    try {
      setSubmitting(true);

      const mod = await moderateAsync(cleanedBody);
      if (!mod.allowed) {
        setError(mod.reason || SAFETY_MESSAGE);
        return;
      }

      const result = await createPost({
        body: cleanedBody,
        category,
        anonymous,
      });

      if (result?.ok === false) {
        setError(result.error || "Could not create post. Try again.");
        return;
      }

      resetComposer();

      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(PUBLISH_SCROLL_KEY, "1");
        } catch {
          // Ignore storage failures and still return the user to the feed.
        }
      }

      setFeedCategory?.("All");
      router.push("/");
    } catch (err) {
      console.error("Post submit failed:", err);
      setError("Could not create post. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser || currentUser.status !== "verified") {
    return (
      <button
        type="button"
        onClick={requireAuth}
        className="flex w-full items-center gap-3 rounded-[24px] border p-5 text-left transition-shadow hover:shadow-sm"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
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

        <ChevronRight size={16} style={{ color: T.textSubtle }} />
      </button>
    );
  }

  if (!open) {
    const openComposer = () => {
      setError("");
      setOpen(true);
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={openComposer}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openComposer();
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3.5 rounded-[26px] border p-5 text-left transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 md:p-6"
        style={{
          backgroundColor: T.card,
          borderColor: T.border,
          "--tw-ring-color": T.navy,
        }}
      >
        <Avatar name={currentUser.full_name} color={currentUser.avatar_color} size={46} />

        <div
          className="min-w-0 flex-1 rounded-full border px-4 py-4"
          style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft || T.border }}
        >
          <div className="truncate text-[15px] font-medium md:text-[16px]" style={{ color: T.textMuted }}>
            What do you want to ask or share?
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          size="md"
          onClick={(event) => {
            event.stopPropagation();
            openComposer();
          }}
        >
          Post
        </Button>
      </div>
    );
  }

  const composerDisplayName = anonymous
    ? getAnonymousDisplayName(currentUser.id)
    : currentUser.full_name;
  const composerDisplayColor = anonymous ? "#5C6470" : currentUser.avatar_color;

  const rootClassName = pageMode
    ? "flex h-full min-h-[calc(100vh-178px)] flex-col rounded-[30px] border p-4 shadow-sm md:min-h-[620px] md:p-6"
    : "rounded-[26px] border p-4 shadow-sm md:p-5";
  const textareaClassName = pageMode
    ? "min-h-[44vh] flex-1 w-full resize-none border-0 bg-transparent text-[20px] leading-9 outline-none placeholder:text-[#A8ABB2] disabled:opacity-70 md:text-[22px]"
    : "w-full resize-none border-0 bg-transparent text-[17px] leading-8 outline-none placeholder:text-[#A8ABB2] disabled:opacity-70 md:text-[18px]";

  return (
    <div className={rootClassName} style={{ backgroundColor: T.card, borderColor: T.border }}>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={composerDisplayName} color={composerDisplayColor} size={pageMode ? 44 : 38} />

        <div className="min-w-0 flex-1">
          <div
            className="flex items-center gap-1.5 truncate text-base font-extrabold md:text-lg"
            style={{ color: T.text }}
          >
            {anonymous && <Lock size={12} strokeWidth={2.5} />}
            <span className="truncate">{composerDisplayName}</span>
          </div>
          <div className="text-xs md:text-sm" style={{ color: T.textSubtle }}>
            {anonymous ? "Posting anonymously to SoldierHub" : "Posting to SoldierHub"}
          </div>
        </div>

        <button
          type="button"
          onClick={closeComposer}
          disabled={submitting}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-black/[0.04] disabled:opacity-50"
          style={{ color: T.textMuted }}
          aria-label={startOpen ? "Clear post composer" : "Close post composer"}
        >
          <X size={18} />
        </button>
      </div>

      <div className="-mx-1 mb-5">
        <div className="relative">
          <div className="overflow-x-auto no-scrollbar scroll-smooth">
            <div className="flex w-max gap-2 px-1 pb-1 pr-12">
              {CATEGORIES.filter((c) => c.key !== "All").map((c) => {
                const active = c.key === category;
                const s = TONE_STYLES[c.tone];

                return (
                  <button
                    key={c.key}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectCategory(c.key);
                    }}
                    onTouchStart={(event) => {
                      event.preventDefault();
                      selectCategory(c.key);
                    }}
                    onClick={(event) => event.preventDefault()}
                    disabled={submitting}
                    className="h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{
                      backgroundColor: active ? s.bg : "rgba(255,255,255,0.92)",
                      color: active ? s.text : T.textMuted,
                      borderColor: active ? s.border : T.border,
                      boxShadow: active ? "0 8px 18px rgba(11,28,44,0.06)" : "none",
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="pointer-events-none absolute bottom-1 right-0 top-0 w-16 rounded-r-2xl"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 58%, rgba(255,255,255,1) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.98)",
              borderColor: T.borderSoft || T.border,
              color: RED,
            }}
          >
            <ChevronRight size={16} />
          </div>
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
        rows={pageMode ? 10 : 5}
        className={textareaClassName}
        style={{ color: T.text }}
      />

      {anonymous && !pageMode && (
        <div
          className="my-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ backgroundColor: T.goldBg, color: T.gold }}
        >
          <Lock size={14} className="mt-0.5 shrink-0" />
          <span>
            Your name will be hidden publicly as {composerDisplayName}. Avoid typing details that identify you inside the post.
          </span>
        </div>
      )}

      {error && (
        <div
          className="my-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ backgroundColor: T.redBg, color: T.red }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {pageMode ? (
        <div
          className="sticky bottom-[78px] mt-3 rounded-[26px] border p-3.5 shadow-sm backdrop-blur-xl md:bottom-4 md:p-4"
          style={{
            borderColor: T.borderSoft,
            backgroundColor: "rgba(255,255,255,0.96)",
            boxShadow: "0 14px 34px rgba(11,28,44,0.08)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-2">
              <div className="text-sm font-extrabold md:text-[15px]" style={{ color: T.navy }}>
                Post anonymously
              </div>
              <div className="mt-1 text-xs leading-5 md:text-[13px]" style={{ color: T.textSubtle }}>
                Hide your name publicly while still posting safely inside the community.
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={anonymous}
              disabled={submitting}
              onMouseDown={(event) => event.preventDefault()}
              onClick={toggleAnonymous}
              className="relative inline-flex h-9 w-[72px] shrink-0 items-center rounded-full border transition-all duration-200 disabled:opacity-60"
              style={{
                borderColor: anonymous ? "rgba(159,18,57,0.18)" : T.border,
                backgroundColor: anonymous ? DARK_RED : "rgba(213,226,242,0.72)",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              aria-label="Toggle anonymous posting"
            >
              <span
                className="absolute left-3 text-[10px] font-black tracking-wide transition-opacity"
                style={{ color: "#FFFFFF", opacity: anonymous ? 1 : 0 }}
              >
                ON
              </span>
              <span
                className="absolute right-2.5 text-[10px] font-black tracking-wide transition-opacity"
                style={{ color: T.textSubtle, opacity: anonymous ? 0 : 1 }}
              >
                OFF
              </span>
              <span
                className="absolute left-[3px] top-[3px] h-[30px] w-[30px] rounded-full transition-transform duration-200"
                style={{
                  transform: anonymous ? "translateX(36px)" : "translateX(0)",
                  backgroundColor: "#FFFFFF",
                  boxShadow: anonymous
                    ? "0 5px 14px rgba(60,0,18,0.22)"
                    : "0 4px 12px rgba(11,28,44,0.14)",
                }}
              />
            </button>
          </div>

          {anonymous && (
            <div
              className="mt-3 flex items-start gap-2.5 rounded-2xl border px-3 py-2.5"
              style={{
                backgroundColor: "rgba(255,241,245,0.96)",
                borderColor: "rgba(179,25,66,0.18)",
                color: DARK_RED,
              }}
            >
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(179,25,66,0.1)" }}
              >
                <Lock size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold">Anonymous mode is on</div>
                <div className="mt-0.5 text-xs leading-5" style={{ color: "#9F3C55" }}>
                  Your name will show as {composerDisplayName}. Avoid typing personal details inside the post.
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={closeComposer}
              disabled={submitting}
              className="inline-flex h-12 items-center justify-center rounded-full border px-4 text-sm font-bold transition-all active:scale-[0.99] disabled:opacity-60"
              style={{ backgroundColor: "#FFFFFF", borderColor: T.border, color: T.navy }}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={submitting || !body.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-all active:scale-[0.99] disabled:opacity-60"
              style={{
                backgroundColor: RED,
                color: "#FFFFFF",
                boxShadow: "0 10px 22px rgba(179,25,66,0.22)",
              }}
            >
              <Send size={16} />
              {submitting ? "Checking…" : "Publish"}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="mt-2 flex items-center justify-between gap-2 border-t pt-3"
          style={{ borderColor: T.borderSoft }}
        >
          <button
            type="button"
            role="switch"
            aria-checked={anonymous}
            disabled={submitting}
            onMouseDown={(event) => event.preventDefault()}
            onClick={toggleAnonymous}
            className="flex cursor-pointer select-none items-center gap-2 text-sm disabled:opacity-60"
            style={{ color: anonymous ? T.text : T.textMuted }}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold leading-none"
              style={{
                backgroundColor: anonymous ? T.navy : T.card,
                borderColor: anonymous ? T.navy : T.border,
                color: "#FFFFFF",
              }}
              aria-hidden="true"
            >
              {anonymous ? "✓" : ""}
            </span>
            <span className="leading-5">Post anonymously</span>
          </button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={closeComposer} disabled={submitting}>
              {startOpen ? "Clear" : "Cancel"}
            </Button>
            <Button variant="primary" onClick={submit} icon={Send} disabled={submitting || !body.trim()}>
              {submitting ? "Checking…" : "Publish"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
