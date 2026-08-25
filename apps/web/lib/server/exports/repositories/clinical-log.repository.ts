import type { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type DailyLogRow = Database["public"]["Tables"]["daily_logs"]["Row"];

export async function fetchClinicalLogsByPatientIds(
  admin: AdminClient,
  patientIds: string[],
  options?: { startDate?: string; endDate?: string; limitPerPatient?: number },
): Promise<DailyLogRow[]> {
  if (patientIds.length === 0) return [];

  let query = admin
    .from("daily_logs")
    .select("*")
    .in("patient_id", patientIds)
    .order("logged_at", { ascending: false });

  if (options?.startDate) {
    query = query.gte("logged_at", options.startDate);
  }
  if (options?.endDate) {
    query = query.lte("logged_at", options.endDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching daily_logs:", error);
    return [];
  }
  return data ?? [];
}
