import { LogOut } from "lucide-react";
import { T } from "@/lib/theme";
import CircularBackButton from "@/components/ui/CircularBackButton";

export default function ProfileTopBar({ onSignOut }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
      <CircularBackButton href="/" label="Back to feed" />

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
