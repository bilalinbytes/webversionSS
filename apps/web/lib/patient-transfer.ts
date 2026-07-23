import type { PatientData } from "./patient-types";
export { validatePatientId } from "@o2plus/core";

export async function startPatientImportOTP(
  patientId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch("/api/transfer/start-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patient_mobile: patientId }),
    credentials: "include",
  });

  const data = await res.json() as { message?: string; error?: string };
  if (!res.ok) {
    return { success: false, error: data.error ?? data.message ?? "Unable to send OTP." };
  }
  return { success: true, message: data.message };
}

export async function importPatientWithOTP(
  _doctorId: string,
  patientId: string,
  otpCode: string
): Promise<{ success: boolean; patientData?: PatientData; error?: string }> {
  const res = await fetch("/api/transfer/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patient_mobile: patientId, code: otpCode }),
    credentials: "include",
  });

  const data = await res.json() as { success?: boolean; patientData?: PatientData; error?: string };

  if (!res.ok) {
    return { success: false, error: data.error ?? "Transfer failed. Please try again." };
  }

  return { success: true, patientData: data.patientData };
}
