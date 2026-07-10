"use client";

import { useRef, useState } from "react";
import { Camera, Images, X } from "lucide-react";
import { T } from "@/lib/theme";

export default function ComposerImagePicker({ imageInputRef, onImageSelected }) {
  const [open, setOpen] = useState(false);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const selectFromGallery = () => {
    setOpen(false);
    galleryInputRef.current?.click();
  };

  const takePhoto = () => {
    setOpen(false);
    cameraInputRef.current?.click();
  };

  return (
    <>
      <button
        ref={imageInputRef}
        type="button"
        className="hidden"
        onClick={() => setOpen(true)}
        aria-hidden="true"
        tabIndex={-1}
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onImageSelected}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={onImageSelected}
      />

      {open ? (
        <div
          className="fixed inset-0 z-[10020] flex items-end justify-center bg-slate-950/45 px-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="composer-photo-source-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[26px] border p-4 shadow-2xl"
            style={{ backgroundColor: "#FFFFFF", borderColor: T.borderSoft }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="composer-photo-source-title" className="text-lg font-black" style={{ color: T.navy }}>
                  Add a photo
                </h2>
                <p className="mt-0.5 text-xs font-medium" style={{ color: T.textMuted }}>
                  Choose your camera or photo gallery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="sh-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                style={{ backgroundColor: "#F8FAFD", borderColor: T.borderSoft, color: T.textMuted }}
                aria-label="Close photo options"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={takePhoto}
                className="sh-tap flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-[22px] border px-3 text-center"
                style={{ backgroundColor: "#F7FAFE", borderColor: T.border, color: T.navy }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(30,78,140,0.10)", color: T.blue }}>
                  <Camera size={24} strokeWidth={2.35} />
                </span>
                <span className="text-sm font-extrabold">Camera</span>
              </button>

              <button
                type="button"
                onClick={selectFromGallery}
                className="sh-tap flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-[22px] border px-3 text-center"
                style={{ backgroundColor: "#FFF8FA", borderColor: "rgba(179,25,66,0.18)", color: T.navy }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(179,25,66,0.09)", color: T.red }}>
                  <Images size={24} strokeWidth={2.35} />
                </span>
                <span className="text-sm font-extrabold">Gallery</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
