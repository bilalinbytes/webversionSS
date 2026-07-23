import type { ApiConfig } from "../types";
import type { DailyLogPayload } from "@o2plus/validation";

/**
 * Submits a daily log for the current patient.
 * Uses fetch pointing to the backend API by default since web uses HTTPOnly cookies,
 * but allows mobile to pass an auth token or use direct supabase insertion if needed.
 * For now, this mimics the web hook's fetch to /api/patient-logs.
 */
export async function submitDailyLog(
  config: ApiConfig,
  payload: DailyLogPayload,
  token?: string
): Promise<{ success: boolean; error?: string; limitReached?: boolean }> {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetcher(`${baseUrl}/api/patient-logs`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      return {
        success: false,
        error: data.error ?? `Server error (${response.status}). Please try again.`,
        limitReached: response.status === 429 && data.code === "daily_log_limit_reached",
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: "Network error. Your data has been preserved — please try again.",
    };
  }
}

export async function startPatientImportOTP(
  config: ApiConfig,
  mobile_number: string
): Promise<{ success: boolean; error?: string }> {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  try {
    const response = await fetcher(`${baseUrl}/api/patient-auth/start-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile_number }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.message || data.error || "Failed to send OTP" };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: "Network error while sending OTP" };
  }
}

export async function verifyPatientOTP(
  config: ApiConfig,
  mobile_number: string,
  otp: string,
  platform: "web" | "mobile" = "web"
): Promise<{ success: boolean; session?: any; error?: string }> {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  try {
    const response = await fetcher(`${baseUrl}/api/patient-auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile_number, otp, platform }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.message || data.error || "Invalid OTP" };
    }
    
    const data = await response.json();
    return { success: true, session: data.session };
  } catch (err) {
    return { success: false, error: "Network error while verifying OTP" };
  }
}
