import type { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type PatientDiagnosisRow = Database["public"]["Tables"]["patient_diagnoses"]["Row"];

export async function fetchDiagnosesByPatientIds(
  admin: AdminClient,
  patientIds: string[],
): Promise<PatientDiagnosisRow[]> {
  if (patientIds.length === 0) return [];
  const { data, error } = await admin
    .from("patient_diagnoses")
    .select("*")
    .in("patient_id", patientIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching patient_diagnoses:", error);
    return [];
  }
  return data ?? [];
}
