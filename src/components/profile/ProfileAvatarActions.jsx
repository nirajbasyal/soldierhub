import { Camera, Trash2 } from "lucide-react";
import { T } from "@/lib/theme";

export default function ProfileAvatarActions({ hasAvatar, saving, onChoose, onRemove }) {
  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
      <button
        type="button"
        onClick={onChoose}
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: "rgba(244,248,253,0.96)", borderColor: "#D5E2F2", color: T.navy }}
      >
        <Camera size={14} />
        {hasAvatar ? "Change photo" : "Add photo"}
      </button>

      {hasAvatar ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
        >
          <Trash2 size={14} />
          Remove photo
        </button>
      ) : null}
    </div>
  );
}
