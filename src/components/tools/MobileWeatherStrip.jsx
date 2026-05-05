"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudSun, Clock3, MapPin, Shirt } from "lucide-react";
import { T } from "@/lib/theme";

const WEATHER_CACHE_KEY = "soldierhub_fort_bliss_weather_v6";
const WEATHER_CACHE_MAX_AGE = 60 * 1000;          // refresh interval: 1 min
const WEATHER_CACHE_STALE_AFTER = 10 * 60 * 1000; // hard expiry: 10 min

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

function getCachedWeather() {
  try {
    if (typeof window === "undefined") return null;

    const cached = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);

    if (!parsed?.data || !parsed?.savedAt) return null;

    // Don't trust cache older than the hard expiry window.
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
      JSON.stringify({
        data,
        savedAt: Date.now(),
      })
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

  const diffMs = Date.now() - checkedTime;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 20) return "Updated just now";
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
        if (!silent && !weather) {
          setStatus("loading");
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        // Cache-busting query param ensures no intermediate cache returns stale data.
        const res = await fetch(`/api/weather/fort-bliss?t=${Date.now()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error("Weather request failed");
        }

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
      const cachedWeatherWithMeta = {
        ...cached.data,
        checkedAt: cached.data.checkedAt || new Date(cached.savedAt).toISOString(),
        sourceName: cached.data.sourceName || "NWS",
        sourceLabel: cached.data.sourceLabel || "Weather.gov",
      };

      setWeather(cachedWeatherWithMeta);
      setStatus("ready");

      // Show saved weather instantly, then refresh silently right away.
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

  const ptUniform = weather?.ptUniform || {
    title: status === "error" ? "PT Uniform" : "Checking PT guidance",
    detail:
      status === "error"
        ? "Weather unavailable — follow local guidance."
        : "Loading current Fort Bliss temperature.",
  };

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: T.goldBg }}
        >
          <CloudSun size={20} style={{ color: T.gold }} strokeWidth={2.1} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-lg font-semibold leading-none"
              style={{ color: T.navy }}
            >
              Fort Bliss
            </span>

            <span
              className="inline-flex items-center gap-1 text-sm"
              style={{ color: T.textSubtle }}
            >
              <MapPin size={13} />
              El Paso, TX
            </span>
          </div>

          <div
            className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            style={{ color: T.text }}
          >
            <span className="inline-flex items-center gap-1 font-medium tabular-nums">
              <Clock3 size={13} />
              {time}
            </span>

            <span style={{ color: T.textSubtle }}>•</span>

            <span className="font-medium">{tempText}</span>

            {conditionText ? (
              <>
                <span style={{ color: T.textSubtle }}>•</span>
                <span>{conditionText}</span>
              </>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span style={{ color: T.textSubtle }}>{date}</span>

            <span style={{ color: T.textSubtle }}>•</span>

            <span style={{ color: T.textMuted }}>{checkedLabel}</span>

            <span style={{ color: T.textSubtle }}>•</span>

            <span style={{ color: T.textMuted }}>Weather by National Weather Service</span>
          </div>
        </div>
      </div>

      <div
        className="mt-4 rounded-xl border px-3 py-3"
        style={{
          backgroundColor: "#F8F3E4",
          borderColor: "#E9DFC4",
        }}
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">
            <Shirt size={16} style={{ color: T.navy }} strokeWidth={2.2} />
          </div>

          <div className="min-w-0">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: T.textSubtle }}
            >
              PT Uniform
            </div>

            <div
              className="mt-0.5 text-base font-semibold leading-snug"
              style={{ color: T.navy }}
            >
              {ptUniform.title}
            </div>

            <div
              className="mt-1 text-sm leading-relaxed"
              style={{ color: T.textMuted }}
            >
              {ptUniform.detail}
            </div>
          </div>
        </div>
      </div>

      {status === "error" && !weather ? (
        <div className="mt-2 text-xs" style={{ color: T.textSubtle }}>
          Weather could not load right now. Time is still shown.
        </div>
      ) : null}
    </div>
  );
}