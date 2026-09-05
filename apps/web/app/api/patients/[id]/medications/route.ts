import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: patientId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id, doctor_id")
    .eq("id", patientId)
    .single();

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  if (user.id !== patientId && user.id !== patient.doctor_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date().toISOString().split("T")[0] as string;

  const { data: medications } = await supabase
    .from("medications")
    .select(
      "id, drug_name, dose, dose_unit, route, frequency, start_date, end_date",
    )
    .eq("patient_id", patientId)
    .lte("start_date", today)
    .order("drug_name", { ascending: true });

  const rawActiveMeds = (medications ?? []).filter(
    (med) => !med.end_date || med.end_date > today,
  );

  const activeMeds: typeof rawActiveMeds = [];
  const seenActive = new Set<string>();
  const sorted = [...rawActiveMeds].sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
  for (const m of sorted) {
    const key = (m.drug_name ?? "").toLowerCase().trim();
    if (!seenActive.has(key)) {
      seenActive.add(key);
      activeMeds.push(m);
    }
  }

  return NextResponse.json({ medications: activeMeds });
}
