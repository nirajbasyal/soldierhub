import { FileText, Loader2, UsersRound } from "lucide-react";
import { T } from "@/lib/theme";

function ProfileStatItem({ icon: Icon, label, value, loading = false, href }) {
  const content = (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-3 min-[420px]:flex-row min-[420px]:gap-2 min-[420px]:px-2 sm:justify-start sm:px-3">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl min-[380px]:h-8 min-[380px]:w-8"
        style={{
          backgroundColor: "rgba(244,248,253,0.96)",
          color: T.navy,
        }}
      >
        <Icon size={15} strokeWidth={2.4} />
      </div>
      <div className="min-w-0 text-center min-[420px]:text-left">
        <div className="text-sm font-black leading-none tabular-nums min-[380px]:text-base" style={{ color: T.navy }}>
          {value}
        </div>
        <div
          className="mt-1 flex items-center justify-center gap-1 truncate text-[9px] font-extrabold uppercase tracking-[0.08em] min-[420px]:justify-start min-[420px]:text-[10px] min-[420px]:tracking-[0.11em]"
          style={{ color: T.textSubtle }}
        >
          {label}
          {loading ? <Loader2 size={10} className="animate-spin" /> : null}
        </div>
      </div>
    </div>
  );

  if (!href) {
    return <div className="min-w-0">{content}</div>;
  }

  return (
    <a
      href={href}
      className="group block min-w-0 text-left transition-colors hover:bg-[#DCE8F7]/70 focus-visible:bg-[#DCE8F7]/70 focus-visible:outline-none"
    >
      <div className="transition-colors group-hover:bg-[#DCE8F7]/70 group-focus-visible:bg-[#DCE8F7]/70">
        {content}
      </div>
    </a>
  );
}

export default function ProfileStats({
  postsCount = 0,
  followersCount = 0,
  followingCount = 0,
  loading = false,
}) {
  return (
    <div
      className="relative z-20 mx-3 -mt-7 grid grid-cols-3 overflow-hidden rounded-3xl border sm:mx-5"
      style={{
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "#D5E2F2",
        boxShadow: "0 14px 30px rgba(7,27,51,0.13)",
      }}
    >
      <ProfileStatItem icon={FileText} label="Posts" value={postsCount} />
      <div className="border-l" style={{ borderColor: "#E4EDF7" }}>
        <ProfileStatItem
          icon={UsersRound}
          label="Followers"
          value={followersCount}
          loading={loading}
          href="/profile/connections?tab=followers"
        />
      </div>
      <div className="border-l" style={{ borderColor: "#E4EDF7" }}>
        <ProfileStatItem
          icon={UsersRound}
          label="Following"
          value={followingCount}
          loading={loading}
          href="/profile/connections?tab=following"
        />
      </div>
    </div>
  );
}
