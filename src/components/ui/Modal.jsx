"use client";
import { useEffect } from "react";
import { T } from "@/lib/theme";

/**
 * Modal — centered dialog, ESC to close, body scroll lock.
 *
 * Mobile-safe behavior:
 * - Uses a very high z-index so bottom navigation/header never covers dialogs.
 * - Uses dynamic viewport units so mobile browser chrome does not push the card
 *   off-screen.
 * - Restores the previous body overflow value on close instead of blindly
 *   clearing it, so nested dialogs/lightboxes do not leave the page locked.
 */
export default function Modal({ open, onClose, children, maxWidth = 480 }) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sh-modal-backdrop fixed inset-0 z-[10000] flex min-h-[100dvh] items-center justify-center overflow-y-auto px-3 py-6 sm:p-4"
      style={{
        backgroundColor: "rgba(11,28,44,0.45)",
        WebkitBackdropFilter: "blur(7px)",
        backdropFilter: "blur(7px)",
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="sh-modal-card relative z-[10001] w-full rounded-2xl border shadow-2xl"
        style={{
          maxWidth,
          maxHeight: "calc(100dvh - 3rem)",
          backgroundColor: T.card,
          borderColor: T.border,
          overflowY: "auto",
          boxShadow: "0 28px 70px rgba(7,27,51,0.22)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
