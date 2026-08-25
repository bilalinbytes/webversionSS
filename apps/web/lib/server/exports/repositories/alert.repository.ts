import type { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type AlertRow = Database["public"]["Tables"]["disease_alerts"]["Row"];

export async function fetchDiseaseAlertsByPatientIds(
  admin: AdminClient,
  patientIds: string[],
): Promise<AlertRow[]> {
  if (patientIds.length === 0) return [];
  const { data, error } = await admin
    .from("disease_alerts")
    .select("*")
    .in("patient_id", patientIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching disease_alerts:", error);
    return [];
  }
  return data ?? [];
}
