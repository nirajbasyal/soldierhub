import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NWS_BASE = "https://api.weather.gov";
const STATION_ID = "KELP"; // El Paso International Airport

// Fort Bliss / El Paso NWS gridpoint fallback for condition text
// This is used only when station observation has no textDescription.
const GRIDPOINT_HOURLY_URL = `${NWS_BASE}/gridpoints/EPZ/120,71/forecast/hourly`;

const USER_AGENT =
  process.env.NWS_USER_AGENT || "SoldierHub/1.0 (niraj.basyal2054@gmail.com)";

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

function buildWarmerLabel(rule) {
  return `If your phone shows ${rule.min}°F or above`;
}

function buildColderLabel(rule) {
  return `If your phone shows ${rule.max}°F or lower`;
}

function getPtUniform(tempF) {
  const current = getPtUniformRule(tempF);

  if (typeof tempF !== "number") {
    return {
      ...current,
      recommendations: [],
    };
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

  // The 10-degree buffer is only used in the background to decide whether
  // a nearby uniform category is close enough to mention. The UI shows the
  // actual cutoff temperature so users can compare with their phone weather.
  if (warmer && warmer.min - tempF <= 10) {
    recommendations.push({
      type: "warmer",
      label: buildWarmerLabel(warmer),
      title: warmer.title,
      detail: warmer.detail,
      range: warmer.range,
    });
  }

  if (colder && tempF - colder.max <= 10) {
    recommendations.push({
      type: "colder",
      label: buildColderLabel(colder),
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

function cleanCondition(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "null") return null;
  if (trimmed.toLowerCase() === "undefined") return null;

  return trimmed;
}

export async function GET() {
  try {
    const [observationResult, hourlyResult] = await Promise.allSettled([
      fetchNws(`${NWS_BASE}/stations/${STATION_ID}/observations/latest`),
      fetchNws(GRIDPOINT_HOURLY_URL),
    ]);

    const observation =
      observationResult.status === "fulfilled"
        ? observationResult.value?.properties || null
        : null;

    const hourlyPeriods =
      hourlyResult.status === "fulfilled"
        ? hourlyResult.value?.properties?.periods || []
        : [];

    const tempF = cToF(observation?.temperature?.value);
    const windMph = msToMph(observation?.windSpeed?.value);

    const humidity =
      typeof observation?.relativeHumidity?.value === "number"
        ? Math.round(observation.relativeHumidity.value)
        : null;

    const stationCondition = cleanCondition(observation?.textDescription);
    const hourlyCondition = cleanCondition(hourlyPeriods?.[0]?.shortForecast);

    const condition =
      stationCondition || hourlyCondition || "Condition updating";

    const observedAt = observation?.timestamp || null;

    if (tempF === null) {
      return NextResponse.json(
        {
          error: "Current NWS observation unavailable.",
          base: "Fort Bliss",
          city: "El Paso, TX",
          tempF: null,
          condition,
          wind: null,
          humidity: null,
          localTimeZone: "America/Denver",
          stationId: STATION_ID,
          source: "NWS latest observation + hourly forecast fallback",
          observedAt,
          updatedAt: new Date().toISOString(),
          ptUniform: {
            title: "PT Uniform",
            detail: "Weather unavailable — follow local guidance.",
            recommendations: [],
          },
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        base: "Fort Bliss",
        city: "El Paso, TX",
        tempF,
        condition,
        wind: windMph !== null ? `${windMph} mph` : null,
        humidity: humidity !== null ? `${humidity}%` : null,
        localTimeZone: "America/Denver",
        stationId: STATION_ID,
        source: "NWS latest observation + hourly forecast fallback",
        observedAt,
        updatedAt: new Date().toISOString(),
        ptUniform: getPtUniform(tempF),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=30, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Weather API error:", error);

    return NextResponse.json(
      {
        error: "Weather temporarily unavailable.",
        base: "Fort Bliss",
        city: "El Paso, TX",
        tempF: null,
        condition: "Condition updating",
        wind: null,
        humidity: null,
        localTimeZone: "America/Denver",
        stationId: STATION_ID,
        source: "NWS latest observation + hourly forecast fallback",
        observedAt: null,
        updatedAt: new Date().toISOString(),
        ptUniform: {
          title: "PT Uniform",
          detail: "Weather unavailable — follow local guidance.",
          recommendations: [],
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
