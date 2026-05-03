"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudSun, Clock3, MapPin, Shirt } from "lucide-react";
import { T } from "@/lib/theme";

const WEATHER_CACHE_KEY = "soldierhub_fort_bliss_weather";
const WEATHER_CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

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

export default function MobileWeatherStrip() {
  const [now, setNow] = useState(null);
  const [weather, setWeather] = useState(null);

  // Important: start as loading, not idle.
  // This prevents the temporary "Weather unavailable" flash on reload.
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const updateTime = () => setNow(new Date());

    updateTime();

    const timer = setInterval(updateTime, 60 * 1000);

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

        const res = await fetch("/api/weather/fort-bliss", {
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error("Weather request failed");
        }

        const data = await res.json();

        if (alive) {
          setWeather(data);
          setStatus("ready");
          saveWeatherToCache(data);
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
      setWeather(cached.data);
      setStatus("ready");

      const cacheAge = Date.now() - cached.savedAt;

      if (cacheAge > WEATHER_CACHE_MAX_AGE) {
        loadWeather({ silent: true });
      }
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

          <div className="mt-1 text-xs" style={{ color: T.textSubtle }}>
            {date}
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