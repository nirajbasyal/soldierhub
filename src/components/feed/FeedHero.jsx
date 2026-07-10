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

function ElPasoDesertIllustration() {
  return (
    <svg
      viewBox="0 0 560 300"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="desertSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF9F2" />
          <stop offset="100%" stopColor="#FFFDFB" />
        </linearGradient>
        <linearGradient id="desertSun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD99A" />
          <stop offset="100%" stopColor="#F4B86B" />
        </linearGradient>
        <linearGradient id="mesaBack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6C4B4" />
          <stop offset="100%" stopColor="#E89B88" />
        </linearGradient>
        <linearGradient id="mesaFront" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EDB095" />
          <stop offset="100%" stopColor="#D77E67" />
        </linearGradient>
        <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7D8B5" />
          <stop offset="100%" stopColor="#FFF9F2" />
        </linearGradient>
        <linearGradient id="artFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="24%" stopColor="#FFFFFF" stopOpacity="0.86" />
          <stop offset="52%" stopColor="#FFFFFF" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="560" height="300" fill="url(#desertSky)" />

      <g fill="#E9B783" opacity="0.38">
        <path d="M315 52c10-12 28-12 38 0 8-7 21-6 27 2 7 0 13 5 14 12h-92c1-7 6-12 13-14Z" />
        <path d="M439 87c8-9 22-9 30 0 6-5 16-4 21 2 6 0 10 4 11 9h-72c1-5 5-9 10-11Z" />
      </g>

      <circle cx="425" cy="139" r="34" fill="url(#desertSun)" opacity="0.72" />

      <path d="M122 211 208 163 278 197 341 150 400 187 455 151 518 178 560 148V236H122Z" fill="url(#mesaBack)" opacity="0.62" />
      <path d="M91 235 176 199 244 221 325 178 386 218 457 185 520 216 560 193V258H91Z" fill="url(#mesaFront)" opacity="0.68" />
      <path d="M82 245c99-24 186-6 260-10 85-5 145-27 218-13v78H82Z" fill="url(#sand)" opacity="0.88" />

      <g fill="#5C684F" opacity="0.86">
        <rect x="474" y="91" width="19" height="132" rx="9.5" />
        <rect x="452" y="123" width="11" height="58" rx="5.5" />
        <rect x="503" y="119" width="11" height="61" rx="5.5" />
        <rect x="455" y="148" width="31" height="11" rx="5.5" />
        <rect x="485" y="149" width="25" height="11" rx="5.5" />

        <rect x="366" y="176" width="10" height="59" rx="5" />
        <rect x="352" y="188" width="8" height="29" rx="4" />
        <rect x="376" y="187" width="8" height="28" rx="4" />
        <rect x="355" y="204" width="19" height="8" rx="4" />
        <rect x="372" y="200" width="14" height="8" rx="4" />

        <rect x="291" y="194" width="8" height="48" rx="4" />
        <rect x="280" y="203" width="7" height="24" rx="3.5" />
        <rect x="299" y="204" width="7" height="22" rx="3.5" />
        <rect x="283" y="214" width="14" height="7" rx="3.5" />
        <rect x="296" y="211" width="11" height="7" rx="3.5" />
      </g>

      <g fill="#81906B" opacity="0.55">
        <path d="M413 251c4-16 7-16 10 0 4-13 7-13 9 2-9 2-15 2-19-2Z" />
        <path d="M536 259c4-16 7-16 9 0 4-12 7-12 9 2-9 2-14 2-18-2Z" />
      </g>

      <rect width="560" height="300" fill="url(#artFade)" />
    </svg>
  );
}

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <section
      className="relative mb-0 overflow-hidden rounded-[22px] border px-3.5 py-3 shadow-[0_10px_24px_rgba(7,27,51,0.06)] md:rounded-[24px] md:px-5 md:py-5 md:shadow-[0_14px_34px_rgba(7,27,51,0.075)]"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(252,250,247,0.985) 100%)",
        borderColor: T.border,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.46] sm:opacity-[0.5] md:opacity-[0.58]">
        <ElPasoDesertIllustration />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.99)_0%,rgba(255,255,255,0.94)_52%,rgba(255,255,255,0.48)_78%,rgba(255,255,255,0.16)_100%)] md:bg-[linear-gradient(90deg,rgba(255,255,255,0.99)_0%,rgba(255,255,255,0.92)_48%,rgba(255,255,255,0.34)_74%,rgba(255,255,255,0.08)_100%)]" />

      <div className="relative z-10">
        <div className="mb-2 flex flex-wrap items-center gap-2 md:mb-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold shadow-sm md:gap-2 md:px-3 md:py-1.5 md:text-xs"
            style={{
              backgroundColor: "rgba(255,255,255,0.88)",
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
