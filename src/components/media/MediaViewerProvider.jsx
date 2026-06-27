"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ImageOff, Loader2, X } from "lucide-react";

const MediaViewerContext = createContext({
  openImage: () => {},
  close: () => {},
});

function getDownloadFileName(url = "") {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").filter(Boolean).pop();
    if (name && name.includes(".")) return name;
  } catch {
    // Keep safe fallback below.
  }

  return "soldierhub-post-image.jpg";
}

function getBestImageUrl(img) {
  if (!img) return "";

  const srcSet = String(img.currentSrc ? "" : img.getAttribute("srcset") || "").trim();
  if (srcSet) {
    const candidates = srcSet
      .split(",")
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter(Boolean);
    if (candidates.length) return candidates[candidates.length - 1];
  }

  return img.currentSrc || img.src || img.getAttribute("src") || "";
}

function getImagePayloadFromButton(button) {
  if (!button) return null;

  const img = button.querySelector("img");
  const url = getBestImageUrl(img);
  if (!url) return null;

  return {
    url,
    alt: img?.getAttribute("alt") || button.getAttribute("aria-label") || "Soldier Hub post image",
    width: Number(img?.getAttribute("width") || img?.naturalWidth || 0) || null,
    height: Number(img?.getAttribute("height") || img?.naturalHeight || 0) || null,
  };
}

function isPostImageButton(target) {
  const element = target instanceof Element ? target : null;
  if (!element) return null;

  return element.closest('button[aria-label="Open post image"], button[aria-label^="Open image:"]');
}

function MediaViewer({ item, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const displayUrl = item?.url || "";
  const fileName = getDownloadFileName(displayUrl);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [displayUrl]);

  if (!displayUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483647] bg-[#03070d] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Soldier Hub image viewer"
    >
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-[2147483647] flex items-center justify-between gap-3 px-3 py-3 sm:px-5" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white shadow-lg backdrop-blur transition hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close image viewer"
        >
          <X size={22} strokeWidth={2.5} />
        </button>

        <a
          href={displayUrl}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/12 px-4 text-sm font-bold text-white shadow-lg backdrop-blur transition hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Open or download image"
        >
          <Download size={18} />
          <span className="hidden sm:inline">Download</span>
        </a>
      </div>

      <button
        type="button"
        className="flex h-full w-full cursor-zoom-out items-center justify-center overflow-auto px-0 pb-5 pt-[76px] text-left overscroll-contain sm:px-4 sm:pb-8"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 76px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        }}
        onClick={onClose}
        aria-label="Close image viewer background"
      >
        <span
          className="relative flex min-h-full w-full items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          {!loaded && !failed ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/85 backdrop-blur">
                <Loader2 size={16} className="animate-spin" /> Loading image
              </span>
            </span>
          ) : null}

          {failed ? (
            <span className="mx-4 flex max-w-sm flex-col items-center justify-center rounded-[28px] border border-white/10 bg-white/10 p-6 text-center shadow-2xl backdrop-blur">
              <ImageOff size={34} className="mb-3 text-white/70" />
              <span className="text-base font-black">Image could not load</span>
              <span className="mt-2 text-sm font-semibold leading-6 text-white/65">Close this viewer and try opening the image again.</span>
            </span>
          ) : (
            <img
              src={displayUrl}
              alt={item?.alt || "Soldier Hub post image"}
              className="mx-auto block max-h-[calc(100dvh-112px)] max-w-full rounded-[18px] object-contain shadow-2xl"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          )}
        </span>
      </button>
    </div>
  );
}

export function useMediaViewer() {
  return useContext(MediaViewerContext);
}

export default function MediaViewerProvider({ children }) {
  const [portalTarget, setPortalTarget] = useState(null);
  const [item, setItem] = useState(null);
  const itemRef = useRef(null);

  const close = useCallback(() => {
    itemRef.current = null;
    setItem(null);
  }, []);

  const openImage = useCallback((payload) => {
    if (!payload?.url) return;
    itemRef.current = payload;
    setItem(payload);
  }, []);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    const handleClickCapture = (event) => {
      const button = isPostImageButton(event.target);
      if (!button) return;

      const payload = getImagePayloadFromButton(button);
      if (!payload?.url) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openImage(payload);
    };

    document.addEventListener("click", handleClickCapture, true);
    return () => document.removeEventListener("click", handleClickCapture, true);
  }, [openImage]);

  useEffect(() => {
    if (!item) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, item]);

  const value = useMemo(() => ({ openImage, close }), [openImage, close]);

  return (
    <MediaViewerContext.Provider value={value}>
      {children}
      {portalTarget && item ? createPortal(<MediaViewer item={item} onClose={close} />, portalTarget) : null}
    </MediaViewerContext.Provider>
  );
}
