import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import type { Json } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type PatientDiagnosisSummary = {
  patient_id?: string | null;
  primary_diagnosis: string;
  effective_dashboard: string | null;
  comorbidities: Json | null;
  comorbidities_other_text: string | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: doctor } = await admin.from("doctors").select("id").eq("id", user.id).single();
  if (!doctor) {
    return NextResponse.json({ error: "Forbidden - not a doctor" }, { status: 403 });
  }

  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const searchParam = url.searchParams.get("search")?.trim().toLowerCase();

  const isPaginated = Boolean(pageParam || limitParam);
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(limitParam || "50", 10) || 50), 250);

  const { data: accessLogs } = await admin
    .from("audit_logs")
    .select("target_patient_id")
    .eq("action", "patient_access_granted")
    .eq("actor_id", user.id);

  const importedIds = (accessLogs ?? [])
    .map((row) => row.target_patient_id)
    .filter((id): id is string => Boolean(id));

  let query = admin
    .from("patients")
    .select(`
      id,
      name,
      date_of_birth,
      mobile_number,
      created_at,
      patient_diagnoses (
        primary_diagnosis,
        effective_dashboard,
        comorbidities,
        comorbidities_other_text
      ),
      red_flag_scores (
        global_score,
        risk_level,
        indicator_color,
        computed_at
      ),
      disease_alerts (
        alert_type,
        reason_text,
        created_at,
        acknowledged_by_doctor,
        is_suppressed
      )
    `, { count: "exact" })
    .or(`doctor_id.eq.${user.id}${importedIds.length > 0 ? `,id.in.(${importedIds.join(",")})` : ""}`)
    .order("created_at", { ascending: false });

  if (searchParam) {
    query = query.or(`name.ilike.%${searchParam}%,mobile_number.ilike.%${searchParam}%`);
  }

  if (isPaginated) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const patients = data ?? [];
  const totalCount = count ?? patients.length;
  const totalPages = isPaginated ? Math.ceil(totalCount / limit) : 1;
  const patientIds = patients.map((patient) => patient.id);

  let diagnosisByPatient = new Map<string, PatientDiagnosisSummary>();
  if (patientIds.length > 0) {
    const { data: diagnoses } = await admin
      .from("patient_diagnoses")
      .select("patient_id, primary_diagnosis, effective_dashboard, comorbidities, comorbidities_other_text, created_at")
      .in("patient_id", patientIds)
      .order("created_at", { ascending: false });

    for (const diagnosis of diagnoses ?? []) {
      if (!diagnosis.patient_id || !diagnosis.primary_diagnosis || diagnosisByPatient.has(diagnosis.patient_id)) {
        continue;
      }
      diagnosisByPatient.set(diagnosis.patient_id, {
        patient_id: diagnosis.patient_id,
        primary_diagnosis: diagnosis.primary_diagnosis,
        effective_dashboard: diagnosis.effective_dashboard ?? null,
        comorbidities: diagnosis.comorbidities,
        comorbidities_other_text: diagnosis.comorbidities_other_text,
      });
    }
  }

  const normalizedPatients = patients.map((patient) => {
    const latestDiagnosis = diagnosisByPatient.get(patient.id);
    return latestDiagnosis
      ? {
          ...patient,
          patient_diagnoses: [latestDiagnosis],
        }
      : patient;
  });

  return NextResponse.json({
    patients: normalizedPatients,
    pagination: {
      total: totalCount,
      page: isPaginated ? page : 1,
      limit: isPaginated ? limit : totalCount,
      totalPages,
    },
  });
}
