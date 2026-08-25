import type { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type RespSupportRow = Database["public"]["Tables"]["respiratory_support"]["Row"];

export async function fetchRespiratorySupportByPatientIds(
  admin: AdminClient,
  patientIds: string[],
): Promise<RespSupportRow[]> {
  if (patientIds.length === 0) return [];
  const { data, error } = await admin
    .from("respiratory_support")
    .select("*")
    .in("patient_id", patientIds);

  if (error) {
    console.error("Error fetching respiratory_support:", error);
    return [];
  }
  return data ?? [];
}
