import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";

function isAdminAuthorized(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`),
  );
  return verifyAdminToken(match?.[1]);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: doctors, error } = await admin
    .from("doctors")
    .select("id, name, email, hospital, specialisation, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch all patients with their diagnosis
  const { data: patients } = await admin
    .from("patients")
    .select(`
      id, name, mobile_number, gender, date_of_birth, created_at, doctor_id,
      patient_diagnoses ( primary_diagnosis, effective_dashboard )
    `)
    .order("created_at", { ascending: false });

  // Group patients by doctor_id
  const patientsByDoctor = new Map<
    string,
    {
      id: string;
      name: string;
      mobile_number: string | null;
      gender: string | null;
      date_of_birth: string | null;
      created_at: string | null;
      primary_diagnosis: string | null;
      effective_dashboard: string | null;
    }[]
  >();

  for (const p of patients ?? []) {
    if (!p.doctor_id) continue;
    const diag = Array.isArray(p.patient_diagnoses)
      ? p.patient_diagnoses[0]
      : null;

    const existing = patientsByDoctor.get(p.doctor_id) ?? [];
    existing.push({
      id: p.id,
      name: p.name,
      mobile_number: p.mobile_number,
      gender: p.gender,
      date_of_birth: p.date_of_birth,
      created_at: p.created_at,
      primary_diagnosis: diag?.primary_diagnosis ?? null,
      effective_dashboard: diag?.effective_dashboard ?? null,
    });
    patientsByDoctor.set(p.doctor_id, existing);
  }

  const enriched = (doctors ?? []).map((d) => ({
    ...d,
    patients: patientsByDoctor.get(d.id) ?? [],
    patient_count: (patientsByDoctor.get(d.id) ?? []).length,
  }));

  return NextResponse.json({ doctors: enriched });
}
