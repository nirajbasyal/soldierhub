import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NWS_BASE = "https://api.weather.gov";
const STATION_ID = "KELP";
const WEATHER_CACHE_TTL_MS = 60 * 1000;
const OBSERVATION_MAX_AGE_MS = 90 * 60 * 1000;

const RECENT_OBSERVATIONS_URL = `${NWS_BASE}/stations/${STATION_ID}/observations?limit=5`;
const GRIDPOINT_HOURLY_URL = `${NWS_BASE}/gridpoints/EPZ/120,71/forecast/hourly`;
const MAPCLICK_URL =
  "https://forecast.weather.gov/MapClick.php?lat=31.8128&lon=-106.4213&FcstType=json";
const USER_AGENT =
  process.env.NWS_USER_AGENT || "SoldierHub/1.0 (https://soldierhub.com)";

let weatherCache = { data: null, expiresAt: 0 };

const PT_UNIFORM_RULES = [
  { key: "summer-apfu", min: 61, max: Infinity, title: "Summer APFU", detail: "Short sleeve shirt and shorts.", range: "61°F and above" },
  { key: "long-sleeve-shorts", min: 50, max: 60, title: "Long sleeve shirt and shorts", detail: "Wear long sleeve shirt and shorts.", range: "50–60°F" },
  { key: "jacket-shorts", min: 40, max: 49, title: "Jacket and shorts", detail: "Wear jacket and shorts.", range: "40–49°F" },
  { key: "jacket-pants", min: 33, max: 39, title: "Jacket and pants", detail: "Wear jacket and pants.", range: "33–39°F" },
  { key: "jacket-pants-cold-accessories", min: -Infinity, max: 32, title: "Jacket, pants, gloves, and fleece cap", detail: "Wear jacket, pants, gloves, and fleece cap.", range: "Below 33°F" },
];

async function fetchNws(url, accept = "application/geo+json") {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: accept },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`NWS request failed: ${response.status} - ${url}`);
  return response.json();
}

function cToF(value) {
  return typeof value === "number" ? Math.round((value * 9) / 5 + 32) : null;
}

function msToMph(value) {
  return typeof value === "number" ? Math.round(value * 2.23694) : null;
}

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanCondition(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || ["null", "undefined"].includes(trimmed.toLowerCase())) return null;
  return trimmed;
}

function safeDateIso(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function pickFreshObservation(featureCollection) {
  const features = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
  const withTemp = features.find(
    (feature) => typeof feature?.properties?.temperature?.value === "number"
  );
  return withTemp?.properties || features[0]?.properties || null;
}

function isFreshTimestamp(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && Date.now() - time <= OBSERVATION_MAX_AGE_MS;
}

function getFeelsLikeC(observation) {
  if (typeof observation?.heatIndex?.value === "number") return observation.heatIndex.value;
  if (typeof observation?.windChill?.value === "number") return observation.windChill.value;
  return null;
}

function getPtUniform(tempF) {
  if (typeof tempF !== "number") {
    return { title: "PT Uniform", detail: "Weather is updating — follow local guidance.", recommendations: [] };
  }
  const current = PT_UNIFORM_RULES.find((rule) => tempF >= rule.min && tempF <= rule.max);
  const currentIndex = PT_UNIFORM_RULES.findIndex((rule) => rule.key === current?.key);
  const warmer = currentIndex > 0 ? PT_UNIFORM_RULES[currentIndex - 1] : null;
  const colder = currentIndex >= 0 && currentIndex < PT_UNIFORM_RULES.length - 1 ? PT_UNIFORM_RULES[currentIndex + 1] : null;
  const recommendations = [];
  if (warmer && warmer.min - tempF <= 10) recommendations.push({ type: "warmer", label: `If your phone shows ${warmer.min}°F or above`, title: warmer.title, detail: warmer.detail, range: warmer.range });
  if (colder && tempF - colder.max <= 10) recommendations.push({ type: "colder", label: `If your phone shows ${colder.max}°F or lower`, title: colder.title, detail: colder.detail, range: colder.range });
  return { ...current, label: "Current PT Uniform", recommendations };
}

function buildStationPayload(observation) {
  const tempF = cToF(observation?.temperature?.value);
  if (tempF === null || !isFreshTimestamp(observation?.timestamp)) return null;
  const feelsLikeF = cToF(getFeelsLikeC(observation));
  const windMph = msToMph(observation?.windSpeed?.value);
  const humidity = typeof observation?.relativeHumidity?.value === "number"
    ? Math.round(observation.relativeHumidity.value)
    : null;
  return {
    base: "Fort Bliss",
    city: "El Paso, TX",
    tempF,
    feelsLikeF,
    condition: cleanCondition(observation?.textDescription) || "Condition updating",
    wind: windMph !== null ? `${windMph} mph` : null,
    humidity: humidity !== null ? `${humidity}%` : null,
    localTimeZone: "America/Denver",
    stationId: STATION_ID,
    source: "National Weather Service",
    dataOrigin: "station-observation",
    observedAt: observation?.timestamp || null,
    updatedAt: new Date().toISOString(),
    ptUniform: getPtUniform(tempF),
  };
}

function buildMapClickPayload(mapClick) {
  const current = mapClick?.currentobservation || {};
  const currentTemp = toFiniteNumber(current.Temp);
  if (currentTemp === null) return null;
  const feelsLikeF = toFiniteNumber(current.HeatIndex) ?? toFiniteNumber(current.WindChill) ?? currentTemp;
  const humidity = toFiniteNumber(current.Relh);
  const windMph = toFiniteNumber(current.Winds);
  const tempF = Math.round(currentTemp);
  return {
    base: "Fort Bliss",
    city: "El Paso, TX",
    tempF,
    feelsLikeF: Math.round(feelsLikeF),
    condition: cleanCondition(current.Weather) || "Condition updating",
    wind: windMph !== null ? `${Math.round(windMph)} mph` : null,
    humidity: humidity !== null ? `${Math.round(humidity)}%` : null,
    localTimeZone: "America/Denver",
    stationId: STATION_ID,
    source: "National Weather Service",
    dataOrigin: "nws-current-observation-fallback",
    observedAt: safeDateIso(current.Date) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ptUniform: getPtUniform(tempF),
  };
}

function buildHourlyPayload(hourly) {
  if (typeof hourly?.temperature !== "number") return null;
  const tempF = Math.round(hourly.temperature);
  return {
    base: "Fort Bliss",
    city: "El Paso, TX",
    tempF,
    feelsLikeF: tempF,
    condition: cleanCondition(hourly.shortForecast) || "Condition updating",
    wind: null,
    humidity: null,
    localTimeZone: "America/Denver",
    stationId: STATION_ID,
    source: "National Weather Service",
    dataOrigin: "hourly-forecast",
    observedAt: hourly.startTime || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ptUniform: getPtUniform(tempF),
  };
}

function buildUpdatingPayload() {
  return {
    base: "Fort Bliss",
    city: "El Paso, TX",
    tempF: null,
    feelsLikeF: null,
    condition: "Weather updating",
    wind: null,
    humidity: null,
    localTimeZone: "America/Denver",
    stationId: STATION_ID,
    source: "National Weather Service",
    dataOrigin: "updating",
    observedAt: null,
    updatedAt: new Date().toISOString(),
    ptUniform: getPtUniform(null),
  };
}

function getCachedWeather() {
  if (!weatherCache.data || Date.now() > weatherCache.expiresAt) return null;
  return weatherCache.data;
}

function setCachedWeather(data) {
  weatherCache = { data, expiresAt: Date.now() + WEATHER_CACHE_TTL_MS };
}

function weatherHeaders(rateLimitHeaders, cacheStatus) {
  return {
    ...rateLimitHeaders,
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
    "X-SoldierHub-Cache": cacheStatus,
  };
}

async function buildWeatherPayload() {
  const [observationsResult, mapClickResult, hourlyResult] = await Promise.allSettled([
    fetchNws(RECENT_OBSERVATIONS_URL),
    fetchNws(MAPCLICK_URL, "application/json"),
    fetchNws(GRIDPOINT_HOURLY_URL),
  ]);

  const observation = observationsResult.status === "fulfilled"
    ? pickFreshObservation(observationsResult.value)
    : null;
  const stationPayload = buildStationPayload(observation);
  if (stationPayload) return stationPayload;

  if (mapClickResult.status === "fulfilled") {
    const currentPayload = buildMapClickPayload(mapClickResult.value);
    if (currentPayload) return currentPayload;
  }

  if (hourlyResult.status === "fulfilled") {
    const hourlyPayload = buildHourlyPayload(hourlyResult.value?.properties?.periods?.[0]);
    if (hourlyPayload) return hourlyPayload;
  }

  const failures = [observationsResult, mapClickResult, hourlyResult]
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason?.message || "Unknown NWS error");
  if (failures.length) console.error("Fort Bliss weather sources failed:", failures);

  return weatherCache.data || buildUpdatingPayload();
}

export async function GET(request) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: "weather:fort-bliss",
    limit: 90,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const cachedWeather = getCachedWeather();
  if (cachedWeather) {
    return NextResponse.json(cachedWeather, {
      headers: weatherHeaders(rateLimit.headers, "HIT"),
    });
  }

  try {
    const payload = await buildWeatherPayload();
    if (typeof payload.tempF === "number") setCachedWeather(payload);
    return NextResponse.json(payload, {
      headers: weatherHeaders(rateLimit.headers, typeof payload.tempF === "number" ? "MISS" : "UPDATING"),
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(weatherCache.data || buildUpdatingPayload(), {
      headers: weatherHeaders(rateLimit.headers, weatherCache.data ? "STALE" : "UPDATING"),
    });
  }
}
