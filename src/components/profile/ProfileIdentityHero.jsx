import { Shield } from "lucide-react";
import ExpandableProfileAvatar from "@/components/profile/ExpandableProfileAvatar";
import ProfileVerifiedBadge from "@/components/profile/ProfileVerifiedBadge";

function AdminPill() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-extrabold"
      style={{
        backgroundColor: "rgba(232,160,32,0.18)",
        borderColor: "rgba(232,160,32,0.42)",
        color: "#F4D88E",
      }}
    >
      <Shield size={12} />
      Admin
    </span>
  );
}

function limitBio(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "Add a short bio so other verified community members know who you are.";
  return text.length > 150 ? `${text.slice(0, 150).trim()}…` : text;
}

export default function ProfileIdentityHero({
  displayName,
  displayBio,
  displayColor,
  avatarUrl,
  isVerified,
  isAdmin,
}) {
  return (
    <div
      className="relative min-h-[170px] overflow-visible px-4 pb-12 pt-5 min-[560px]:min-h-[164px] min-[560px]:px-6 min-[560px]:pb-12 min-[560px]:pt-6"
      style={{
        background:
          "radial-gradient(circle at 88% 43%, rgba(255,255,255,0.13), transparent 22%), radial-gradient(circle at 88% 43%, transparent 0 16%, rgba(255,255,255,0.15) 16.3% 16.9%, transparent 17.2% 100%), linear-gradient(135deg, #071B33 0%, #102E52 100%)",
      }}
    >
      <div className="relative z-30 flex min-w-0 items-start gap-3.5 min-[560px]:gap-4">
        <ExpandableProfileAvatar
          name={displayName}
          color={displayColor}
          src={avatarUrl}
          size={76}
          buttonClassName="shadow-[0_12px_28px_rgba(0,0,0,0.24)] ring-offset-[#071B33] hover:scale-[1.03]"
        />

        <div className="min-w-0 flex-1 pt-1 text-left">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <h1 className="flex min-w-0 items-start gap-1.5 text-2xl font-black tracking-[-0.04em] leading-tight text-white sm:text-3xl" title={displayName}>
              <span className="min-w-0 truncate">{displayName}</span>
              {isVerified ? <ProfileVerifiedBadge className="mt-1 sm:mt-1.5" /> : null}
            </h1>

            {isAdmin ? <AdminPill /> : null}
          </div>

          <p className="mt-1.5 line-clamp-3 max-w-xl break-words text-sm leading-6 text-white">
            {limitBio(displayBio)}
          </p>
        </div>
      </div>
    </div>
  );
}
