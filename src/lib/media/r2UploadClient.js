"use client";

export async function uploadCompressedImageToR2({ file, folder, width, height }) {
  if (!file) throw new Error("Choose an image first.");

  const signResponse = await fetch("/api/uploads/r2/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      contentType: file.type,
      size: file.size,
      width,
      height,
    }),
  });

  const signed = await signResponse.json().catch(() => null);

  if (!signResponse.ok) {
    throw new Error(signed?.error || "Could not prepare image upload.");
  }

  const uploadResponse = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Image upload failed. Please try again.");
  }

  return {
    key: signed.key,
    url: signed.publicUrl,
    width: signed.width || width || null,
    height: signed.height || height || null,
    size: file.size,
    contentType: file.type,
  };
}
