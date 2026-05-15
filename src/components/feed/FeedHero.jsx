"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";

function HeroPill({ icon: Icon, children, tone = "blue" }) {
  const isGold = tone === "gold";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold shadow-sm backdrop-blur-sm"
      style={{
        backgroundColor: isGold ? "rgba(232,160,32,0.16)" : "rgba(255,255,255,0.10)",
        borderColor: isGold ? "rgba(232,160,32,0.42)" : "rgba(222,234,248,0.22)",
        color: isGold ? "#FFE7AD" : "#EAF2FC",
      }}
    >
      {Icon ? (
        <Icon
          size={13}
          strokeWidth={2.5}
          style={{ color: isGold ? "#F4C66A" : "#BFD4EC" }}
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
        backgroundColor: "#13263C",
        borderColor: "rgba(191,212,236,0.22)",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#B31942_0%,#E8A020_48%,#BFD4EC_100%)]" />
        <div className="absolute -right-24 -top-28 h-60 w-60 rounded-full bg-[#3F5F7D]/38 blur-3xl" />
        <div className="absolute -left-24 -bottom-32 h-56 w-56 rounded-full bg-[#B31942]/18 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-28 w-1/2 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.06)_100%)]" />
      </div>

      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-[#F8FBFF] shadow-sm backdrop-blur-sm">
            <MapPin size={14} className="text-[#F4C66A]" />
            <span>Fort Bliss</span>
            <span className="h-1 w-1 rounded-full bg-[#F4C66A]/70" />
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
            <div className="h-1 w-12 rounded-full bg-[#F4C66A]" />
            <div className="h-1 w-8 rounded-full bg-[#BFD4EC]" />
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
          <HeroPill tone="gold" icon={TrendingUp}>
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
