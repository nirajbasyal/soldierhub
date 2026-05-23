import { Edit3 } from "lucide-react";
import { T } from "@/lib/theme";
import ShareProfileButton from "@/components/profile/ShareProfileButton";

export default function ProfileActions({ onEdit, profileId, profileName, pushToast }) {
  return (
    <div className="mx-4 mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:mx-5">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black transition hover:-translate-y-0.5"
        style={{ backgroundColor: T.navy, borderColor: "rgba(7,27,51,0.18)", color: "#FFFFFF" }}
      >
        <Edit3 size={16} />
        Edit profile
      </button>

      <ShareProfileButton
        profileId={profileId}
        profileName={profileName}
        pushToast={pushToast}
        className="w-full justify-center"
      />
    </div>
  );
}
