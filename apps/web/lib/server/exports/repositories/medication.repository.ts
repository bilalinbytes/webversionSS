import type { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type MedicationRow = Database["public"]["Tables"]["medications"]["Row"];

export async function fetchMedicationsByPatientIds(
  admin: AdminClient,
  patientIds: string[],
): Promise<MedicationRow[]> {
  if (patientIds.length === 0) return [];
  const { data, error } = await admin
    .from("medications")
    .select("*")
    .in("patient_id", patientIds)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching medications:", error);
    return [];
  }
  return data ?? [];
}
