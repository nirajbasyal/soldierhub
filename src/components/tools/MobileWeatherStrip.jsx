"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, CloudSun, Clock3, MapPin, Shirt } from "lucide-react";
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

// Show how old the actual NWS observation is (not when we last fetched it).
// Station observations update roughly hourly, so a reading can be ~45 min old
// while still being the newest available — surfacing that prevents the temp
// from looking "wrong" versus a phone's model-based current temp.
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

  return (
    <section
      className="rounded-[16px] border px-3 py-2.5 shadow-sm"
      style={{
        backgroundColor: "rgba(255,255,255,0.97)",
        borderColor: "rgba(198,214,233,0.9)",
        boxShadow: "0 8px 18px rgba(11,28,44,0.045)",
      }}
      aria-label="Fort Bliss weather and PT uniform"
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
          style={{ backgroundColor: "#EEF5FD", borderColor: "#C9D9EE" }}
        >
          <CloudSun size={17} style={{ color: T.blue }} strokeWidth={2.35} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-[15px] font-extrabold leading-5 tracking-[-0.025em]" style={{ color: T.navy }}>
              Fort Bliss
            </h2>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: T.textSubtle }}>
              <MapPin size={11} /> El Paso, TX
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] leading-4" style={{ color: T.text }}>
            <span className="inline-flex items-center gap-1 font-bold tabular-nums">
              <Clock3 size={11} /> {time}
            </span>
            <span style={{ color: T.textSubtle }}>•</span>
            <span className="font-extrabold">{tempText}</span>
            {feelsLikeText ? (
              <>
                <span style={{ color: T.textSubtle }}>•</span>
                <span className="font-semibold" style={{ color: T.textMuted }}>{feelsLikeText}</span>
              </>
            ) : null}
            {conditionText ? (
              <>
                <span style={{ color: T.textSubtle }}>•</span>
                <span className="max-w-[9rem] truncate font-semibold">{conditionText}</span>
              </>
            ) : null}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] leading-4" style={{ color: T.textMuted }}>
            <span>{date}</span>
            <span>·</span>
            <span>{observedLabel}</span>
          </div>

          <div className="mt-0.5 text-[10px] font-bold leading-4 tracking-[0.01em]" style={{ color: T.textMuted }}>
            Powered by:{" "}
            <a
              href="https://www.weather.gov/epz/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold no-underline"
              style={{ color: T.blue }}
              aria-label="Open National Weather Service forecast"
            >
              National Weather Service
            </a>
          </div>
        </div>
      </div>

      <div
        className="mt-2 overflow-hidden rounded-[13px] border transition-colors"
        style={{
          backgroundColor: ptOpen ? "#F7FAFE" : "#FAFCFF",
          borderColor: "rgba(210,224,240,0.95)",
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
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border bg-white"
              style={{ borderColor: "#D4E1F1" }}
            >
              <Shirt size={15} style={{ color: T.navy }} strokeWidth={2.35} />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: T.blue }}>
                PT Uniform
              </span>
              <span className="block truncate text-[13px] font-extrabold leading-4" style={{ color: T.navy }}>
                {ptUniform.title}
              </span>
            </span>
          </span>

          <ChevronDown
            size={17}
            className="shrink-0 transition-transform duration-200"
            style={{ color: T.textSubtle, transform: ptOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            strokeWidth={2.5}
          />
        </button>

        {ptOpen ? (
          <div
            className="border-t px-3 pb-3 pt-2 text-[13px] leading-snug"
            style={{ borderColor: "rgba(210,224,240,0.95)", color: T.text }}
          >
            <div className="font-semibold" style={{ color: T.navy }}>
              {ptUniform.detail}
            </div>

            {recommendations.length > 0 ? (
              <div className="mt-2 rounded-xl border bg-white px-2.5 py-2 text-[12px] leading-snug" style={{ borderColor: "#DCE7F4" }}>
                <span className="font-extrabold" style={{ color: T.navy }}>
                  {recommendations[0].type === "colder" ? "If colder" : "If warmer"}:
                </span>{" "}
                {recommendations[0].label} — {recommendations[0].title}
              </div>
            ) : null}

            {status === "error" && !weather ? (
              <div className="mt-2 text-xs" style={{ color: T.textSubtle }}>
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
