"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import { T } from "@/lib/theme";

function HeroPill({ icon: Icon, children, tone = "blue" }) {
  const isRed = tone === "red";

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold shadow-sm md:gap-1.5 md:px-3 md:py-1.5 md:text-[11px]"
      style={{
        backgroundColor: isRed ? "rgba(179,25,66,0.08)" : "rgba(30,78,140,0.07)",
        borderColor: isRed ? "rgba(179,25,66,0.16)" : "rgba(30,78,140,0.14)",
        color: isRed ? T.brandRed : T.brandBlue,
      }}
    >
      {Icon ? <Icon size={12} className="md:h-[13px] md:w-[13px]" strokeWidth={2.45} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <section
      className="relative mb-0 overflow-hidden rounded-[22px] border px-3.5 py-3 shadow-[0_10px_24px_rgba(7,27,51,0.06)] md:rounded-[24px] md:px-5 md:py-5 md:shadow-[0_14px_34px_rgba(7,27,51,0.075)]"
      style={{
        background:
          "linear-gradient(180deg, rgba(253,254,255,0.98) 0%, rgba(247,250,254,0.98) 100%)",
        borderColor: T.border,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#B31942_0%,#1E4E8C_62%,#DCE8F7_100%)]" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-44 w-44 rounded-full bg-[#DCE8F7]/65 blur-3xl md:-right-20 md:-top-24 md:h-48 md:w-48" />

      <div className="relative">
        <div className="mb-2 flex flex-wrap items-center gap-2 md:mb-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold shadow-sm md:gap-2 md:px-3 md:py-1.5 md:text-xs"
            style={{
              backgroundColor: "rgba(255,255,255,0.82)",
              borderColor: T.borderSoft,
              color: T.brandNavy,
            }}
          >
            <MapPin size={12} className="md:h-3.5 md:w-3.5" style={{ color: T.brandRed }} aria-hidden="true" />
            <span>Fort Bliss</span>
            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: "rgba(179,25,66,0.45)" }} />
            <span style={{ color: T.textSecondary }}>El Paso, TX</span>
          </div>
        </div>

        <div className="max-w-4xl">
          <h1 className="text-[20px] font-black leading-[1.08] tracking-tight md:text-[32px] md:leading-[1.12]" style={{ color: T.brandNavy }}>
            {currentUser ? (
              <>Welcome back, {firstName}.</>
            ) : (
              <>Connect, share, and support the Fort Bliss community.</>
            )}
          </h1>

          <p className="mt-1.5 max-w-3xl text-[12.5px] font-semibold leading-5 md:mt-2.5 md:text-[15px] md:leading-6" style={{ color: T.textSecondary }}>
            {currentUser ? (
              <>Catch up on what your community is asking, sharing, and solving today.</>
            ) : (
              <>
                Connect with the Fort Bliss community to ask for help, share tips,
                get recommendations, and support each other.
              </>
            )}
          </p>

          <p className="mt-1.5 max-w-3xl text-[10.5px] font-semibold leading-4 md:mt-2 md:text-xs md:leading-5" style={{ color: T.textMuted }}>
            Independent, unofficial community platform. No rank-pulling culture — respectful help only.
          </p>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 md:mt-3.5 md:gap-2">
          <HeroPill tone="red" icon={TrendingUp}>
            {postCount} discussions
          </HeroPill>

          <HeroPill icon={ShieldCheck}>
            Verified members
          </HeroPill>
        </div>
      </div>
    </section>
  );
}
