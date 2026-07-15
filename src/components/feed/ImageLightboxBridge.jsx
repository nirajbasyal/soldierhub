"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { T } from "@/lib/theme";

function isPostAttachmentImage(target) {
  if (!(target instanceof HTMLImageElement)) return false;
  if (target.alt !== "Post attachment") return false;
  return Boolean(target.src);
}

export default function ImageLightboxBridge() {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleClick = (event) => {
      const target = event.target;
      if (!isPostAttachmentImage(target)) return;

      event.preventDefault();
      event.stopPropagation();

      setImage({
        src: target.currentSrc || target.src,
        alt: target.alt || "Post image",
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    document.body.style.overflow = image ? "hidden" : "";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setImage(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [image]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col bg-black/88 p-3 backdrop-blur-md md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Expanded post image"
      onClick={() => setImage(null)}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setImage(null);
          }}
          className="sh-tap inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-lg"
          style={{ backgroundColor: "rgba(255,255,255,0.94)", borderColor: T.border, color: T.navy }}
        >
          <X size={18} />
          Close
        </button>

        <a
          href={image.src}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="sh-tap inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-lg"
          style={{ backgroundColor: "rgba(255,255,255,0.94)", borderColor: T.border, color: T.navy }}
        >
          <Download size={18} />
          Download
        </a>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center" onClick={() => setImage(null)}>
        {/* Full-resolution user media must preserve its original URL and dimensions. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.alt}
          className="max-h-full max-w-full rounded-[18px] object-contain shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  );
}
