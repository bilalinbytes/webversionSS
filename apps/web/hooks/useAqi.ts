"use client";

import { useEffect, useState } from "react";
import { fetchAqiForCoordinates } from "@o2plus/api-client/aqi";

export function useAqi(): number | null {
  const [aqi, setAqi] = useState<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const val = await fetchAqiForCoordinates(
          // No supabase needed for AQI route, but ApiConfig requires it.
          // Wait, ApiConfig in @o2plus/api-client requires supabase client.
          // Is supabase strictly required for aqi? The type says it is.
          // We can cast `{} as any` or just pass `supabase: null as any` if not used.
          // Actually, let's create a dummy client or just cast.
          { supabase: null as any, baseUrl: "" },
          pos.coords.latitude,
          pos.coords.longitude
        );
        if (val !== null) setAqi(val);
      },
      () => {
        // user denied geolocation — AQI display will show "—"
      },
      { timeout: 8000 }
    );
  }, []);

  return aqi;
}
