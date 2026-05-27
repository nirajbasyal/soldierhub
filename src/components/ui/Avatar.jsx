/* eslint-disable @next/next/no-img-element */
"use client";

import { colorFromString, getInitials } from "@/lib/helpers";

const SIZE_MAP = {
  xs: 30,
  sm: 36,
  md: 42,
  lg: 52,
  xl: 64,
};

function resolveSize(size) {
  if (typeof size === "number" && Number.isFinite(size)) return size;
  if (typeof size === "string") {
    const mapped = SIZE_MAP[size];
    if (mapped) return mapped;

    const parsed = Number(size);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 36;
}

export default function Avatar({ name, color, size = 36, src, avatarUrl, url, className = "" }) {
  const safeName = name || "User";
  const resolvedSize = resolveSize(size);
  const imageSrc = src || avatarUrl || url || null;
  const bg = color || colorFromString(safeName);

  const styles = {
    width: resolvedSize,
    height: resolvedSize,
    minWidth: resolvedSize,
    minHeight: resolvedSize,
  };

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={safeName}
        style={styles}
        className={`rounded-full object-cover border shrink-0 ${className}`.trim()}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-medium text-white tracking-wide select-none shrink-0 ${className}`.trim()}
      style={{ ...styles, backgroundColor: bg, fontSize: resolvedSize * 0.36 }}
    >
      {getInitials(safeName)}
    </div>
  );
}
