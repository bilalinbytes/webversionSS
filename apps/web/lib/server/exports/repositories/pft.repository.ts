import type { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type PftRow = Database["public"]["Tables"]["pft_records"]["Row"];

export async function fetchPftRecordsByPatientIds(
  admin: AdminClient,
  patientIds: string[],
): Promise<PftRow[]> {
  if (patientIds.length === 0) return [];
  const { data, error } = await admin
    .from("pft_records")
    .select("*")
    .in("patient_id", patientIds)
    .order("test_date", { ascending: false });

  if (error) {
    console.error("Error fetching pft_records:", error);
    return [];
  }
  return data ?? [];
}
