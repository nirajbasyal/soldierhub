"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";

function HeroPill({ icon: Icon, children, tone = "blue" }) {
  const isRed = tone === "red";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold shadow-sm backdrop-blur-sm"
      style={{
        backgroundColor: isRed ? "rgba(179,25,66,0.16)" : "rgba(255,255,255,0.10)",
        borderColor: isRed ? "rgba(179,25,66,0.42)" : "rgba(222,234,248,0.22)",
        color: isRed ? "#FFDDE5" : "#EAF2FC",
      }}
    >
      {Icon ? (
        <Icon
          size={13}
          strokeWidth={2.5}
          style={{ color: isRed ? "#F3A6B8" : "#BFD4EC" }}
        />
      ) : null}
      {children}
    </span>
  );
}

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <section
      className="relative mb-4 overflow-hidden rounded-[26px] border px-4 py-4 shadow-[0_18px_42px_rgba(7,27,51,0.18)] md:mb-5 md:px-5 md:py-5"
      style={{
        backgroundColor: "#0B1C2C",
        borderColor: "rgba(191,212,236,0.22)",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#B31942_0%,#1E4E8C_58%,#DCE8F7_100%)]" />
        <div className="absolute -right-24 -top-28 h-60 w-60 rounded-full bg-[#1E4E8C]/42 blur-3xl" />
        <div className="absolute -left-24 -bottom-32 h-56 w-56 rounded-full bg-[#B31942]/24 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-28 w-1/2 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.06)_100%)]" />
      </div>

      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-[#F8FBFF] shadow-sm backdrop-blur-sm">
            <MapPin size={14} className="text-[#F3A6B8]" />
            <span>Fort Bliss</span>
            <span className="h-1 w-1 rounded-full bg-[#F3A6B8]/75" />
            <span className="text-[#C9D8EA]">El Paso, TX</span>
          </div>
        </div>

        <div className="max-w-4xl">
          <h1 className="text-[25px] font-black leading-[1.06] tracking-tight text-[#F8FBFF] md:text-[36px]">
            {currentUser ? (
              <>Welcome back, {firstName}.</>
            ) : (
              <>Connect, share, and support the Fort Bliss community.</>
            )}
          </h1>

          <div className="mt-3 flex items-center gap-2">
            <div className="h-1 w-12 rounded-full bg-[#B31942]" />
            <div className="h-1 w-8 rounded-full bg-[#DCE8F7]" />
          </div>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D5E2F2] md:text-[15px]">
            {currentUser ? (
              <>Catch up on what your community is asking, sharing, and solving today.</>
            ) : (
              <>
                Connect with the Fort Bliss community to ask for help, share tips,
                get recommendations, and support each other.
              </>
            )}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <HeroPill tone="red" icon={TrendingUp}>
            {postCount} active discussions
          </HeroPill>

          <HeroPill icon={ShieldCheck}>
            Verified members only
          </HeroPill>
        </div>
      </div>
    </section>
  );
}
