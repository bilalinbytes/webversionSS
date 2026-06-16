import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";

function isAdminAuthorized(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  return verifyAdminToken(match?.[1]);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: patients, error } = await admin
    .from("patients")
    .select(`
      id,
      name,
      mobile_number,
      gender,
      date_of_birth,
      created_at,
      doctor_id,
      patient_diagnoses (
        primary_diagnosis,
        effective_dashboard
      ),
      red_flag_scores (
        global_score,
        risk_level,
        computed_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get doctor names for display
  const { data: doctors } = await admin
    .from("doctors")
    .select("id, name, hospital");

  const doctorMap = new Map<string, { name: string; hospital: string }>();
  for (const d of doctors ?? []) {
    doctorMap.set(d.id, { name: d.name, hospital: d.hospital });
  }

  const enriched = (patients ?? []).map((p) => {
    const latestDiagnosis = Array.isArray(p.patient_diagnoses)
      ? p.patient_diagnoses[0]
      : null;

    // Get latest red flag score
    const scores = Array.isArray(p.red_flag_scores)
      ? [...p.red_flag_scores].sort(
          (a, b) =>
            new Date(b.computed_at ?? "").getTime() -
            new Date(a.computed_at ?? "").getTime(),
        )
      : [];
    const latestScore = scores[0] ?? null;

    const doctor = p.doctor_id ? doctorMap.get(p.doctor_id) : null;

    return {
      id: p.id,
      name: p.name,
      mobile_number: p.mobile_number,
      gender: p.gender,
      date_of_birth: p.date_of_birth,
      enrolled_at: p.created_at,
      doctor_id: p.doctor_id,
      doctor_name: doctor?.name ?? null,
      doctor_hospital: doctor?.hospital ?? null,
      primary_diagnosis: latestDiagnosis?.primary_diagnosis ?? null,
      effective_dashboard: latestDiagnosis?.effective_dashboard ?? null,
      risk_level: latestScore?.risk_level ?? null,
      global_score: latestScore?.global_score ?? null,
    };
  });

  return NextResponse.json({ patients: enriched });
}
