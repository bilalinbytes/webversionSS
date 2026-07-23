import type { PatientData } from "./patient-types";
export { validatePatientId } from "@o2plus/core";
import { startPatientImportOTP as apiStartOTP, importPatientWithOTP as apiImportOTP } from "@o2plus/api-client/transfer";

export async function startPatientImportOTP(
  patientId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  // Use dummy ApiConfig because it relies on web fetch
  return apiStartOTP({ supabase: null as any }, patientId);
}

export async function importPatientWithOTP(
  _doctorId: string,
  patientId: string,
  otpCode: string
): Promise<{ success: boolean; patientData?: PatientData; error?: string }> {
  // Use dummy ApiConfig
  return apiImportOTP({ supabase: null as any }, patientId, otpCode);
}
