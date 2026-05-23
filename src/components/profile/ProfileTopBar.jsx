import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { T } from "@/lib/theme";

export default function ProfileTopBar({ onSignOut }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition hover:-translate-y-0.5 sm:gap-2 sm:px-4"
        style={{
          backgroundColor: "rgba(255,255,255,0.88)",
          borderColor: "#D5E2F2",
          color: T.navy,
          boxShadow: "0 10px 22px rgba(7,27,51,0.06)",
        }}
        aria-label="Back to feed"
      >
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Back to feed</span>
      </Link>

      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition hover:-translate-y-0.5 sm:px-4"
        style={{
          backgroundColor: "rgba(255,255,255,0.88)",
          borderColor: "#D5E2F2",
          color: T.textMuted,
          boxShadow: "0 10px 22px rgba(7,27,51,0.06)",
        }}
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
}
