"use client";
import { useEffect } from "react";
import { T } from "@/lib/theme";

/**
 * Modal — centered dialog, ESC to close, body scroll lock.
 *
 * Layout: the outer flex wrapper ensures the modal never extends beyond the
 * viewport. The inner card uses max-h-[calc(100vh-2rem)] + overflow-y-auto
 * so even very tall forms (e.g. signup with bio) scroll INSIDE the modal
 * rather than getting cut off at the top/bottom of the viewport.
 */
export default function Modal({ open, onClose, children, maxWidth = 480 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        backgroundColor: "rgba(11,28,44,0.45)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl shadow-2xl border my-auto"
        style={{
          maxWidth,
          maxHeight: "calc(100vh - 2rem)",
          backgroundColor: T.card,
          borderColor: T.border,
          animation: "modalIn 200ms ease-out",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
