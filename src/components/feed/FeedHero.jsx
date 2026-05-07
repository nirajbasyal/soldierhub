"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import { T } from "@/lib/theme";
import Badge from "@/components/ui/Badge";

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <div
      className="rounded-[28px] border p-5 md:p-8 mb-5 relative overflow-hidden sh-card-premium"
      style={{
        background:
          "linear-gradient(135deg, rgba(7,27,51,0.98) 0%, rgba(16,46,82,0.96) 48%, rgba(179,25,66,0.82) 125%)",
        borderColor: "rgba(253,254,255,0.18)",
      }}
    >
      {/* soft patriotic atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#B31942]/25 blur-3xl" />
        <div className="absolute -bottom-28 left-12 h-72 w-72 rounded-full bg-[#1E4E8C]/45 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.10] bg-[linear-gradient(110deg,transparent_0%,transparent_42%,white_42%,white_45%,transparent_45%,transparent_55%,white_55%,white_58%,transparent_58%)]" />
      </div>

      {/* stars */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hero-stars" width="72" height="72" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="14" r="1.2" fill="white" />
            <circle cx="50" cy="28" r="0.9" fill="white" />
            <circle cx="35" cy="60" r="1" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-stars)" />
      </svg>

      <div className="relative grid md:grid-cols-[1fr_280px] gap-7 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[#F3C7D1]/70 bg-[#FDECF0]/95 px-3.5 py-2 text-sm font-semibold shadow-sm mb-5 backdrop-blur-md">
            <MapPin size={14} className="text-[#B31942]" />
            <span className="rounded-full bg-[#B31942] px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.16em] text-white shadow-sm">
              Fort Bliss
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A2338]">
              El Paso, TX
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl leading-[1.03] max-w-2xl font-serif text-white drop-shadow-sm">
            {currentUser ? (
              <>Welcome back, {firstName}.</>
            ) : (
              <>Connect, share, and support the Fort Bliss community.</>
            )}
          </h1>

          <div className="mt-4 h-1.5 w-20 rounded-full bg-gradient-to-r from-[#B31942] via-white to-[#1E4E8C]" />

          <p
            className="mt-5 text-[16px] md:text-[18px] leading-relaxed max-w-2xl font-medium drop-shadow-sm"
            style={{ color: "#FFFFFF" }}
          >
            {currentUser ? (
              <>Catch up on what your community is asking, sharing, and solving today.</>
            ) : (
              <>
                Connect with the Fort Bliss community to ask for help, share tips,
                get recommendations, and support each other.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-7">
            <Badge tone="rose" icon={TrendingUp}>
              {postCount} active discussions
            </Badge>

            <Badge tone="blue" icon={ShieldCheck}>
              Verified members only
            </Badge>
          </div>
        </div>

        <div className="hidden md:block relative h-52">
          <div className="absolute inset-0 rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-sm" />
          <div className="absolute left-8 right-8 bottom-9 h-16 rounded-[100%] bg-white/15 blur-xl" />
          <div className="absolute bottom-8 left-8 right-8 h-16 rounded-t-[60px] bg-[#DCE8F7]/35" />
          <div className="absolute bottom-8 left-20 right-3 h-24 rounded-t-[90px] bg-[#FDECF0]/22" />
          <div className="absolute bottom-8 right-10 h-24 w-28 rounded-t-xl bg-white/75 shadow-xl" />
          <div className="absolute bottom-[104px] right-[76px] h-16 w-1.5 rounded-full bg-white/90" />
          <div className="absolute bottom-[150px] right-[28px] h-9 w-14 rounded-sm bg-[#B31942] shadow-lg" />
          <div className="absolute bottom-[159px] right-[28px] h-2 w-14 bg-white/90" />
          <div className="absolute bottom-[169px] right-[28px] h-2 w-14 bg-white/90" />
          <div className="absolute bottom-[150px] right-[28px] h-9 w-6 bg-[#1E4E8C]" />
          <div className="absolute bottom-8 left-0 right-0 h-10 bg-gradient-to-t from-[#071B33]/60 to-transparent" />
        </div>
      </div>
    </div>
  );
}
