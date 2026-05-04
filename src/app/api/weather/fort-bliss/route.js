import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 300;

const NWS_BASE = "https://api.weather.gov";
const STATION_ID = "KELP"; // El Paso International Airport

const USER_AGENT =
  process.env.NWS_USER_AGENT || "SoldierHub/1.0 (niraj.basyal2054@gmail.com)";

async function fetchNws(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`NWS request failed: ${response.status}`);
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

function getPtUniform(tempF) {
  if (typeof tempF !== "number") {
    return {
      title: "PT Uniform",
      detail: "Weather unavailable — follow local guidance.",
    };
  }

  if (tempF >= 61) {
    return {
      title: "Summer APFU",
      detail: "Short sleeve shirt and shorts.",
    };
  }

  if (tempF >= 50) {
    return {
      title: "Long sleeve shirt and shorts",
      detail: "Recommended for 50–60°F.",
    };
  }

  if (tempF >= 40) {
    return {
      title: "Jacket and shorts",
      detail: "Recommended for 40–49°F.",
    };
  }

  if (tempF >= 33) {
    return {
      title: "Jacket and pants",
      detail: "Recommended for 33–39°F.",
    };
  }

  if (tempF >= 10) {
    return {
      title: "Jacket, pants, gloves, and fleece cap",
      detail: "Recommended for 10–32°F.",
    };
  }

  return {
    title: "Extreme cold",
    detail: "Follow command guidance before outdoor PT.",
  };
}

export async function GET() {
  try {
    const observationData = await fetchNws(
      `${NWS_BASE}/stations/${STATION_ID}/observations/latest`
    );

    const observation = observationData?.properties || null;

    const tempF = cToF(observation?.temperature?.value);

    const windMph = msToMph(observation?.windSpeed?.value);

    const humidity =
      typeof observation?.relativeHumidity?.value === "number"
        ? Math.round(observation.relativeHumidity.value)
        : null;

    const condition =
      observation?.textDescription || "Weather unavailable";

    if (tempF === null) {
      return NextResponse.json(
        {
          error: "Current NWS observation unavailable.",
          base: "Fort Bliss",
          city: "El Paso, TX",
          tempF: null,
          condition: "Unavailable",
          localTimeZone: "America/Denver",
          stationId: STATION_ID,
          source: "NWS latest observation unavailable",
          observedAt: observation?.timestamp || null,
          updatedAt: new Date().toISOString(),
          ptUniform: {
            title: "PT Uniform",
            detail: "Weather unavailable — follow local guidance.",
          },
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "s-maxage=60, stale-while-revalidate=30",
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
        source: "NWS latest observation",
        observedAt: observation?.timestamp || null,
        updatedAt: new Date().toISOString(),
        ptUniform: getPtUniform(tempF),
      },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        error: "Weather temporarily unavailable.",
        base: "Fort Bliss",
        city: "El Paso, TX",
        tempF: null,
        condition: "Unavailable",
        localTimeZone: "America/Denver",
        stationId: STATION_ID,
        source: "NWS latest observation",
        updatedAt: new Date().toISOString(),
        ptUniform: {
          title: "PT Uniform",
          detail: "Weather unavailable — follow local guidance.",
        },
      },
      { status: 503 }
    );
  }
}