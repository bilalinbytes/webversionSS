import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";

function computeTrend(values: (number | null)[]): number[] {
  const result: number[] = [];
  let lastValue: number | null = null;

  for (const v of values) {
    if (v !== null) {
      lastValue = v;
      result.push(v);
    } else if (lastValue !== null) {
      result.push(lastValue);
    }
  }

  return result;
}

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: patientId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: patient } = await admin
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

  const url = new URL(request.url);
  let days = parseInt(url.searchParams.get("days") || "14", 10);
  days = Math.min(Math.max(days, 1), 90);

  const { data: logs } = await admin
    .from("daily_logs")
    .select("*")
    .eq("patient_id", patientId)
    .order("logged_at", { ascending: false })
    .limit(days);

  const typedLogs = (logs ?? []).map((row) => ({
    id: row.id,
    logged_at: row.logged_at,
    spo2_rest: row.spo2_rest,
    spo2_exertion: row.spo2_exertion,
    heart_rate: (row as any).heart_rate ?? (row.disease_specific_data as any)?.heart_rate ?? null,
    mmrc_today: row.mmrc_today,
    aqi_value: row.aqi_value,
    vas_symptoms: row.vas_symptoms as Record<string, number> | null,
    medication_compliance: row.medication_compliance as Record<string, boolean> | null,
    disease_specific_data: row.disease_specific_data as Record<string, unknown> | null,
  }));

  const spo2Values = typedLogs.map((l) => l.spo2_rest).reverse();
  const vasValues = typedLogs.map((l) => {
    if (!l.vas_symptoms) return null;
    const vals = Object.values(l.vas_symptoms);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }).reverse();

  const trends = {
    spo2: computeTrend(spo2Values),
    vas: computeTrend(vasValues),
  };

  return NextResponse.json({ logs: typedLogs, trends });
}
