"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Clock3, MapPin, MoonStar, Shirt, Sun } from "lucide-react";
import { T } from "@/lib/theme";

const WEATHER_CACHE_KEY = "soldierhub_fort_bliss_weather_v22";
const OLD_WEATHER_CACHE_KEYS = [
  "soldierhub_fort_bliss_weather_v6",
  "soldierhub_fort_bliss_weather_v7",
  "soldierhub_fort_bliss_weather_v8",
  "soldierhub_fort_bliss_weather_v9",
  "soldierhub_fort_bliss_weather_v10",
  "soldierhub_fort_bliss_weather_v11",
  "soldierhub_fort_bliss_weather_v12",
  "soldierhub_fort_bliss_weather_v13",
  "soldierhub_fort_bliss_weather_v14",
  "soldierhub_fort_bliss_weather_v15",
  "soldierhub_fort_bliss_weather_v16",
  "soldierhub_fort_bliss_weather_v17",
  "soldierhub_fort_bliss_weather_v18",
  "soldierhub_fort_bliss_weather_v19",
  "soldierhub_fort_bliss_weather_v20",
  "soldierhub_fort_bliss_weather_v21",
];

const WEATHER_CACHE_MAX_AGE = 60 * 1000;
const WEATHER_CACHE_STALE_AFTER = 10 * 60 * 1000;

const PT_UNIFORM_RULES = [
  { key: "summer-apfu", min: 61, max: Infinity, title: "Summer APFU", detail: "Short sleeve + shorts" },
  { key: "long-sleeve-shorts", min: 50, max: 60, title: "Long sleeve + shorts", detail: "Long sleeve shirt + shorts" },
  { key: "jacket-shorts", min: 40, max: 49, title: "Jacket + shorts", detail: "Jacket + shorts" },
  { key: "jacket-pants", min: 33, max: 39, title: "Jacket + pants", detail: "Jacket + pants" },
  { key: "jacket-pants-cold-accessories", min: -Infinity, max: 32, title: "Jacket + pants + cold gear", detail: "Jacket, pants, gloves + fleece cap" },
];

function formatElPasoTime(date) {
  if (!date) return "--:--";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatElPasoDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function isElPasoNight(date) {
  if (!date) return false;
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      hour: "numeric",
      hourCycle: "h23",
    }).format(date)
  );
  return hour < 6 || hour >= 19;
}

function getPtUniformRule(tempF) {
  if (typeof tempF !== "number") return null;
  return PT_UNIFORM_RULES.find((rule) => tempF >= rule.min && tempF <= rule.max);
}

function getPtGuidance(tempF, fallback) {
  const current = getPtUniformRule(tempF);
  if (!current) return fallback;

  const currentIndex = PT_UNIFORM_RULES.findIndex((rule) => rule.key === current.key);
  const warmer = currentIndex > 0 ? PT_UNIFORM_RULES[currentIndex - 1] : null;
  const colder = currentIndex >= 0 && currentIndex < PT_UNIFORM_RULES.length - 1 ? PT_UNIFORM_RULES[currentIndex + 1] : null;

  const recommendations = [];

  if (warmer) {
    recommendations.push({ type: "warmer", label: `${warmer.min}°F or warmer`, title: warmer.title, detail: warmer.detail });
  }

  if (colder) {
    recommendations.push({ type: "colder", label: `${colder.max}°F or colder`, title: colder.title, detail: colder.detail });
  }

  return { label: "Current PT Uniform", title: current.title, detail: current.detail, recommendations };
}

function clearOldWeatherCache() {
  try {
    if (typeof window === "undefined") return;
    OLD_WEATHER_CACHE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore localStorage errors.
  }
}

function getCachedWeather() {
  try {
    if (typeof window === "undefined") return null;
    clearOldWeatherCache();

    const cached = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (!parsed?.data || !parsed?.savedAt) return null;

    if (Date.now() - parsed.savedAt > WEATHER_CACHE_STALE_AFTER) {
      window.localStorage.removeItem(WEATHER_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveWeatherToCache(data) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Ignore localStorage errors.
  }
}

function getObservedLabel(weather) {
  const observedAt = weather?.observedAt;
  if (!observedAt) return weather?.checkedAt ? "Updating" : "Checking now";

  const observedTime = new Date(observedAt).getTime();
  if (!Number.isFinite(observedTime)) return "Updating";

  const clock = formatElPasoTime(new Date(observedTime));
  const diffMinutes = Math.max(0, Math.floor((Date.now() - observedTime) / 60000));

  if (diffMinutes < 1) return `Observed ${clock} · just now`;
  if (diffMinutes === 1) return `Observed ${clock} · 1 min ago`;
  if (diffMinutes < 60) return `Observed ${clock} · ${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return `Observed ${clock} · 1 hr ago`;
  return `Observed ${clock} · ${diffHours} hr ago`;
}

function WeatherBackdrop({ night }) {
  if (night) {
    return (
      <svg viewBox="0 0 720 300" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="nightSky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#071A3B" />
            <stop offset="58%" stopColor="#12346B" />
            <stop offset="100%" stopColor="#091A3A" />
          </linearGradient>
          <linearGradient id="nightMesaBack" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3C4D88" />
            <stop offset="100%" stopColor="#1C2F60" />
          </linearGradient>
          <linearGradient id="nightMesaFront" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#233B70" />
            <stop offset="100%" stopColor="#0C214B" />
          </linearGradient>
          <radialGradient id="moonGlow">
            <stop offset="0%" stopColor="#FFF7D6" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#FFF7D6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="720" height="300" fill="url(#nightSky)" />
        <circle cx="612" cy="66" r="54" fill="url(#moonGlow)" />
        <circle cx="612" cy="66" r="22" fill="#FFF4CF" />
        <g fill="#DCE6FF" opacity="0.86">
          <circle cx="310" cy="31" r="1.4" /><circle cx="366" cy="58" r="1.2" /><circle cx="448" cy="27" r="1.5" />
          <circle cx="518" cy="49" r="1.1" /><circle cx="563" cy="24" r="1.3" /><circle cx="668" cy="35" r="1.2" />
          <circle cx="404" cy="92" r="1.1" /><circle cx="539" cy="89" r="1.4" />
        </g>
        <g fill="#6B70A8" opacity="0.45">
          <path d="M535 91c9-11 26-11 35 0 8-7 21-6 27 3 8 0 14 5 15 12h-90c1-7 6-12 13-15Z" />
          <path d="M628 109c8-9 22-9 30 0 6-6 17-5 22 2 6 0 11 4 12 10h-75c1-6 5-10 11-12Z" />
        </g>
        <path d="M235 235 338 159 393 201 462 146 516 184 575 128 638 168 720 111V300H235Z" fill="url(#nightMesaBack)" opacity="0.9" />
        <path d="M174 264 291 201 365 234 442 181 510 224 588 171 650 214 720 174V300H174Z" fill="url(#nightMesaFront)" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 720 300" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="daySky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D9EEFF" />
          <stop offset="58%" stopColor="#9DD3FA" />
          <stop offset="100%" stopColor="#F6FAFF" />
        </linearGradient>
        <linearGradient id="dayMesaBack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#CFE2F2" />
          <stop offset="100%" stopColor="#70A4D3" />
        </linearGradient>
        <linearGradient id="dayMesaFront" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9BC5E2" />
          <stop offset="100%" stopColor="#4C8CBF" />
        </linearGradient>
        <radialGradient id="sunGlow">
          <stop offset="0%" stopColor="#FFF3A9" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#FFF3A9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="720" height="300" fill="url(#daySky)" />
      <circle cx="614" cy="68" r="58" fill="url(#sunGlow)" />
      <circle cx="614" cy="68" r="25" fill="#FFD75B" />
      <g fill="#FFFFFF" opacity="0.8">
        <path d="M465 75c10-12 28-12 38 0 8-7 21-6 27 2 8 0 14 5 15 12h-94c1-7 7-12 14-14Z" />
        <path d="M640 104c9-10 24-10 33 0 7-6 18-5 24 2 7 0 12 4 13 10h-82c1-6 5-10 12-12Z" />
      </g>
      <path d="M220 238 327 162 385 202 455 151 511 186 572 132 638 171 720 118V300H220Z" fill="url(#dayMesaBack)" opacity="0.82" />
      <path d="M165 268 286 206 360 236 438 184 508 226 587 177 651 218 720 179V300H165Z" fill="url(#dayMesaFront)" opacity="0.92" />
    </svg>
  );
}

export default function MobileWeatherStrip() {
  const [now, setNow] = useState(null);
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("loading");
  const [ptOpen, setPtOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    const timer = setInterval(updateTime, 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadWeather({ silent = false } = {}) {
      try {
        if (!silent && !weather) setStatus("loading");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(`/api/weather/fort-bliss?t=${Date.now()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error("Weather request failed");

        const data = await res.json();
        const weatherWithMeta = {
          ...data,
          checkedAt: new Date().toISOString(),
          sourceName: "National Weather Service",
          sourceLabel: "Weather.gov",
        };

        if (alive) {
          setWeather(weatherWithMeta);
          setStatus("ready");
          saveWeatherToCache(weatherWithMeta);
        }
      } catch {
        if (alive) setStatus((currentStatus) => (currentStatus === "ready" ? "ready" : "error"));
      }
    }

    const cached = getCachedWeather();
    if (cached?.data) {
      setWeather({
        ...cached.data,
        checkedAt: cached.data.checkedAt || new Date(cached.savedAt).toISOString(),
        sourceName: cached.data.sourceName || "National Weather Service",
        sourceLabel: cached.data.sourceLabel || "Weather.gov",
      });
      setStatus("ready");
      loadWeather({ silent: true });
    } else {
      loadWeather();
    }

    const refreshTimer = setInterval(() => loadWeather({ silent: true }), WEATHER_CACHE_MAX_AGE);
    return () => {
      alive = false;
      clearInterval(refreshTimer);
    };
  }, []);

  const time = useMemo(() => formatElPasoTime(now), [now]);
  const date = useMemo(() => formatElPasoDate(now), [now]);
  const observedLabel = useMemo(() => getObservedLabel(weather), [weather, now]);
  const night = useMemo(() => isElPasoNight(now), [now]);

  const tempText = typeof weather?.tempF === "number" ? `${weather.tempF}°F` : status === "error" ? "Weather unavailable" : "Checking weather";
  const conditionText = weather?.condition && status !== "error" ? weather.condition : "";
  const feelsLikeText =
    typeof weather?.feelsLikeF === "number" &&
    typeof weather?.tempF === "number" &&
    weather.feelsLikeF !== weather.tempF &&
    status !== "error"
      ? `Feels ${weather.feelsLikeF}°F`
      : "";

  const fallbackPtUniform = weather?.ptUniform || {
    label: "Current PT Uniform",
    title: status === "error" ? "PT Uniform" : "Checking PT guidance",
    detail: status === "error" ? "Weather unavailable — follow local guidance." : "Loading current Fort Bliss temperature.",
    recommendations: [],
  };

  const ptUniform = getPtGuidance(weather?.tempF, fallbackPtUniform);
  const recommendations = Array.isArray(ptUniform.recommendations) ? recommendationsFromGuidance(ptUniform.recommendations) : [];

  const primaryText = night ? "#F8FAFF" : T.navy;
  const secondaryText = night ? "rgba(232,239,255,0.76)" : T.textMuted;
  const subtleText = night ? "rgba(205,218,247,0.56)" : T.textSubtle;
  const accent = night ? "#7E9BFF" : "#0A66C2";
  const ptSurface = night ? "rgba(19,45,88,0.64)" : "rgba(255,255,255,0.72)";
  const ptBorder = night ? "rgba(137,162,224,0.24)" : "rgba(210,224,240,0.95)";

  return (
    <section
      className="relative overflow-hidden rounded-[16px] border px-3 py-2.5 shadow-sm"
      style={{
        backgroundColor: night ? "#0A1E43" : "#DFF0FF",
        borderColor: night ? "rgba(85,111,177,0.34)" : "rgba(198,214,233,0.9)",
        boxShadow: night ? "0 10px 24px rgba(4,15,36,0.18)" : "0 8px 18px rgba(11,28,44,0.055)",
      }}
      aria-label="Fort Bliss weather and PT uniform"
    >
      <div className="pointer-events-none absolute inset-0 opacity-100">
        <WeatherBackdrop night={night} />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: night
            ? "linear-gradient(180deg, rgba(5,20,48,0.34) 0%, rgba(7,27,61,0.22) 52%, rgba(5,20,48,0.38) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.14) 52%, rgba(255,255,255,0.30) 100%)",
        }}
      />

      <div className="relative z-10 flex items-start gap-2.5">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
          style={{
            backgroundColor: night ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.86)",
            borderColor: night ? "rgba(255,255,255,0.82)" : "#C9D9EE",
          }}
        >
          {night ? <MoonStar size={17} style={{ color: "#667EF2" }} strokeWidth={2.35} /> : <Sun size={17} style={{ color: "#F2B522" }} strokeWidth={2.35} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-[15px] font-extrabold leading-5 tracking-[-0.025em]" style={{ color: primaryText }}>
              Fort Bliss
            </h2>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: secondaryText }}>
              <MapPin size={11} /> El Paso, TX
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] leading-4" style={{ color: primaryText }}>
            <span className="inline-flex items-center gap-1 font-bold tabular-nums">
              <Clock3 size={11} style={{ color: accent }} /> {time}
            </span>
            <span style={{ color: subtleText }}>•</span>
            <span className="font-extrabold">{tempText}</span>
            {feelsLikeText ? (
              <>
                <span style={{ color: subtleText }}>•</span>
                <span className="font-semibold" style={{ color: secondaryText }}>{feelsLikeText}</span>
              </>
            ) : null}
            {conditionText ? (
              <>
                <span style={{ color: subtleText }}>•</span>
                <span className="max-w-[9rem] truncate font-semibold">{conditionText}</span>
              </>
            ) : null}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] leading-4" style={{ color: secondaryText }}>
            <span>{date}</span>
            <span>·</span>
            <span>{observedLabel}</span>
          </div>

          <div className="mt-0.5 text-[10px] font-bold leading-4 tracking-[0.01em]" style={{ color: secondaryText }}>
            Powered by:{" "}
            <a
              href="https://www.weather.gov/epz/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold no-underline"
              style={{ color: accent }}
              aria-label="Open National Weather Service forecast"
            >
              National Weather Service
            </a>
          </div>
        </div>
      </div>

      <div
        className="relative z-10 mt-2 overflow-hidden rounded-[13px] border transition-colors"
        style={{
          backgroundColor: ptOpen ? (night ? "rgba(17,42,83,0.78)" : "rgba(247,250,254,0.82)") : ptSurface,
          borderColor: ptBorder,
          backdropFilter: "blur(8px)",
        }}
      >
        <button
          type="button"
          onClick={() => setPtOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition active:scale-[0.99]"
          aria-expanded={ptOpen}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: "rgba(255,255,255,0.96)",
                borderColor: night ? "rgba(255,255,255,0.78)" : "#D4E1F1",
              }}
            >
              <Shirt size={15} style={{ color: T.navy }} strokeWidth={2.35} />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: accent }}>
                PT Uniform
              </span>
              <span className="block truncate text-[13px] font-extrabold leading-4" style={{ color: primaryText }}>
                {ptUniform.title}
              </span>
            </span>
          </span>

          <ChevronDown
            size={17}
            className="shrink-0 transition-transform duration-200"
            style={{ color: night ? "rgba(235,241,255,0.78)" : T.textSubtle, transform: ptOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            strokeWidth={2.5}
          />
        </button>

        {ptOpen ? (
          <div
            className="border-t px-3 pb-3 pt-2 text-[13px] leading-snug"
            style={{ borderColor: ptBorder, color: primaryText }}
          >
            <div className="font-semibold" style={{ color: primaryText }}>
              {ptUniform.detail}
            </div>

            {recommendations.length > 0 ? (
              <div
                className="mt-2 rounded-xl border px-2.5 py-2 text-[12px] leading-snug"
                style={{
                  backgroundColor: night ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.76)",
                  borderColor: night ? "rgba(145,169,228,0.22)" : "#DCE7F4",
                  color: night ? "rgba(238,243,255,0.84)" : T.text,
                }}
              >
                <span className="font-extrabold" style={{ color: primaryText }}>
                  {recommendations[0].type === "colder" ? "If colder" : "If warmer"}:
                </span>{" "}
                {recommendations[0].label} — {recommendations[0].title}
              </div>
            ) : null}

            {status === "error" && !weather ? (
              <div className="mt-2 text-xs" style={{ color: secondaryText }}>
                Weather could not load right now. Time is still shown.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function recommendationsFromGuidance(items) {
  return items.filter(Boolean).slice(0, 1);
}
