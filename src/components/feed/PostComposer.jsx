"use client";

import { useEffect, useRef, useState } from "react";
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

function getAnonymousDisplayName(seed) {
  const source = String(seed || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  const number = String(total % 10000).padStart(4, "0");

  return `Anonymous${number}`;
}

export default function PostComposer({ startOpen = false, pageMode = false }) {
  const { currentUser, requireAuth, createPost } = useApp();

  const [open, setOpen] = useState(startOpen);
  const [category, setCategory] = useState("General Q&A");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bodyRef = useRef(null);
  const composerActionsRef = useRef(null);
  const anonymousToggleAtRef = useRef(0);
  const anonymousTouchActiveRef = useRef(false);

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

  const keepComposerKeyboardOpen = () => {
    bodyRef.current?.focus({ preventScroll: true });

    window.requestAnimationFrame(() => {
      bodyRef.current?.focus({ preventScroll: true });
    });

    window.setTimeout(() => {
      bodyRef.current?.focus({ preventScroll: true });
    }, 80);
  };

  const selectCategory = (nextCategory) => {
    if (submitting) return;

    setCategory(nextCategory);
    focusComposerField();
  };

  const toggleAnonymousState = () => {
    const now = Date.now();
    if (now - anonymousToggleAtRef.current < 220) return;
    anonymousToggleAtRef.current = now;

    setAnonymous((value) => !value);
    keepComposerKeyboardOpen();
  };

  const holdComposerFocus = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    bodyRef.current?.focus({ preventScroll: true });
  };

  const handleAnonymousTouchStart = (event) => {
    if (submitting) return;

    anonymousTouchActiveRef.current = true;
    holdComposerFocus(event);
  };

  const handleAnonymousTouchEnd = (event) => {
    if (submitting) return;

    holdComposerFocus(event);
    toggleAnonymousState();

    window.setTimeout(() => {
      anonymousTouchActiveRef.current = false;
    }, 260);
  };

  const handleAnonymousMouseDown = (event) => {
    if (submitting) return;

    holdComposerFocus(event);

    if (anonymousTouchActiveRef.current) return;
    toggleAnonymousState();
  };

  const handleAnonymousClick = (event) => {
    holdComposerFocus(event);
  };

  const closeComposer = () => {
    if (submitting) return;

    if (startOpen) {
      setBody("");
      setAnonymous(false);
      setError("");
      bodyRef.current?.focus({ preventScroll: true });
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
      return setError("Write something before publishing.");
    }

    try {
      setSubmitting(true);

      const mod = await moderateAsync(cleanedBody);

      if (!mod.allowed) {
        setSubmitting(false);
        return setError(mod.reason || SAFETY_MESSAGE);
      }

      const result = await createPost({
        body: cleanedBody,
        category,
        anonymous,
      });

      setSubmitting(false);

      if (result?.ok === false) {
        return setError(result.error || "Could not create post. Try again.");
      }

      resetComposer();
    } catch (err) {
      console.error("Post submit failed:", err);
      setSubmitting(false);
      setError("Could not create post. Try again.");
    }
  };

  if (!currentUser || currentUser.status !== "verified") {
    return (
      <button
        type="button"
        onClick={requireAuth}
        className="w-full rounded-[24px] border p-5 flex items-center gap-3 text-left transition-shadow hover:shadow-sm"
        style={{ backgroundColor: T.card, borderColor: T.border }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
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
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openComposer();
          }
        }}
        className="w-full rounded-[26px] border p-5 md:p-6 flex items-center gap-3.5 text-left transition-all hover:shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: T.card,
          borderColor: T.border,
          "--tw-ring-color": T.navy,
        }}
      >
        <Avatar
          name={currentUser.full_name}
          color={currentUser.avatar_color}
          size={46}
        />

        <div
          className="flex-1 min-w-0 rounded-full border px-4 py-4"
          style={{ backgroundColor: "#F4F8FD", borderColor: T.borderSoft || T.border }}
        >
          <div className="text-[15px] md:text-[16px] truncate font-medium" style={{ color: T.textMuted }}>
            What do you want to ask or share?
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          size="md"
          onClick={(e) => {
            e.stopPropagation();
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
    : "rounded-[26px] border p-4 md:p-5 shadow-sm";
  const textareaClassName = pageMode
    ? "min-h-[44vh] flex-1 w-full resize-none outline-none text-[20px] md:text-[22px] leading-9 border-0 bg-transparent placeholder:text-[#A8ABB2] disabled:opacity-70"
    : "w-full resize-none outline-none text-[17px] md:text-[18px] leading-8 border-0 bg-transparent placeholder:text-[#A8ABB2] disabled:opacity-70";

  return (
    <div
      className={rootClassName}
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
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
            {anonymous
              ? "Posting anonymously to SoldierHub"
              : "Posting to SoldierHub"}
          </div>

          {pageMode && (
            <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]"
              style={{
                backgroundColor: "rgba(244,248,253,0.86)",
                borderColor: T.borderSoft || T.border,
                color: T.textSubtle,
              }}
            >
              Select category
              <span style={{ color: RED }}>below</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={closeComposer}
          disabled={submitting}
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/[0.04] disabled:opacity-50"
          style={{ color: T.textMuted }}
          aria-label={startOpen ? "Clear post composer" : "Close post composer"}
        >
          <X size={18} />
        </button>
      </div>

      <div className="-mx-1 mb-5">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: T.navy }}>
            Category
          </div>
          <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold"
            style={{ backgroundColor: "rgba(220,232,247,0.55)", color: T.textSubtle }}
          >
            Swipe for more
            <ChevronRight size={12} />
          </div>
        </div>

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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCategory(c.key);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      selectCategory(c.key);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                    }}
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
            className="pointer-events-none absolute bottom-1 right-0 top-0 w-14 rounded-r-2xl"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 58%, rgba(255,255,255,1) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.96)",
              borderColor: T.borderSoft || T.border,
              color: RED,
            }}
          >
            <ChevronRight size={15} />
          </div>
        </div>
      </div>

      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setError("");
        }}
        disabled={submitting}
        placeholder="Ask a question, share an update, or help the SoldierHub community..."
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
            Your name will be hidden publicly as {composerDisplayName}. Avoid
            typing details that identify you inside the post.
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
          ref={composerActionsRef}
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
              aria-disabled={submitting}
              tabIndex={0}
              onTouchStart={handleAnonymousTouchStart}
              onTouchEnd={handleAnonymousTouchEnd}
              onMouseDown={handleAnonymousMouseDown}
              onClick={handleAnonymousClick}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  holdComposerFocus(event);
                  toggleAnonymousState();
                }
              }}
              className="relative inline-flex h-9 w-[72px] shrink-0 items-center rounded-full border transition-all duration-200"
              style={{
                borderColor: anonymous ? "rgba(159,18,57,0.18)" : T.border,
                backgroundColor: anonymous ? DARK_RED : "rgba(213,226,242,0.72)",
                opacity: submitting ? 0.6 : 1,
                pointerEvents: submitting ? "none" : "auto",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              aria-label="Toggle anonymous posting"
            >
              <span
                className="absolute left-3 text-[10px] font-black tracking-wide transition-opacity"
                style={{
                  color: "#FFFFFF",
                  opacity: anonymous ? 1 : 0,
                }}
              >
                ON
              </span>
              <span
                className="absolute right-2.5 text-[10px] font-black tracking-wide transition-opacity"
                style={{
                  color: T.textSubtle,
                  opacity: anonymous ? 0 : 1,
                }}
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
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: T.border,
                color: T.navy,
              }}
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
          ref={composerActionsRef}
          className="mt-2 flex items-center justify-between gap-2 border-t pt-3"
          style={{ borderColor: T.borderSoft }}
        >
          <div
            role="switch"
            aria-checked={anonymous}
            aria-disabled={submitting}
            tabIndex={0}
            onTouchStart={handleAnonymousTouchStart}
            onTouchEnd={handleAnonymousTouchEnd}
            onMouseDown={handleAnonymousMouseDown}
            onClick={handleAnonymousClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                holdComposerFocus(event);
                toggleAnonymousState();
              }
            }}
            className="flex cursor-pointer select-none items-center gap-2 text-sm"
            style={{
              color: anonymous ? T.text : T.textMuted,
              opacity: submitting ? 0.6 : 1,
              pointerEvents: submitting ? "none" : "auto",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
            }}
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
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={closeComposer} disabled={submitting}>
              {startOpen ? "Clear" : "Cancel"}
            </Button>

            <Button
              variant="primary"
              onClick={submit}
              icon={Send}
              disabled={submitting || !body.trim()}
            >
              {submitting ? "Checking…" : "Publish"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
