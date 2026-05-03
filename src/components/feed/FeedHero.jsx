"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import { T } from "@/lib/theme";
import Badge from "@/components/ui/Badge";

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <div
      className="rounded-2xl border p-6 md:p-9 mb-5 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navy90} 100%)`,
        borderColor: T.navy,
      }}
    >
      {/* decorative grain */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grain"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="white" />
            <circle cx="40" cy="20" r="0.5" fill="white" />
            <circle cx="60" cy="60" r="1" fill="white" />
            <circle cx="20" cy="50" r="0.5" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grain)" />
      </svg>

      <div className="relative">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
          style={{
            backgroundColor: "rgba(176,125,44,0.18)",
            border: `1px solid ${T.gold}`,
          }}
        >
          <MapPin size={12} style={{ color: T.goldSoft }} />
          <span
            className="text-xs font-medium tracking-wider uppercase"
            style={{ color: T.goldSoft }}
          >
            Fort Bliss · El Paso, TX
          </span>
        </div>

        <h1
          className="text-2xl md:text-4xl leading-[1.08] max-w-2xl font-serif"
          style={{ color: "#fff" }}
        >
          {currentUser ? (
            <>Welcome back, {firstName}.</>
          ) : (
            <>Connect, share, and support the Fort Bliss community.</>
          )}
        </h1>

        <p
          className="mt-4 text-[16px] md:text-[17px] leading-relaxed max-w-2xl"
          style={{ color: "rgba(255,255,255,0.82)" }}
        >
          {currentUser ? (
            <>Catch up on what your community is asking and sharing today.</>
          ) : (
            <>
              Connect with the Fort Bliss community to ask for help, share tips,
              get recommendations, and support each other. Find guidance on
              housing, PCS moves, local services, daily questions, or anything
              else soldiers and families may need around Fort Bliss.
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2.5 mt-6">
          <Badge tone="amber" icon={TrendingUp}>
            {postCount} active discussions
          </Badge>

          <Badge tone="green" icon={ShieldCheck}>
            Verified members only
          </Badge>
        </div>
      </div>
    </div>
  );
}
