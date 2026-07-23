import type { ApiConfig } from "../types";

export async function getPatientProfile(config: ApiConfig, patientId: string) {
  return config.supabase
    .from("patients")
    .select("id, name, mobile_number, doctor_id, wants_appointments")
    .eq("id", patientId)
    .single();
}

export async function getPatientDiagnosis(config: ApiConfig, patientId: string) {
  return config.supabase
    .from("patient_diagnoses")
    .select("primary_diagnosis, effective_dashboard")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getPatientDailyLogs(config: ApiConfig, patientId: string, limit = 14) {
  return config.supabase
    .from("daily_logs")
    .select("logged_at, spo2_rest, mmrc_today, aqi_value, vas_symptoms, disease_specific_data, medication_compliance")
    .eq("patient_id", patientId)
    .order("logged_at", { ascending: false })
    .limit(limit);
}

export async function getPatientRedFlagScore(config: ApiConfig, patientId: string) {
  return config.supabase
    .from("red_flag_scores")
    .select("global_score")
    .eq("patient_id", patientId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .single();
}

export async function getPatientBaseline(config: ApiConfig, patientId: string) {
  return config.supabase
    .from("patient_baselines")
    .select("baseline_spo2")
    .eq("patient_id", patientId)
    .maybeSingle();
}

export async function getLatestPftRecord(config: ApiConfig, patientId: string) {
  return config.supabase
    .from("pft_records")
    .select("test_date, fev1_fvc_ratio, fev1, fvc, dlco")
    .eq("patient_id", patientId)
    .order("test_date", { ascending: false })
    .limit(1)
    .single();
}

export async function getPatientMedications(config: ApiConfig, patientId: string) {
  return config.supabase
    .from("medications")
    .select("id, drug_name, dose, dose_unit, end_date")
    .eq("patient_id", patientId)
    .order("start_date", { ascending: false });
}

export async function getPatientPreviousDayLog(config: ApiConfig, patientId: string) {
  const fetcher = config.fetch || globalThis.fetch;
  const baseUrl = config.baseUrl || "";
  try {
    const response = await fetcher(`${baseUrl}/api/patients/${patientId}/logs/history?days=30`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.logs || [];
  } catch {
    return [];
  }
}
