"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { T } from "@/lib/theme";

/**
 * Modal — centered dialog, ESC to close, body scroll lock.
 *
 * Production/mobile-safe behavior:
 * - Uses a React portal so dialogs render directly under document.body instead
 *   of being trapped inside feed cards, transformed parents, or scroll panels.
 * - Uses a very high z-index so bottom navigation/header never covers dialogs.
 * - Uses dynamic viewport units so mobile browser chrome does not push the card
 *   off-screen.
 * - Restores the previous body overflow value on close instead of blindly
 *   clearing it, so nested dialogs/lightboxes do not leave the page locked.
 */
export default function Modal({ open, onClose, children, maxWidth = 480 }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [open, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="sh-modal-backdrop fixed inset-0 flex min-h-[100dvh] items-center justify-center overflow-y-auto overscroll-contain px-3 py-6 sm:p-4"
      style={{
        zIndex: 2147483000,
        backgroundColor: "rgba(11,28,44,0.45)",
        WebkitBackdropFilter: "blur(7px)",
        backdropFilter: "blur(7px)",
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="sh-modal-card relative w-full rounded-2xl border shadow-2xl"
        style={{
          zIndex: 2147483001,
          maxWidth,
          maxHeight: "calc(100dvh - 3rem)",
          backgroundColor: T.card,
          borderColor: T.border,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          boxShadow: "0 28px 70px rgba(7,27,51,0.22)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
