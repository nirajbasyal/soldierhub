"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudSun, Clock3, MapPin, Shirt } from "lucide-react";
import { T } from "@/lib/theme";

const WEATHER_CACHE_KEY = "soldierhub_fort_bliss_weather_v13";
const OLD_WEATHER_CACHE_KEYS = [
  "soldierhub_fort_bliss_weather_v6",
  "soldierhub_fort_bliss_weather_v7",
  "soldierhub_fort_bliss_weather_v8",
  "soldierhub_fort_bliss_weather_v9",
  "soldierhub_fort_bliss_weather_v10",
  "soldierhub_fort_bliss_weather_v11",
  "soldierhub_fort_bliss_weather_v12",
];

const WEATHER_CACHE_MAX_AGE = 60 * 1000;
const WEATHER_CACHE_STALE_AFTER = 10 * 60 * 1000;

const PT_UNIFORM_RULES = [
  {
    key: "summer-apfu",
    min: 61,
    max: Infinity,
    title: "Summer APFU",
    detail: "Short sleeve + shorts",
  },
  {
    key: "long-sleeve-shorts",
    min: 50,
    max: 60,
    title: "Long sleeve + shorts",
    detail: "Long sleeve shirt + shorts",
  },
  {
    key: "jacket-shorts",
    min: 40,
    max: 49,
    title: "Jacket + shorts",
    detail: "Jacket + shorts",
  },
  {
    key: "jacket-pants",
    min: 33,
    max: 39,
    title: "Jacket + pants",
    detail: "Jacket + pants",
  },
  {
    key: "jacket-pants-cold-accessories",
    min: -Infinity,
    max: 32,
    title: "Jacket + pants + cold gear",
    detail: "Jacket, pants, gloves + fleece cap",
  },
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

function getPtUniformRule(tempF) {
  if (typeof tempF !== "number") return null;

  return PT_UNIFORM_RULES.find(
    (rule) => tempF >= rule.min && tempF <= rule.max
  );
}

function getPtGuidance(tempF, fallback) {
  const current = getPtUniformRule(tempF);
  if (!current) return fallback;

  const currentIndex = PT_UNIFORM_RULES.findIndex(
    (rule) => rule.key === current.key
  );

  const warmer = currentIndex > 0 ? PT_UNIFORM_RULES[currentIndex - 1] : null;
  const colder =
    currentIndex >= 0 && currentIndex < PT_UNIFORM_RULES.length - 1
      ? PT_UNIFORM_RULES[currentIndex + 1]
      : null;

  const recommendations = [];

  if (warmer) {
    recommendations.push({
      type: "warmer",
      label: `${warmer.min}°F+`,
      title: warmer.title,
      detail: warmer.detail,
    });
  }

  if (colder) {
    recommendations.push({
      type: "colder",
      label: `≤${colder.max}°F`,
      title: colder.title,
      detail: colder.detail,
    });
  }

  return {
    label: "Current PT Uniform",
    title: current.title,
    detail: current.detail,
    recommendations,
  };
}

function clearOldWeatherCache() {
  try {
    if (typeof window === "undefined") return;

    OLD_WEATHER_CACHE_KEYS.forEach((key) => {
      window.localStorage.removeItem(key);
    });
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

    window.localStorage.setItem(
      WEATHER_CACHE_KEY,
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    // Ignore localStorage errors.
  }
}

function getCheckedLabel(weather) {
  const checkedAt = weather?.checkedAt;
  if (!checkedAt) return "Checking now";

  const checkedTime = new Date(checkedAt).getTime();
  if (!Number.isFinite(checkedTime)) return "Checking now";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - checkedTime) / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 20) return "Updated now";
  if (diffSeconds < 60) return `Updated ${diffSeconds}s ago`;
  if (diffMinutes === 1) return "Updated 1 min ago";

  return `Updated ${diffMinutes} min ago`;
}

export default function MobileWeatherStrip() {
  const [now, setNow] = useState(null);
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("loading");

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
          sourceName: "NWS",
          sourceLabel: "Weather.gov",
        };

        if (alive) {
          setWeather(weatherWithMeta);
          setStatus("ready");
          saveWeatherToCache(weatherWithMeta);
        }
      } catch {
        if (alive) {
          setStatus((currentStatus) =>
            currentStatus === "ready" ? "ready" : "error"
          );
        }
      }
    }

    const cached = getCachedWeather();

    if (cached?.data) {
      setWeather({
        ...cached.data,
        checkedAt: cached.data.checkedAt || new Date(cached.savedAt).toISOString(),
        sourceName: cached.data.sourceName || "NWS",
        sourceLabel: cached.data.sourceLabel || "Weather.gov",
      });
      setStatus("ready");
      loadWeather({ silent: true });
    } else {
      loadWeather();
    }

    const refreshTimer = setInterval(() => {
      loadWeather({ silent: true });
    }, WEATHER_CACHE_MAX_AGE);

    return () => {
      alive = false;
      clearInterval(refreshTimer);
    };
  }, []);

  const time = useMemo(() => formatElPasoTime(now), [now]);
  const date = useMemo(() => formatElPasoDate(now), [now]);
  const checkedLabel = useMemo(() => getCheckedLabel(weather), [weather, now]);

  const tempText =
    typeof weather?.tempF === "number"
      ? `${weather.tempF}°F`
      : status === "error"
      ? "Weather unavailable"
      : "Checking weather";

  const conditionText =
    weather?.condition && status !== "error" ? weather.condition : "";

  const fallbackPtUniform = weather?.ptUniform || {
    label: "Current PT Uniform",
    title: status === "error" ? "PT Uniform" : "Checking PT guidance",
    detail:
      status === "error"
        ? "Weather unavailable — follow local guidance."
        : "Loading current Fort Bliss temperature.",
    recommendations: [],
  };

  const ptUniform = getPtGuidance(weather?.tempF, fallbackPtUniform);
  const recommendations = Array.isArray(ptUniform.recommendations)
    ? ptUniform.recommendations
    : [];

  return (
    <div
      className="rounded-2xl border p-3"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: T.goldBg }}
        >
          <CloudSun size={18} style={{ color: T.gold }} strokeWidth={2.1} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold leading-none" style={{ color: T.navy }}>
              Fort Bliss
            </span>

            <span className="inline-flex items-center gap-1 text-xs" style={{ color: T.textSubtle }}>
              <MapPin size={12} />
              El Paso, TX
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs" style={{ color: T.text }}>
            <span className="inline-flex items-center gap-1 font-medium tabular-nums">
              <Clock3 size={12} />
              {time}
            </span>
            <span style={{ color: T.textSubtle }}>•</span>
            <span className="font-semibold">{tempText}</span>
            {conditionText ? (
              <>
                <span style={{ color: T.textSubtle }}>•</span>
                <span className="truncate">{conditionText}</span>
              </>
            ) : null}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
            <span style={{ color: T.textSubtle }}>{date}</span>
            <span style={{ color: T.textSubtle }}>•</span>
            <span style={{ color: T.textMuted }}>{checkedLabel}</span>
          </div>
        </div>
      </div>

      <div
        className="mt-3 rounded-xl border px-2.5 py-2 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(220,232,247,0.9) 0%, rgba(255,255,255,0.94) 60%, rgba(253,236,240,0.75) 100%)",
          borderColor: "#BCD0EA",
        }}
      >
        <div className="absolute left-0 top-0 h-full w-1 bg-[#B31942]" />
        <div className="absolute right-0 top-0 h-full w-1 bg-[#1E4E8C]" />

        <div className="flex items-start gap-2 pl-1.5">
          <div
            className="mt-0.5 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(7,27,51,0.08)" }}
          >
            <Shirt size={14} style={{ color: T.navy }} strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="rounded-xl border bg-white/90 px-2.5 py-2" style={{ borderColor: "rgba(232,160,32,0.55)" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.11em]" style={{ color: T.blue }}>
                  Current PT Uniform
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                  style={{ backgroundColor: T.goldBg, color: T.gold }}
                >
                  Now
                </span>
              </div>

              <div className="mt-0.5 text-base font-bold leading-tight" style={{ color: T.navy }}>
                {ptUniform.title}
              </div>
              <div className="text-xs font-medium leading-snug" style={{ color: T.text }}>
                {ptUniform.detail}
              </div>
            </div>

            {recommendations.length > 0 ? (
              <div className="mt-2 border-t pt-2" style={{ borderColor: "rgba(63,95,125,0.16)" }}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.11em]" style={{ color: T.blue }}>
                  Note
                </div>
                <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {recommendations.map((item) => (
                    <div key={`${item.type}-${item.title}`} className="rounded-lg bg-white/60 px-2 py-1.5">
                      <div className="text-[10px] font-semibold" style={{ color: T.textSubtle }}>
                        {item.label}
                      </div>
                      <div className="text-xs font-semibold leading-snug" style={{ color: T.navy }}>
                        {item.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {status === "error" && !weather ? (
        <div className="mt-1.5 text-xs" style={{ color: T.textSubtle }}>
          Weather could not load right now. Time is still shown.
        </div>
      ) : null}
    </div>
  );
}
