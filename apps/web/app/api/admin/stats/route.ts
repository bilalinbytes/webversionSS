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

  const [doctorsRes, patientsRes, logsRes, alertsRes] = await Promise.all([
    admin.from("doctors").select("id, created_at", { count: "exact" }),
    admin.from("patients").select("id, created_at, doctor_id", { count: "exact" }),
    admin.from("daily_logs").select("id", { count: "exact" }),
    admin
      .from("disease_alerts")
      .select("id", { count: "exact" })
      .eq("acknowledged_by_doctor", false)
      .is("is_suppressed", null),
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newDoctorsThisMonth = (doctorsRes.data ?? []).filter(
    (d) => d.created_at && new Date(d.created_at) >= thirtyDaysAgo,
  ).length;

  const newPatientsThisMonth = (patientsRes.data ?? []).filter(
    (p) => p.created_at && new Date(p.created_at) >= thirtyDaysAgo,
  ).length;

  return NextResponse.json({
    totalDoctors: doctorsRes.count ?? 0,
    totalPatients: patientsRes.count ?? 0,
    totalLogs: logsRes.count ?? 0,
    openAlerts: alertsRes.count ?? 0,
    newDoctorsThisMonth,
    newPatientsThisMonth,
  });
}
