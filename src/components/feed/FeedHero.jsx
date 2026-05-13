"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <div className="relative mb-4 overflow-hidden rounded-[24px] border border-[#CFDAE8] bg-[#FDFEFF] px-4 py-4 shadow-[0_16px_38px_rgba(7,27,51,0.08)] md:mb-5 md:px-5 md:py-5">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#B31942] via-[#1E4E8C] to-[#071B33]" />
        <div className="absolute -right-20 -top-24 h-52 w-52 rounded-full bg-[#1E4E8C]/14 blur-3xl" />
        <div className="absolute -left-24 -bottom-28 h-56 w-56 rounded-full bg-[#B31942]/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(135deg,transparent_0%,rgba(220,232,247,0.42)_100%)]" />
      </div>

      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F2C5D0] bg-[#FDECF0] px-3 py-1.5 text-xs font-extrabold text-[#071B33] shadow-sm">
            <MapPin size={14} className="text-[#B31942]" />
            <span>Fort Bliss</span>
            <span className="h-1 w-1 rounded-full bg-[#B31942]/45" />
            <span className="text-[#43556B]">El Paso, TX</span>
          </div>
        </div>

        <div className="max-w-4xl">
          <h1 className="text-[25px] font-black leading-[1.06] tracking-tight text-[#071B33] md:text-[36px]">
            {currentUser ? (
              <>Welcome back, {firstName}.</>
            ) : (
              <>Connect, share, and support the Fort Bliss community.</>
            )}
          </h1>

          <div className="mt-3 flex items-center gap-2">
            <div className="h-1 w-12 rounded-full bg-[#B31942]" />
            <div className="h-1 w-8 rounded-full bg-[#1E4E8C]" />
          </div>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#43556B] md:text-[15px]">
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
          <Badge tone="rose" icon={TrendingUp}>
            {postCount} active discussions
          </Badge>

          <Badge tone="blue" icon={ShieldCheck}>
            Verified members only
          </Badge>
        </div>
      </div>
    </div>
  );
}
