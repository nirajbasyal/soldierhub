"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudSun, Clock3, MapPin, Shirt } from "lucide-react";
import { T } from "@/lib/theme";

const WEATHER_CACHE_KEY = "soldierhub_fort_bliss_weather_v21";
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
  const checkedLabel = useMemo(() => getCheckedLabel(weather), [weather, now]);

  const tempText = typeof weather?.tempF === "number" ? `${weather.tempF}°F` : status === "error" ? "Weather unavailable" : "Checking weather";
  const conditionText = weather?.condition && status !== "error" ? weather.condition : "";

  const fallbackPtUniform = weather?.ptUniform || {
    label: "Current PT Uniform",
    title: status === "error" ? "PT Uniform" : "Checking PT guidance",
    detail: status === "error" ? "Weather unavailable — follow local guidance." : "Loading current Fort Bliss temperature.",
    recommendations: [],
  };

  const ptUniform = getPtGuidance(weather?.tempF, fallbackPtUniform);
  const recommendations = Array.isArray(ptUniform.recommendations) ? recommendationsFromGuidance(ptUniform.recommendations) : [];

  return (
    <div
      className="rounded-[24px] border p-4 shadow-sm"
      style={{
        backgroundColor: "rgba(255,255,255,0.96)",
        borderColor: "rgba(198,214,233,0.9)",
        boxShadow: "0 12px 28px rgba(11,28,44,0.055)",
      }}
    >
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#DDE8F3]">
        <div className="h-full w-[36%] rounded-full bg-[#B31942]" />
      </div>

      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
          style={{ backgroundColor: "#EEF5FD", borderColor: "#C9D9EE" }}
        >
          <CloudSun size={19} style={{ color: T.blue }} strokeWidth={2.25} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-extrabold leading-none tracking-[-0.03em]" style={{ color: T.navy }}>
              Fort Bliss
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold" style={{ backgroundColor: "#F4F7FB", color: T.textSubtle }}>
              <MapPin size={12} /> El Paso, TX
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs" style={{ color: T.text }}>
            <span className="inline-flex items-center gap-1 font-bold tabular-nums">
              <Clock3 size={12} /> {time}
            </span>
            <span style={{ color: T.textSubtle }}>•</span>
            <span className="font-extrabold">{tempText}</span>
            {conditionText ? (
              <>
                <span style={{ color: T.textSubtle }}>•</span>
                <span className="font-medium">{conditionText}</span>
              </>
            ) : null}
          </div>

          <div className="mt-1 text-[11px] leading-5" style={{ color: T.textMuted }}>
            {date} · {checkedLabel}
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] leading-5" style={{ color: T.textMuted }}>
        Powered by{" "}
        <a
          href="https://www.weather.gov/epz/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline underline-offset-2"
          style={{ color: T.blue }}
        >
          National Weather Service
        </a>
      </div>

      <div
        className="mt-4 rounded-[22px] border p-3"
        style={{
          backgroundColor: "#F7FAFE",
          borderColor: "rgba(198,214,233,0.9)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border bg-white"
            style={{ borderColor: "#D4E1F1" }}
          >
            <Shirt size={17} style={{ color: T.navy }} strokeWidth={2.35} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: T.blue }}>
                Current PT Uniform
              </div>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ backgroundColor: "rgba(179,25,66,0.09)", color: "#B31942" }}>
                Now
              </span>
            </div>

            <div className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.04em]" style={{ color: T.navy }}>
              {ptUniform.title}
            </div>
            <div className="mt-0.5 text-sm font-semibold leading-snug" style={{ color: T.text }}>
              {ptUniform.detail}
            </div>
          </div>
        </div>

        {recommendations.length > 0 ? (
          <div className="mt-3 rounded-2xl border bg-white px-3 py-2.5" style={{ borderColor: "#DCE7F4" }}>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: T.textSubtle }}>
              Note
            </div>
            <div className="mt-1 text-sm leading-snug" style={{ color: T.text }}>
              <span className="font-bold" style={{ color: T.navy }}>
                {recommendations[0].label}:
              </span>{" "}
              {recommendations[0].title}
            </div>
          </div>
        ) : null}
      </div>

      {status === "error" && !weather ? (
        <div className="mt-2 text-xs" style={{ color: T.textSubtle }}>
          Weather could not load right now. Time is still shown.
        </div>
      ) : null}
    </div>
  );
}

function recommendationsFromGuidance(items) {
  return items.filter(Boolean).slice(0, 1);
}
