import type { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type ScoreRow = Database["public"]["Tables"]["red_flag_scores"]["Row"];

export async function fetchRiskScoresByPatientIds(
  admin: AdminClient,
  patientIds: string[],
): Promise<ScoreRow[]> {
  if (patientIds.length === 0) return [];
  const { data, error } = await admin
    .from("red_flag_scores")
    .select("*")
    .in("patient_id", patientIds)
    .order("computed_at", { ascending: false });

  if (error) {
    console.error("Error fetching red_flag_scores:", error);
    return [];
  }
  return data ?? [];
}
