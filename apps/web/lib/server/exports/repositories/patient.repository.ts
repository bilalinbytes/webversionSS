import type { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type PatientRow = Database["public"]["Tables"]["patients"]["Row"];

export async function fetchAuthorizedPatientIds(
  admin: AdminClient,
  doctorId: string,
): Promise<string[]> {
  const [primaryRes, transferredRes] = await Promise.all([
    admin.from("patients").select("id").eq("doctor_id", doctorId),
    admin
      .from("audit_logs")
      .select("target_patient_id")
      .eq("action", "patient_access_granted")
      .eq("actor_id", doctorId),
  ]);

  const primary = (primaryRes.data ?? []).map((r) => r.id).filter(Boolean);
  const transferred = (transferredRes.data ?? [])
    .map((r) => r.target_patient_id)
    .filter((id): id is string => Boolean(id));

  return Array.from(new Set([...primary, ...transferred]));
}

export async function fetchPatientsByIds(
  admin: AdminClient,
  patientIds: string[],
): Promise<PatientRow[]> {
  if (patientIds.length === 0) return [];
  const { data, error } = await admin
    .from("patients")
    .select("*")
    .in("id", patientIds)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching patients:", error);
    return [];
  }
  return data ?? [];
}
