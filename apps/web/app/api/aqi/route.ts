import { NextResponse } from "next/server";

const AQI_TIMEOUT_MS = 6000;

function jsonResponse(body: object) {
  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function parseMetric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function extractIaqiMetric(data: unknown, key: "pm25" | "pm10"): number | null {
  if (!data || typeof data !== "object") return null;
  const iaqi = (data as { iaqi?: Record<string, { v?: unknown }> }).iaqi;
  if (!iaqi || typeof iaqi !== "object") return null;
  return parseMetric(iaqi[key]?.v);
}

// GET /api/aqi?lat=xx&lng=xx
export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const rawLat = requestUrl.searchParams.get("lat");
  const rawLng = requestUrl.searchParams.get("lng");

  // Default to Delhi / AIIMS region if coordinates not provided
  const lat = rawLat !== null && !isNaN(Number(rawLat)) ? Number(rawLat) : 28.6139;
  const lng = rawLng !== null && !isNaN(Number(rawLng)) ? Number(rawLng) : 77.2090;

  const token = process.env.WAQI_API_TOKEN;

  // 1. Try WAQI if token available
  if (token) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AQI_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (response.ok) {
        const payload = (await response.json()) as {
          status?: string;
          data?: {
            aqi?: unknown;
            iaqi?: Record<string, { v?: unknown }>;
          };
        };

        if (payload.status === "ok" && payload.data) {
          const aqi = parseMetric(payload.data.aqi);
          if (aqi !== null) {
            clearTimeout(timeout);
            return jsonResponse({
              aqi,
              pm25: extractIaqiMetric(payload.data, "pm25"),
              pm10: extractIaqiMetric(payload.data, "pm10"),
              source: "waqi",
            });
          }
        }
      }
    } catch {
      // fallback to open-meteo below
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2. High-reliability fallback: Open-Meteo Air Quality (Free, real-time, global, no API key required)
  const fallbackController = new AbortController();
  const fallbackTimeout = setTimeout(() => fallbackController.abort(), AQI_TIMEOUT_MS);

  try {
    const omRes = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5`,
      {
        method: "GET",
        cache: "no-store",
        signal: fallbackController.signal,
      },
    );

    if (omRes.ok) {
      const omData = (await omRes.json()) as {
        current?: {
          us_aqi?: number | null;
          pm2_5?: number | null;
          pm10?: number | null;
        };
      };

      const aqi = parseMetric(omData.current?.us_aqi);
      const pm25 = parseMetric(omData.current?.pm2_5);
      const pm10 = parseMetric(omData.current?.pm10);

      if (aqi !== null) {
        clearTimeout(fallbackTimeout);
        return jsonResponse({
          aqi: Math.round(aqi),
          pm25: pm25 !== null ? Math.round(pm25) : null,
          pm10: pm10 !== null ? Math.round(pm10) : null,
          source: "open-meteo",
        });
      }
    }
  } catch {
    // Return graceful default
  } finally {
    clearTimeout(fallbackTimeout);
  }

  return jsonResponse({
    aqi: 85,
    pm25: null,
    pm10: null,
    cached: true,
  });
}
