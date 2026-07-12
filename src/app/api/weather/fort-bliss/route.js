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
const USER_AGENT =
  process.env.NWS_USER_AGENT || "SoldierHub/1.0 (https://soldierhub.com)";

let weatherCache = {
  data: null,
  expiresAt: 0,
};

const PT_UNIFORM_RULES = [
  {
    key: "summer-apfu",
    min: 61,
    max: Infinity,
    title: "Summer APFU",
    detail: "Short sleeve shirt and shorts.",
    range: "61°F and above",
  },
  {
    key: "long-sleeve-shorts",
    min: 50,
    max: 60,
    title: "Long sleeve shirt and shorts",
    detail: "Wear long sleeve shirt and shorts.",
    range: "50–60°F",
  },
  {
    key: "jacket-shorts",
    min: 40,
    max: 49,
    title: "Jacket and shorts",
    detail: "Wear jacket and shorts.",
    range: "40–49°F",
  },
  {
    key: "jacket-pants",
    min: 33,
    max: 39,
    title: "Jacket and pants",
    detail: "Wear jacket and pants.",
    range: "33–39°F",
  },
  {
    key: "jacket-pants-cold-accessories",
    min: -Infinity,
    max: 32,
    title: "Jacket, pants, gloves, and fleece cap",
    detail: "Wear jacket, pants, gloves, and fleece cap.",
    range: "Below 33°F",
  },
];

async function fetchNws(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`NWS request failed: ${response.status} - ${url}`);
  }

  return response.json();
}

function cToF(value) {
  if (typeof value !== "number") return null;
  return Math.round((value * 9) / 5 + 32);
}

function msToMph(value) {
  if (typeof value !== "number") return null;
  return Math.round(value * 2.23694);
}

function cleanCondition(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
    return null;
  }
  return trimmed;
}

function pickFreshObservation(featureCollection) {
  const features = Array.isArray(featureCollection?.features)
    ? featureCollection.features
    : [];

  const withTemp = features.find(
    (feature) => typeof feature?.properties?.temperature?.value === "number"
  );

  return withTemp?.properties || features[0]?.properties || null;
}

function getObservationAgeMs(observation) {
  const timestamp = observation?.timestamp;
  if (!timestamp) return Infinity;
  const observedTime = new Date(timestamp).getTime();
  if (!Number.isFinite(observedTime)) return Infinity;
  return Math.max(0, Date.now() - observedTime);
}

function getFeelsLikeC(observation) {
  if (typeof observation?.heatIndex?.value === "number") {
    return observation.heatIndex.value;
  }
  if (typeof observation?.windChill?.value === "number") {
    return observation.windChill.value;
  }
  return null;
}

function getPtUniformRule(tempF) {
  if (typeof tempF !== "number") {
    return {
      key: "unavailable",
      title: "PT Uniform",
      detail: "Weather unavailable — follow local guidance.",
      range: "Weather unavailable",
    };
  }

  return PT_UNIFORM_RULES.find(
    (rule) => tempF >= rule.min && tempF <= rule.max
  );
}

function getPtUniform(tempF) {
  const current = getPtUniformRule(tempF);

  if (typeof tempF !== "number") {
    return { ...current, recommendations: [] };
  }

  const currentIndex = PT_UNIFORM_RULES.findIndex(
    (rule) => rule.key === current.key
  );
  const warmer = currentIndex > 0 ? PT_UNIFORM_RULES[currentIndex - 1] : null;
  const colder =
    currentIndex >= 0 && currentIndex < PT_UNIFORM_RULES.length - 1
      ? PT_UNIFORM_RULES[currentIndex + 1]
      : null;

  const recommendations = [];

  if (warmer && warmer.min - tempF <= 10) {
    recommendations.push({
      type: "warmer",
      label: `If your phone shows ${warmer.min}°F or above`,
      title: warmer.title,
      detail: warmer.detail,
      range: warmer.range,
    });
  }

  if (colder && tempF - colder.max <= 10) {
    recommendations.push({
      type: "colder",
      label: `If your phone shows ${colder.max}°F or lower`,
      title: colder.title,
      detail: colder.detail,
      range: colder.range,
    });
  }

  return {
    ...current,
    label: "Current PT Uniform",
    recommendations,
  };
}

function getCachedWeather() {
  if (!weatherCache.data || Date.now() > weatherCache.expiresAt) return null;
  return weatherCache.data;
}

function setCachedWeather(data) {
  weatherCache = {
    data,
    expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
  };
}

function weatherHeaders(rateLimitHeaders, cacheStatus, cacheControlOverride) {
  return {
    ...rateLimitHeaders,
    "Cache-Control":
      cacheControlOverride ||
      "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
    "X-SoldierHub-Cache": cacheStatus,
  };
}

function buildUnavailableWeatherPayload() {
  return {
    error: "Current NWS weather unavailable.",
    base: "Fort Bliss",
    city: "El Paso, TX",
    tempF: null,
    feelsLikeF: null,
    condition: "Condition updating",
    wind: null,
    humidity: null,
    localTimeZone: "America/Denver",
    stationId: STATION_ID,
    source: "National Weather Service",
    dataOrigin: "unavailable",
    observedAt: null,
    updatedAt: new Date().toISOString(),
    ptUniform: {
      title: "PT Uniform",
      detail: "Weather unavailable — follow local guidance.",
      recommendations: [],
    },
  };
}

async function buildWeatherPayload() {
  const [observationsResult, hourlyResult] = await Promise.allSettled([
    fetchNws(RECENT_OBSERVATIONS_URL),
    fetchNws(GRIDPOINT_HOURLY_URL),
  ]);

  const observation =
    observationsResult.status === "fulfilled"
      ? pickFreshObservation(observationsResult.value)
      : null;

  const hourlyPeriods =
    hourlyResult.status === "fulfilled"
      ? hourlyResult.value?.properties?.periods || []
      : [];

  const currentHour = hourlyPeriods[0] || null;
  const observationTempF = cToF(observation?.temperature?.value);
  const observationIsFresh =
    observationTempF !== null &&
    getObservationAgeMs(observation) <= OBSERVATION_MAX_AGE_MS;

  const hourlyTempF =
    typeof currentHour?.temperature === "number"
      ? Math.round(currentHour.temperature)
      : null;

  const useObservation = observationIsFresh || hourlyTempF === null;
  const tempF = useObservation ? observationTempF : hourlyTempF;

  const stationCondition = cleanCondition(observation?.textDescription);
  const hourlyCondition = cleanCondition(currentHour?.shortForecast);
  const condition = useObservation
    ? stationCondition || hourlyCondition || "Condition updating"
    : hourlyCondition || stationCondition || "Condition updating";

  if (tempF === null) {
    return {
      ...buildUnavailableWeatherPayload(),
      condition,
      observedAt: observation?.timestamp || currentHour?.startTime || null,
    };
  }

  const feelsLikeF = useObservation
    ? cToF(getFeelsLikeC(observation))
    : tempF;
  const windMph = useObservation
    ? msToMph(observation?.windSpeed?.value)
    : null;
  const humidity =
    useObservation && typeof observation?.relativeHumidity?.value === "number"
      ? Math.round(observation.relativeHumidity.value)
      : null;

  return {
    base: "Fort Bliss",
    city: "El Paso, TX",
    tempF,
    feelsLikeF,
    condition,
    wind: windMph !== null ? `${windMph} mph` : null,
    humidity: humidity !== null ? `${humidity}%` : null,
    localTimeZone: "America/Denver",
    stationId: STATION_ID,
    source: "National Weather Service",
    dataOrigin: useObservation ? "station-observation" : "hourly-forecast",
    observedAt: useObservation
      ? observation?.timestamp || null
      : currentHour?.startTime || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ptUniform: getPtUniform(tempF),
  };
}

export async function GET(request) {
  const rateLimit = await checkRateLimit(request, {
    keyPrefix: "weather:fort-bliss",
    limit: 90,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const cachedWeather = getCachedWeather();
  if (cachedWeather) {
    return NextResponse.json(cachedWeather, {
      headers: weatherHeaders(rateLimit.headers, "HIT"),
    });
  }

  try {
    const payload = await buildWeatherPayload();

    if (payload.tempF === null) {
      return NextResponse.json(payload, {
        status: 503,
        headers: weatherHeaders(rateLimit.headers, "MISS", "no-store"),
      });
    }

    setCachedWeather(payload);

    return NextResponse.json(payload, {
      headers: weatherHeaders(rateLimit.headers, "MISS"),
    });
  } catch (error) {
    console.error("Weather API error:", error);

    if (weatherCache.data) {
      return NextResponse.json(
        {
          ...weatherCache.data,
          warning: "Showing cached weather because fresh weather is temporarily unavailable.",
        },
        {
          headers: weatherHeaders(rateLimit.headers, "STALE"),
        }
      );
    }

    return NextResponse.json(buildUnavailableWeatherPayload(), {
      status: 503,
      headers: weatherHeaders(rateLimit.headers, "MISS", "no-store"),
    });
  }
}
