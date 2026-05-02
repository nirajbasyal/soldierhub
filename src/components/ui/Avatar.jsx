/* eslint-disable @next/next/no-img-element */
"use client";

import { colorFromString, getInitials } from "@/lib/helpers";

export default function Avatar({ name, color, size = 36, src }) {
  const safeName = name || "User";
  const bg = color || colorFromString(safeName);

  const styles = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={safeName}
        style={styles}
        className="rounded-full object-cover border shrink-0"
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-medium text-white tracking-wide select-none shrink-0"
      style={{ ...styles, backgroundColor: bg, fontSize: size * 0.36 }}
    >
      {getInitials(safeName)}
    </div>
  );
}