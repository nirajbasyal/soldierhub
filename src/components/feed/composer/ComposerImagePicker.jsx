"use client";

export default function ComposerImagePicker({ imageInputRef, onImageSelected }) {
  return (
    <input
      ref={imageInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={onImageSelected}
    />
  );
}
