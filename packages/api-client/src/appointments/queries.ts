import type { ApiConfig } from "../types";

export async function getPatientAppointments(config: ApiConfig, patientId: string, token?: string) {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetcher(`${baseUrl}/api/patient/appointments?patientId=${patientId}`, { headers });
    if (!res.ok) return { success: false, error: "Failed to fetch appointments" };
    const data = await res.json();
    return { success: true, data: data.appointments };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function getNextAppointment(config: ApiConfig, patientId: string, token?: string) {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetcher(`${baseUrl}/api/appointments/next?patientId=${patientId}`, { headers });
    if (!res.ok) return { success: false, error: "Failed to fetch next appointment" };
    const data = await res.json();
    return { success: true, data: data.appointment };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function getDoctorAppointments(config: ApiConfig, token?: string) {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    // Uses doctor session via cookie/token
    const res = await fetcher(`${baseUrl}/api/appointments`, { headers, credentials: "omit" });
    if (!res.ok) return { success: false, error: "Failed to fetch appointments" };
    const data = await res.json();
    return { success: true, data: data.appointments };
  } catch {
    return { success: false, error: "Network error" };
  }
}
