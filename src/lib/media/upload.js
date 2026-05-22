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

async function fetchSignedUploadUrl(image, purpose, accessToken) {
  let signResponse;

  try {
    signResponse = await fetch("/api/media/r2-upload-url", {
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
  } catch {
    throw new Error("Could not reach SoldierHub upload service. Please redeploy Vercel and try again.");
  }

  const signResult = await signResponse.json().catch(() => null);

  if (!signResponse.ok) {
    throw new Error(signResult?.error || "Could not prepare image upload.");
  }

  if (!signResult?.uploadUrl || !signResult?.publicUrl || !signResult?.key) {
    throw new Error("Upload service returned an invalid R2 upload URL.");
  }

  return signResult;
}

async function putFileToR2(uploadUrl, file) {
  let uploadResponse;

  try {
    uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
  } catch {
    throw new Error(
      "R2 upload was blocked by the browser. Check your Cloudflare R2 CORS policy, wait one minute, then redeploy Vercel."
    );
  }

  if (!uploadResponse.ok) {
    const details = await uploadResponse.text().catch(() => "");
    throw new Error(
      details
        ? `R2 upload failed: ${uploadResponse.status}. ${details.slice(0, 180)}`
        : `R2 upload failed with status ${uploadResponse.status}. Check R2 token permissions and CORS.`
    );
  }
}

export async function uploadCompressedImageToR2(image, { purpose = "post" } = {}) {
  if (!image?.file) return null;

  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Please log in again before uploading an image.");

  const signResult = await fetchSignedUploadUrl(image, purpose, accessToken);
  await putFileToR2(signResult.uploadUrl, image.file);

  return {
    url: signResult.publicUrl,
    key: signResult.key,
    width: image.width,
    height: image.height,
    size: image.file.size,
  };
}
