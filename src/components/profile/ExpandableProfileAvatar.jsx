/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

export default function ExpandableProfileAvatar({
  name,
  color,
  src,
  size = 76,
  className = "",
  buttonClassName = "",
  title = "Tap to view profile picture",
}) {
  const [open, setOpen] = useState(false);
  const safeName = name || "SoldierHub member";

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${safeName}'s profile picture`}
        title={title}
        className={`group relative inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full outline-none ring-offset-2 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-white ${buttonClassName}`}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Avatar name={safeName} color={color} src={src} size={size} />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-black/0 transition group-hover:bg-black/10 group-active:bg-black/15" />
        <span className="sr-only">Open profile picture viewer</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${safeName}'s profile picture`}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-full w-full max-w-[520px] flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-0 top-0 z-10 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur transition hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-label="Close profile picture viewer"
            >
              <X size={21} strokeWidth={2.5} />
            </button>

            <div className={`mt-12 flex max-h-[72vh] w-full items-center justify-center rounded-[32px] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur sm:mt-6 sm:p-4 ${className}`}>
              {src ? (
                <img
                  src={src}
                  alt={`${safeName}'s profile picture`}
                  className="max-h-[68vh] w-auto max-w-full rounded-[26px] object-contain shadow-2xl"
                />
              ) : (
                <Avatar name={safeName} color={color} size={220} />
              )}
            </div>

            <div className="max-w-full rounded-full bg-white/10 px-4 py-2 text-center text-sm font-bold text-white shadow-lg backdrop-blur">
              {safeName}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
