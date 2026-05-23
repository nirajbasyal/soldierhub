"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import { T } from "@/lib/theme";

function HeroPill({ icon: Icon, children, tone = "blue" }) {
  const isRed = tone === "red";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold shadow-sm"
      style={{
        backgroundColor: isRed ? "rgba(179,25,66,0.08)" : "rgba(30,78,140,0.07)",
        borderColor: isRed ? "rgba(179,25,66,0.16)" : "rgba(30,78,140,0.14)",
        color: isRed ? T.brandRed : T.brandBlue,
      }}
    >
      {Icon ? <Icon size={13} strokeWidth={2.45} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <section
      className="relative mb-0 overflow-hidden rounded-[24px] border px-4 py-4 shadow-[0_14px_34px_rgba(7,27,51,0.075)] md:px-5 md:py-5"
      style={{
        background:
          "linear-gradient(180deg, rgba(253,254,255,0.98) 0%, rgba(247,250,254,0.98) 100%)",
        borderColor: T.border,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#B31942_0%,#1E4E8C_62%,#DCE8F7_100%)]" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-[#DCE8F7]/70 blur-3xl" />

      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold shadow-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.82)",
              borderColor: T.borderSoft,
              color: T.brandNavy,
            }}
          >
            <MapPin size={14} style={{ color: T.brandRed }} aria-hidden="true" />
            <span>Fort Bliss</span>
            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: "rgba(179,25,66,0.45)" }} />
            <span style={{ color: T.textSecondary }}>El Paso, TX</span>
          </div>
        </div>

        <div className="max-w-4xl">
          <h1 className="text-[23px] font-black leading-[1.12] tracking-tight md:text-[32px]" style={{ color: T.brandNavy }}>
            {currentUser ? (
              <>Welcome back, {firstName}.</>
            ) : (
              <>Connect, share, and support the Fort Bliss community.</>
            )}
          </h1>

          <p className="mt-2.5 max-w-3xl text-sm font-semibold leading-6 md:text-[15px]" style={{ color: T.textSecondary }}>
            {currentUser ? (
              <>Catch up on what your community is asking, sharing, and solving today.</>
            ) : (
              <>
                Connect with the Fort Bliss community to ask for help, share tips,
                get recommendations, and support each other.
              </>
            )}
          </p>

          <p className="mt-2 max-w-3xl text-[11px] font-semibold leading-5 md:text-xs" style={{ color: T.textMuted }}>
            Independent, unofficial community platform. No rank-pulling culture — just respectful help from the community.
          </p>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
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
