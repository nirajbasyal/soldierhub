"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { T } from "@/lib/theme";

const MODAL_BACKDROP_Z_INDEX = 9000;
const MODAL_CARD_Z_INDEX = 9001;

/**
 * Modal — centered dialog, ESC to close, body scroll lock.
 *
 * Production/mobile-safe behavior:
 * - Uses a React portal so dialogs render directly under document.body instead
 *   of being trapped inside feed cards, transformed parents, or scroll panels.
 * - Uses a high app-level z-index so bottom navigation/header never covers dialogs.
 * - Leaves headroom above the base modal for nested confirmation dialogs such as
 *   the account-creation final review overlay.
 * - Uses dynamic viewport units so mobile browser chrome does not push the card
 *   off-screen.
 * - Restores the previous body overflow value on close instead of blindly
 *   clearing it, so nested dialogs/lightboxes do not leave the page locked.
 */
export default function Modal({
  open,
  onClose,
  children,
  maxWidth = 480,
  ariaLabel = "Dialog",
  ariaLabelledBy,
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    previousFocusRef.current = document.activeElement;

    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("hidden"));

      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const focusTimer = window.setTimeout(() => {
      const preferredTarget = dialogRef.current?.querySelector(
        '[data-modal-autofocus], input:not([disabled]):not([type="hidden"]), button:not([disabled])'
      );
      (preferredTarget || dialogRef.current)?.focus?.();
    }, 0);

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      previousFocusRef.current?.focus?.();
    };
  }, [mounted, open]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="sh-modal-backdrop fixed inset-0 flex min-h-[100dvh] items-center justify-center overflow-y-auto overscroll-contain px-3 py-6 sm:p-4"
      style={{
        zIndex: MODAL_BACKDROP_Z_INDEX,
        backgroundColor: "rgba(11,28,44,0.45)",
        WebkitBackdropFilter: "blur(7px)",
        backdropFilter: "blur(7px)",
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="sh-modal-card relative w-full rounded-2xl border shadow-2xl"
        style={{
          zIndex: MODAL_CARD_Z_INDEX,
          maxWidth,
          maxHeight: "calc(100dvh - 3rem)",
          backgroundColor: T.card,
          borderColor: T.border,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          boxShadow: "0 28px 70px rgba(7,27,51,0.22)",
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
