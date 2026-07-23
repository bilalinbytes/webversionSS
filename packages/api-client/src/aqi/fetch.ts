import type { ApiConfig } from "../types";

export async function fetchAqiForCoordinates(
  config: ApiConfig,
  lat: number,
  lng: number
): Promise<number | null> {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";
  try {
    const res = await fetcher(`${baseUrl}/api/aqi?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const data = await res.json() as { aqi?: number };
    return typeof data.aqi === "number" ? data.aqi : null;
  } catch {
    return null;
  }
}
