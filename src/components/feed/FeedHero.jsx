"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <div className="relative mb-4 overflow-hidden rounded-[24px] border border-[#D8E0EA] bg-[#F8F7F4] px-4 py-4 shadow-sm md:mb-5 md:px-5 md:py-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#E8A020]" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C9D5E3] bg-white px-3 py-1.5 text-xs font-bold text-[#0B1C2C] shadow-sm">
              <MapPin size={14} className="text-[#3F5F7D]" />
              <span>Fort Bliss</span>
              <span className="h-1 w-1 rounded-full bg-[#9AAABD]" />
              <span className="text-[#536579]">El Paso, TX</span>
            </div>
          </div>

          <h1 className="max-w-3xl text-2xl font-black leading-[1.08] tracking-tight text-[#0B1C2C] md:text-[34px]">
            {currentUser ? (
              <>Welcome back, {firstName}.</>
            ) : (
              <>Connect, share, and support the Fort Bliss community.</>
            )}
          </h1>

          <div className="mt-3 h-1 w-16 rounded-full bg-[#E8A020]" />

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#536579] md:text-[15px]">
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

        <div className="hidden shrink-0 rounded-2xl border border-[#DDE5EE] bg-white px-4 py-3 shadow-sm lg:block lg:w-[235px]">
          <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#3F5F7D]">
            Fort Bliss
          </div>
          <div className="mt-1 text-sm font-black text-[#0B1C2C]">
            El Paso, TX
          </div>
          <p className="mt-1 text-xs leading-5 text-[#6B7B8D]">
            Community updates, questions, and local support in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
