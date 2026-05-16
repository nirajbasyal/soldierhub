"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Lock,
  Pencil,
  Plus,
  Send,
  Sparkles,
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

function getAnonymousDisplayName(seed) {
  const source = String(seed || "anonymous");
  let total = 0;

  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }

  const number = String(total % 10000).padStart(4, "0");
  return `Anonymous${number}`;
}

export default function PostComposer() {
  const { currentUser, requireAuth, createPost } = useApp();

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("General Q&A");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bodyRef = useRef(null);
  const composerActionsRef = useRef(null);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !anonymous || typeof window === "undefined") return undefined;

    const timer = window.setTimeout(() => {
      composerActionsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      bodyRef.current?.focus({ preventScroll: true });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [open, anonymous]);

  const openComposer = () => {
    setError("");
    setOpen(true);
  };

  const closeComposer = () => {
    if (submitting) return;
    setOpen(false);
    setError("");
  };

  const resetComposer = () => {
    setBody("");
    setAnonymous(false);
    setError("");
    setOpen(false);
  };

  const selectCategory = (nextCategory) => {
    if (submitting) return;
    setCategory(nextCategory);
    window.requestAnimationFrame(() => {
      bodyRef.current?.focus({ preventScroll: true });
    });
  };

  const toggleAnonymous = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (submitting) return;

    setAnonymous((value) => !value);
    window.requestAnimationFrame(() => {
      bodyRef.current?.focus({ preventScroll: true });
    });
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
        setSubmitting(false);
        setError(mod.reason || SAFETY_MESSAGE);
        return;
      }

      const result = await createPost({
        body: cleanedBody,
        category,
        anonymous,
      });

      setSubmitting(false);

      if (result?.ok === false) {
        setError(result.error || "Could not create post. Try again.");
        return;
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
        className="relative w-full overflow-hidden rounded-[30px] border p-5 text-left transition-all active:scale-[0.99] hover:-translate-y-0.5"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,241,245,0.96) 45%, rgba(244,248,253,0.98) 100%)",
          borderColor: "rgba(179,25,66,0.34)",
          boxShadow:
            "0 0 0 1px rgba(179,25,66,0.06), 0 22px 55px rgba(179,25,66,0.22), 0 12px 26px rgba(7,27,51,0.08)",
        }}
      >
        <div
          className="absolute inset-x-5 top-0 h-2 rounded-b-full"
          style={{ background: "linear-gradient(90deg, #B31942 0%, #E8A020 52%, #3F5F7D 100%)" }}
        />

        <div className="relative flex items-center gap-3 pt-1">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(179,25,66,0.12)", color: "#B31942" }}
          >
            <Pencil size={19} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-extrabold" style={{ color: T.navy }}>
              <Sparkles size={15} className="shrink-0" style={{ color: "#B31942" }} />
              Share a question or update
            </div>
            <div className="mt-1 text-xs leading-5" style={{ color: T.textSubtle }}>
              Sign in as a verified member to post.
            </div>
          </div>

          <ChevronRight size={17} className="shrink-0" style={{ color: "#B31942" }} />
        </div>
      </button>
    );
  }

  if (!open) {
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
        className="group relative w-full cursor-pointer overflow-hidden rounded-[32px] border p-4 text-left transition-all duration-200 active:scale-[0.99] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 md:p-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(255,238,243,0.98) 42%, rgba(244,248,253,0.99) 100%)",
          borderColor: "rgba(179,25,66,0.38)",
          boxShadow:
            "0 0 0 1px rgba(179,25,66,0.08), 0 28px 68px rgba(179,25,66,0.26), 0 14px 28px rgba(7,27,51,0.09)",
          "--tw-ring-color": "#B31942",
        }}
      >
        <div
          className="absolute inset-x-5 top-0 h-2 rounded-b-full"
          style={{ background: "linear-gradient(90deg, #B31942 0%, #E8A020 52%, #3F5F7D 100%)" }}
        />

        <div
          className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full"
          style={{ backgroundColor: "rgba(179,25,66,0.12)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-8 h-28 w-28 rounded-full"
          style={{ backgroundColor: "rgba(232,160,32,0.12)" }}
        />

        <div className="relative mb-3 flex items-center justify-between gap-2 pt-1">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]"
            style={{
              backgroundColor: "rgba(179,25,66,0.09)",
              borderColor: "rgba(179,25,66,0.2)",
              color: "#B31942",
            }}
          >
            <Sparkles size={13} />
            Start a post
          </div>

          <span className="hidden text-xs font-bold sm:inline" style={{ color: T.textMuted }}>
            Fort Bliss Community
          </span>
        </div>

        <div className="relative flex items-center gap-3 md:gap-3.5">
          <div
            className="rounded-2xl p-1.5 shadow-sm"
            style={{ backgroundColor: "rgba(255,255,255,0.86)" }}
          >
            <Avatar
              name={currentUser.full_name}
              color={currentUser.avatar_color}
              size={44}
            />
          </div>

          <div
            className="min-w-0 flex-1 rounded-[24px] border px-4 py-3.5"
            style={{
              backgroundColor: "rgba(255,255,255,0.92)",
              borderColor: "rgba(179,25,66,0.22)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
            }}
          >
            <div className="truncate text-[15px] font-extrabold md:text-[16px]" style={{ color: T.navy }}>
              What do you want to ask or share?
            </div>
            <div className="mt-1 line-clamp-2 text-xs leading-5" style={{ color: T.textMuted }}>
              Ask a question, share an update, or help another Soldier with a useful tip.
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openComposer();
            }}
            className="hidden shrink-0 items-center gap-2 rounded-full px-4 py-3 text-sm font-extrabold text-white shadow-md transition-all hover:-translate-y-0.5 md:inline-flex"
            style={{ backgroundColor: "#B31942", boxShadow: "0 12px 24px rgba(179,25,66,0.24)" }}
          >
            <Plus size={17} />
            Post
          </button>
        </div>
      </div>
    );
  }

  const composerDisplayName = anonymous
    ? getAnonymousDisplayName(currentUser.id)
    : currentUser.full_name;
  const composerDisplayColor = anonymous ? "#5C6470" : currentUser.avatar_color;

  return (
    <div
      className="relative overflow-hidden rounded-[32px] border p-4 md:p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(255,246,248,0.98) 48%, rgba(255,255,255,0.99) 100%)",
        borderColor: "rgba(179,25,66,0.34)",
        boxShadow:
          "0 0 0 1px rgba(179,25,66,0.07), 0 28px 68px rgba(179,25,66,0.22), 0 14px 28px rgba(7,27,51,0.08)",
      }}
    >
      <div
        className="absolute inset-x-5 top-0 h-2 rounded-b-full"
        style={{ background: "linear-gradient(90deg, #B31942 0%, #E8A020 52%, #3F5F7D 100%)" }}
      />

      <div className="mb-4 flex items-center gap-3 pt-1">
        <Avatar name={composerDisplayName} color={composerDisplayColor} size={38} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate text-sm font-semibold" style={{ color: T.text }}>
            {anonymous && <Lock size={12} strokeWidth={2.5} />}
            <span>{composerDisplayName}</span>
          </div>
          <div className="text-xs" style={{ color: T.textSubtle }}>
            {anonymous ? "Posting anonymously to SoldierHub" : "Posting to SoldierHub"}
          </div>
        </div>

        <button
          type="button"
          onClick={closeComposer}
          disabled={submitting}
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/[0.04] disabled:opacity-50"
          style={{ color: T.textMuted }}
          aria-label="Close post composer"
        >
          <X size={17} />
        </button>
      </div>

      <div className="-mx-1 mb-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 px-1 pb-1">
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
                className="h-8 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-all disabled:opacity-60"
                style={{
                  backgroundColor: active ? s.bg : T.card,
                  color: active ? s.text : T.textMuted,
                  borderColor: active ? s.border : T.border,
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

      <textarea
        ref={bodyRef}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setError("");
        }}
        disabled={submitting}
        placeholder="Ask a question, share an update, or help the Fort Bliss community..."
        rows={5}
        className="w-full resize-none border-0 bg-transparent text-[17px] leading-8 outline-none placeholder:text-[#A8ABB2] disabled:opacity-70 md:text-[18px]"
        style={{ color: T.text }}
      />

      {anonymous && (
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

      <div
        ref={composerActionsRef}
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
          className="flex items-center gap-2 text-sm disabled:opacity-60"
          style={{ color: anonymous ? T.text : T.textMuted }}
        >
          <span
            className="flex h-4 w-4 items-center justify-center rounded border text-[11px] font-bold leading-none"
            style={{
              backgroundColor: anonymous ? T.navy : T.card,
              borderColor: anonymous ? T.navy : T.border,
              color: "#FFFFFF",
            }}
            aria-hidden="true"
          >
            {anonymous ? "✓" : ""}
          </span>
          Post anonymously
        </button>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={closeComposer} disabled={submitting}>
            Cancel
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
    </div>
  );
}
