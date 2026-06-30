"use client";

import { AlertTriangle } from "lucide-react";

export default function FloatingWarning({
  message,
  title = "Please revise this",
  className = "",
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-extrabold shadow-2xl ${className}`}
      style={{
        backgroundColor: "rgba(253,236,240,0.99)",
        borderColor: "#F3C7D1",
        color: "#B31942",
        boxShadow: "0 18px 45px rgba(120, 17, 52, 0.20)",
      }}
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-[0.12em]">{title}</div>
        <div className="mt-1 break-words leading-5">{message}</div>
      </div>
    </div>
  );
}
