"use client";

import { MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import { T } from "@/lib/theme";

function HeroPill({ icon: Icon, children, tone = "blue" }) {
  const isRed = tone === "red";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold shadow-sm md:gap-2 md:px-4 md:py-2 md:text-sm"
      style={{
        backgroundColor: isRed ? "rgba(179,25,66,0.07)" : "rgba(30,78,140,0.065)",
        borderColor: isRed ? "rgba(179,25,66,0.18)" : "rgba(30,78,140,0.16)",
        color: isRed ? T.brandRed : T.brandBlue,
      }}
    >
      {Icon ? <Icon size={14} className="md:h-4 md:w-4" strokeWidth={2.5} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function ElPasoDesertIllustration() {
  return (
    <svg
      viewBox="0 0 520 330"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="desertSun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD98A" />
          <stop offset="100%" stopColor="#F4B45E" />
        </linearGradient>
        <linearGradient id="desertMesaRear" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6B3A3" />
          <stop offset="100%" stopColor="#DF7B6D" />
        </linearGradient>
        <linearGradient id="desertMesaFront" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E99A7A" />
          <stop offset="100%" stopColor="#C85B4A" />
        </linearGradient>
        <linearGradient id="sandFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8D9B5" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#FFF8F1" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="desertFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="18%" stopColor="#FFFFFF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g opacity="0.52" fill="#F2B77F">
        <path d="M86 58c12-14 35-14 47 0 9-8 25-7 32 3 9 0 16 6 17 14H72c1-8 7-14 14-17Z" />
        <path d="M306 101c9-10 25-10 34 0 7-6 19-5 24 3 7 0 12 4 13 10h-82c1-6 5-11 11-13Z" />
      </g>

      <circle cx="300" cy="155" r="47" fill="url(#desertSun)" opacity="0.92" />

      <path d="M30 211 111 163 169 196 227 145 284 181 350 132 424 170 505 124 520 240H0Z" fill="url(#desertMesaRear)" opacity="0.77" />
      <path d="M0 242 72 205 135 224 210 177 277 221 352 180 426 219 520 174V276H0Z" fill="url(#desertMesaFront)" opacity="0.84" />
      <path d="M0 257c91-35 183-8 257-15 104-10 168-42 263-13v101H0Z" fill="url(#sandFade)" />

      <g fill="#46533F">
        <rect x="391" y="86" width="24" height="154" rx="12" />
        <rect x="366" y="121" width="14" height="72" rx="7" />
        <rect x="422" y="117" width="14" height="73" rx="7" />
        <rect x="369" y="148" width="36" height="14" rx="7" />
        <rect x="405" y="151" width="28" height="14" rx="7" />

        <rect x="255" y="183" width="12" height="74" rx="6" />
        <rect x="238" y="198" width="9" height="35" rx="4.5" />
        <rect x="266" y="196" width="9" height="33" rx="4.5" />
        <rect x="242" y="215" width="22" height="9" rx="4.5" />
        <rect x="262" y="211" width="16" height="9" rx="4.5" />

        <rect x="164" y="198" width="10" height="63" rx="5" />
        <rect x="151" y="211" width="8" height="30" rx="4" />
        <rect x="174" y="211" width="8" height="27" rx="4" />
        <rect x="153" y="226" width="20" height="8" rx="4" />
        <rect x="170" y="221" width="14" height="8" rx="4" />
      </g>

      <g fill="#9A4F3F" opacity="0.9">
        <ellipse cx="347" cy="248" rx="21" ry="11" />
        <ellipse cx="444" cy="263" rx="19" ry="10" />
      </g>
      <g fill="#6E7F58" opacity="0.8">
        <path d="M321 271c5-22 9-22 13 0 6-18 10-18 12 2-13 4-20 4-25-2Z" />
        <path d="M467 281c5-19 9-19 12 0 5-15 9-15 11 2-12 3-18 3-23-2Z" />
        <path d="M205 275c5-18 8-18 11 0 5-14 8-14 10 2-10 3-16 3-21-2Z" />
      </g>
      <ellipse cx="457" cy="276" rx="18" ry="10" fill="#C7A58F" opacity="0.85" />
      <rect x="0" y="0" width="520" height="330" fill="url(#desertFade)" />
    </svg>
  );
}

export default function FeedHero({ currentUser, postCount = 0 }) {
  const firstName = currentUser?.full_name?.split(" ")?.[0] || "there";

  return (
    <section
      className="relative mb-0 overflow-hidden rounded-[24px] border px-4 py-4 shadow-[0_10px_26px_rgba(7,27,51,0.055)] md:rounded-[28px] md:px-8 md:py-7 md:shadow-[0_16px_38px_rgba(7,27,51,0.07)]"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(249,251,254,0.985) 100%)",
        borderColor: T.border,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_58%,rgba(248,188,146,0.13),transparent_33%)]" />
      <div className="pointer-events-none absolute bottom-0 right-[-7%] h-[74%] w-[50%] opacity-95 sm:right-0 sm:h-[82%] sm:w-[46%] md:h-[92%] md:w-[48%]">
        <ElPasoDesertIllustration />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-[50%] right-0 bg-gradient-to-r from-white/55 via-white/10 to-transparent sm:left-[48%] md:left-[44%]" />

      <div className="relative z-10">
        <div className="mb-3 flex flex-wrap items-center gap-2 md:mb-5">
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold shadow-sm md:gap-2 md:px-4 md:py-2 md:text-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.9)",
              borderColor: T.borderSoft,
              color: T.brandNavy,
            }}
          >
            <MapPin size={14} className="md:h-4 md:w-4" style={{ color: T.brandRed }} aria-hidden="true" />
            <span>Fort Bliss</span>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "rgba(179,25,66,0.38)" }} />
            <span style={{ color: T.textSecondary }}>El Paso, TX</span>
          </div>
        </div>

        <div className="relative max-w-[72%] sm:max-w-[68%] md:max-w-[64%]">
          <h1 className="text-[25px] font-black leading-[1.05] tracking-[-0.035em] md:text-[40px] md:leading-[1.06]" style={{ color: T.brandNavy }}>
            {currentUser ? (
              <>Welcome back, {firstName}.</>
            ) : (
              <>Connect, share, and support the Fort Bliss community.</>
            )}
          </h1>

          <p className="mt-3 text-[14px] font-medium leading-[1.7] md:mt-5 md:text-[19px] md:leading-[1.65]" style={{ color: T.textSecondary }}>
            {currentUser ? (
              <>Catch up on what your community is asking, sharing, and solving today.</>
            ) : (
              <>
                Connect with the Fort Bliss community to ask for help, share tips,
                get recommendations, and support each other.
              </>
            )}
          </p>

          <p className="mt-3 text-[12px] font-medium leading-[1.7] md:mt-5 md:text-[15px] md:leading-[1.65]" style={{ color: T.textMuted }}>
            Independent, unofficial community platform. No rank-pulling culture — respectful help only.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 md:mt-6 md:gap-3">
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
