import { Shield } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
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
      className="relative min-h-[188px] overflow-hidden px-4 pb-14 pt-5 text-center min-[560px]:min-h-[170px] min-[560px]:px-6 min-[560px]:pb-12 min-[560px]:pt-6 min-[560px]:text-left"
      style={{
        background:
          "radial-gradient(circle at 88% 43%, rgba(255,255,255,0.13), transparent 22%), radial-gradient(circle at 88% 43%, transparent 0 16%, rgba(255,255,255,0.15) 16.3% 16.9%, transparent 17.2% 100%), linear-gradient(135deg, #071B33 0%, #102E52 100%)",
      }}
    >
      <div className="relative z-10 flex min-w-0 flex-col items-center gap-3 min-[560px]:flex-row min-[560px]:items-start min-[560px]:gap-4">
        <div className="shrink-0 rounded-full border-2 border-[#F8F7F4]/75 shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
          <Avatar name={displayName} color={displayColor} src={avatarUrl} size={76} />
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/62">
            Your profile
          </div>

          {isAdmin ? (
            <div className="mt-1.5 flex justify-center min-[560px]:justify-start">
              <AdminPill />
            </div>
          ) : null}

          <h1 className="mt-1.5 flex min-w-0 items-start justify-center gap-1.5 text-2xl font-black tracking-[-0.04em] text-white min-[560px]:justify-start sm:text-3xl" title={displayName}>
            <span className="min-w-0 truncate">{displayName}</span>
            {isVerified ? <ProfileVerifiedBadge className="mt-1 sm:mt-1.5" /> : null}
          </h1>

          <p className="mx-auto mt-1 max-w-xl break-words text-sm leading-6 text-white/82 min-[560px]:mx-0">
            {displayBio || "Add a short bio so other verified community members know who you are."}
          </p>
        </div>
      </div>
    </div>
  );
}
