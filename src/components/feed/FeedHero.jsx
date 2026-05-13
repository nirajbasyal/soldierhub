"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <div
      className="relative mb-4 overflow-hidden rounded-[26px] border px-4 py-4 shadow-[0_16px_40px_rgba(7,27,51,0.10)] md:mb-5 md:px-6 md:py-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(7,27,51,0.98) 0%, rgba(16,46,82,0.96) 52%, rgba(30,78,140,0.88) 100%)",
        borderColor: "rgba(207,218,232,0.28)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#B31942]/25 blur-3xl" />
        <div className="absolute -bottom-28 left-8 h-56 w-56 rounded-full bg-[#1E4E8C]/45 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(110deg,transparent_0%,transparent_43%,white_43%,white_45%,transparent_45%,transparent_56%,white_56%,white_58%,transparent_58%)]" />
      </div>

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.12] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hero-stars-compact" width="70" height="70" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="14" r="1" fill="white" />
            <circle cx="48" cy="26" r="0.85" fill="white" />
            <circle cx="35" cy="58" r="0.9" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-stars-compact)" />
      </svg>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md">
              <MapPin size={14} className="text-[#F7D6DE]" />
              <span>Fort Bliss</span>
              <span className="h-1 w-1 rounded-full bg-white/45" />
              <span className="text-white/80">El Paso, TX</span>
            </div>
          </div>

          <h1 className="max-w-3xl text-2xl font-black leading-[1.07] tracking-tight text-white drop-shadow-sm md:text-[34px]">
            {currentUser ? (
              <>Welcome back, {firstName}.</>
            ) : (
              <>Connect, share, and support the Fort Bliss community.</>
            )}
          </h1>

          <div className="mt-3 h-1 w-16 rounded-full bg-[#B31942] shadow-[0_0_18px_rgba(179,25,66,0.45)]" />

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/86 md:text-[15px]">
            {currentUser ? (
              <>Catch up on what your community is asking, sharing, and solving today.</>
            ) : (
              <>
                Connect with the Fort Bliss community to ask for help, share tips,
                get recommendations, and support each other.
              </>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Badge tone="rose" icon={TrendingUp}>
              {postCount} active discussions
            </Badge>

            <Badge tone="blue" icon={ShieldCheck}>
              Verified members only
            </Badge>
          </div>
        </div>

        <div className="hidden shrink-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-sm backdrop-blur-md lg:block lg:w-[235px]">
          <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#F7D6DE]">
            Fort Bliss
          </div>
          <div className="mt-1 text-sm font-black text-white">
            El Paso, TX
          </div>
          <p className="mt-1 text-xs leading-5 text-white/75">
            Community updates, questions, and local support in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
