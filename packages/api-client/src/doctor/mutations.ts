import type { ApiConfig } from "../types";

export async function acknowledgePatientAlerts(config: ApiConfig, patientId: string, token?: string) {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetcher(`${baseUrl}/api/doctor/alerts/acknowledge`, {
      method: "POST",
      headers,
      body: JSON.stringify({ patientId }),
    });
    return { success: res.ok };
  } catch (err) {
    return { success: false };
  }
}
