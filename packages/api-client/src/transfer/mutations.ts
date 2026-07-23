import type { ApiConfig } from "../types";
import type { PatientData } from "@o2plus/types";

export async function startPatientImportOTP(
  config: ApiConfig,
  patientId: string,
  token?: string
): Promise<{ success: boolean; message?: string | undefined; error?: string }> {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetcher(`${baseUrl}/api/transfer/start-import`, {
      method: "POST",
      headers,
      body: JSON.stringify({ patient_mobile: patientId }),
      credentials: "omit",
    });

    const data = await res.json() as { message?: string; error?: string };
    if (!res.ok) {
      return { success: false, error: data.error ?? data.message ?? "Unable to send OTP." };
    }
    return { success: true, message: data.message };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function importPatientWithOTP(
  config: ApiConfig,
  patientId: string,
  otpCode: string,
  token?: string
): Promise<{ success: boolean; patientData?: PatientData | undefined; error?: string }> {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetcher(`${baseUrl}/api/transfer/import`, {
      method: "POST",
      headers,
      body: JSON.stringify({ patient_mobile: patientId, code: otpCode }),
      credentials: "omit",
    });

    const data = await res.json() as { success?: boolean; patientData?: PatientData; error?: string };

    if (!res.ok) {
      return { success: false, error: data.error ?? "Transfer failed. Please try again." };
    }

    return { success: true, patientData: data.patientData };
  } catch {
    return { success: false, error: "Network error" };
  }
}
