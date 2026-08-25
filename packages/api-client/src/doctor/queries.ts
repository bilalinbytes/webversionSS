import type { ApiConfig } from "../types";

export async function getDoctorPatients(config: ApiConfig, token?: string) {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetcher(`${baseUrl}/api/doctor/patients`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) return { success: false, error: "Failed to fetch patients" };
    const data = await res.json();
    return { success: true, data: data.patients };
  } catch (err) {
    return { success: false, error: "Network error" };
  }
}

export async function getDoctorAppointmentSettings(config: ApiConfig, token?: string) {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetcher(`${baseUrl}/api/doctor/appointment-settings`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) return { success: false, error: "Failed to fetch settings" };
    const data = await res.json();
    return { success: true, data: data.settings };
  } catch (err) {
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
    const res = await fetcher(`${baseUrl}/api/appointments`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) return { success: false, error: "Failed to fetch appointments" };
    const data = await res.json();
    return { success: true, data: data.appointments };
  } catch (err) {
    return { success: false, error: "Network error" };
  }
}
