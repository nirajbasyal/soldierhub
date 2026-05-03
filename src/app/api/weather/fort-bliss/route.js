import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 1800;

const NWS_BASE = "https://api.weather.gov";

// Fort Bliss / El Paso coordinates
const LAT = "31.8128";
const LON = "-106.4216";

const USER_AGENT =
  process.env.NWS_USER_AGENT || "SoldierHub/1.0 (niraj.basyal2054@gmail.com)";

async function fetchNws(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json",
    },
    next: { revalidate: 1800 },
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
    const pointData = await fetchNws(`${NWS_BASE}/points/${LAT},${LON}`);

    const hourlyUrl = pointData?.properties?.forecastHourly;
    const stationsUrl = pointData?.properties?.observationStations;

    if (!hourlyUrl) {
      throw new Error("No hourly forecast URL returned by NWS.");
    }

    const hourlyData = await fetchNws(hourlyUrl);
    const currentPeriod = hourlyData?.properties?.periods?.[0];

    let observation = null;

    try {
      if (stationsUrl) {
        const stationsData = await fetchNws(stationsUrl);
        const nearestStationUrl = stationsData?.features?.[0]?.id;

        if (nearestStationUrl) {
          const observationData = await fetchNws(
            `${nearestStationUrl}/observations/latest`
          );

          observation = observationData?.properties || null;
        }
      }
    } catch {
      observation = null;
    }

    const observedTempF = cToF(observation?.temperature?.value);

    const forecastTempF =
      currentPeriod?.temperatureUnit === "F"
        ? currentPeriod?.temperature
        : cToF(currentPeriod?.temperature);

    const tempF = observedTempF ?? forecastTempF ?? null;

    const windMph = msToMph(observation?.windSpeed?.value);

    const humidity =
      typeof observation?.relativeHumidity?.value === "number"
        ? Math.round(observation.relativeHumidity.value)
        : null;

    const condition =
      observation?.textDescription ||
      currentPeriod?.shortForecast ||
      "Weather unavailable";

    return NextResponse.json(
      {
        base: "Fort Bliss",
        city: "El Paso, TX",
        tempF,
        condition,
        wind: windMph !== null ? `${windMph} mph` : currentPeriod?.windSpeed || null,
        humidity: humidity !== null ? `${humidity}%` : null,
        localTimeZone: "America/Denver",
        ptUniform: getPtUniform(tempF),
        source: observedTempF !== null ? "NWS latest observation" : "NWS hourly forecast",
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
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
        ptUniform: {
          title: "PT Uniform",
          detail: "Weather unavailable — follow local guidance.",
        },
      },
      { status: 503 }
    );
  }
}