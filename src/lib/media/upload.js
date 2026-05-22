"use client";

import { createClient } from "@/lib/supabase/client";

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export async function uploadCompressedImageToR2(image, { purpose = "post" } = {}) {
  if (!image?.file) return null;

  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Please log in again before uploading an image.");

  const signResponse = await fetch("/api/media/r2-upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      purpose,
      contentType: image.file.type,
      size: image.file.size,
      width: image.width,
      height: image.height,
    }),
  });

  const signResult = await signResponse.json().catch(() => null);

  if (!signResponse.ok) {
    throw new Error(signResult?.error || "Could not prepare image upload.");
  }

  const uploadResponse = await fetch(signResult.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": image.file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: image.file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Image upload failed. Please check your R2 CORS settings and try again.");
  }

  return {
    url: signResult.publicUrl,
    key: signResult.key,
    width: image.width,
    height: image.height,
    size: image.file.size,
  };
}
