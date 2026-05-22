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
    return { ok: false, blocked: true };
  }

  if (!uploadResponse.ok) {
    const details = await uploadResponse.text().catch(() => "");
    return {
      ok: false,
      blocked: false,
      error: details
        ? `R2 upload failed: ${uploadResponse.status}. ${details.slice(0, 180)}`
        : `R2 upload failed with status ${uploadResponse.status}.`,
    };
  }

  return { ok: true };
}

async function uploadThroughSoldierHubServer(image, purpose, accessToken) {
  const formData = new FormData();
  formData.append("purpose", purpose);
  formData.append("width", String(image.width || ""));
  formData.append("height", String(image.height || ""));
  formData.append("file", image.file);

  let response;

  try {
    response = await fetch("/api/media/r2-upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
  } catch {
    throw new Error("Could not reach SoldierHub server upload. Please redeploy Vercel and try again.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error || "Server image upload failed.");
  }

  if (!result?.url || !result?.key) {
    throw new Error("Server upload returned invalid image data.");
  }

  return {
    url: result.url,
    key: result.key,
    width: result.width || image.width,
    height: result.height || image.height,
    size: result.size || image.file.size,
  };
}

export async function uploadCompressedImageToR2(image, { purpose = "post" } = {}) {
  if (!image?.file) return null;

  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Please log in again before uploading an image.");

  const signResult = await fetchSignedUploadUrl(image, purpose, accessToken);
  const directUpload = await putFileToR2(signResult.uploadUrl, image.file);

  if (directUpload.ok) {
    return {
      url: signResult.publicUrl,
      key: signResult.key,
      width: image.width,
      height: image.height,
      size: image.file.size,
    };
  }

  return uploadThroughSoldierHubServer(image, purpose, accessToken);
}
