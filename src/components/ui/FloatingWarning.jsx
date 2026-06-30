"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

export default function FloatingWarning({
  message,
  title = "Please revise this",
  className = "",
  bottomOffset = "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMainComposerWarning = title === "Please revise this post";

  if (isMainComposerWarning || !message || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-x-0 flex justify-center px-3"
      style={{ bottom: bottomOffset, zIndex: 2147483647, pointerEvents: "none" }}
    >
      <div
        role="alert"
        aria-live="assertive"
        className={`flex w-full max-w-[680px] items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-extrabold shadow-2xl ${className}`}
        style={{
          backgroundColor: "rgba(253,236,240,0.99)",
          borderColor: "#F3C7D1",
          color: "#B31942",
          pointerEvents: "auto",
          boxShadow: "0 18px 45px rgba(120, 17, 52, 0.20)",
        }}
      >
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.12em]">{title}</div>
          <div className="mt-1 break-words leading-5">{message}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
