"use client";

const DEFAULT_AVATAR_OPTIONS = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.82,
  minQuality: 0.62,
  maxBytes: 500 * 1024,
  type: "image/webp",
};

const DEFAULT_POST_OPTIONS = {
  maxWidth: 1400,
  maxHeight: 1400,
  quality: 0.8,
  minQuality: 0.56,
  maxBytes: 1200 * 1024,
  type: "image/webp",
};

const DEFAULT_POST_THUMBNAIL_OPTIONS = {
  maxWidth: 720,
  maxHeight: 720,
  quality: 0.74,
  minQuality: 0.52,
  maxBytes: 320 * 1024,
  type: "image/webp",
  preview: false,
};

const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function assertImageFile(file) {
  if (!file) throw new Error("Choose an image first.");
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, and WebP images are supported.");
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("Image is too large. Please choose an image under 12 MB.");
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };

    image.src = url;
  });
}

function getTargetSize(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Could not compress this image."));
        resolve(blob);
      },
      type,
      quality
    );
  });
}

async function renderCompressedFile({ canvas, file, type, quality, suffix = "" }) {
  const blob = await canvasToBlob(canvas, type, quality);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const safeSuffix = suffix ? `-${suffix}` : "";

  return new File([blob], `${baseName}${safeSuffix}.webp`, {
    type,
    lastModified: Date.now(),
  });
}

async function compressWithinBudget({ canvas, file, type, quality, minQuality, maxBytes, suffix = "" }) {
  let workingQuality = quality;
  let compressedFile = await renderCompressedFile({ canvas, file, type, quality: workingQuality, suffix });

  while (compressedFile.size > maxBytes && workingQuality > minQuality) {
    workingQuality = Math.max(minQuality, Number((workingQuality - 0.08).toFixed(2)));
    compressedFile = await renderCompressedFile({ canvas, file, type, quality: workingQuality, suffix });
  }

  if (compressedFile.size > maxBytes) {
    throw new Error("Image is still too large after compression. Please choose a smaller image.");
  }

  return { file: compressedFile, quality: workingQuality };
}

async function compressLoadedImage(file, sourceImage, options = {}, { suffix = "" } = {}) {
  const config = { ...DEFAULT_POST_OPTIONS, ...options };
  const target = getTargetSize(
    sourceImage.naturalWidth || sourceImage.width,
    sourceImage.naturalHeight || sourceImage.height,
    config.maxWidth,
    config.maxHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Your browser could not prepare this image.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, target.width, target.height);
  context.drawImage(sourceImage, 0, 0, target.width, target.height);

  const { file: compressedFile, quality } = await compressWithinBudget({
    canvas,
    file,
    type: config.type,
    quality: config.quality,
    minQuality: config.minQuality,
    maxBytes: config.maxBytes,
    suffix,
  });

  return {
    file: compressedFile,
    previewUrl: config.preview === false ? null : URL.createObjectURL(compressedFile),
    width: target.width,
    height: target.height,
    size: compressedFile.size,
    originalSize: file.size,
    contentType: config.type,
    quality,
  };
}

export async function compressImage(file, options = {}) {
  assertImageFile(file);

  const image = await loadImageFromFile(file);
  return compressLoadedImage(file, image, options);
}

export function compressAvatarImage(file) {
  return compressImage(file, DEFAULT_AVATAR_OPTIONS);
}

export async function compressPostImage(file) {
  assertImageFile(file);

  const image = await loadImageFromFile(file);
  const optimized = await compressLoadedImage(file, image, DEFAULT_POST_OPTIONS);
  const thumbnail = await compressLoadedImage(file, image, DEFAULT_POST_THUMBNAIL_OPTIONS, {
    suffix: "feed",
  });

  return {
    ...optimized,
    thumbnail,
  };
}

export function revokePreviewUrl(url) {
  if (url) URL.revokeObjectURL(url);
}
