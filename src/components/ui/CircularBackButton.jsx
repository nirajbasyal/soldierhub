"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CircularBackButton({ href = "/", label = "Back", className = "" }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-[#D5E2F2] bg-white text-[#0B1C2C] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4E8C]/35 ${className}`}
      aria-label={label}
      title={label}
    >
      <ArrowLeft size={18} />
    </button>
  );
}
