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

  const [auditRes, exportsRes] = await Promise.all([
    admin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("export_records")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(50),
  ]);

  const auditLogs = auditRes.data ?? [];
  const exportRecords = exportsRes.data ?? [];

  // Combine into unified audit trail
  const combined = [
    ...auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.created_at,
      actor: log.actor_id ? `Doctor (${log.actor_id.slice(0, 8)})` : "Admin / System",
      action: log.action,
      resource: log.target_patient_id ? `Patient ${log.target_patient_id.slice(0, 8)}` : "Platform",
      status: "Success",
      details: log.metadata ? JSON.stringify(log.metadata) : "Standard action recorded",
      type: "access" as const,
    })),
    ...exportRecords.map((exp) => ({
      id: exp.id,
      timestamp: exp.generated_at,
      actor: exp.doctor_id ? `Doctor (${exp.doctor_id.slice(0, 8)})` : "Doctor",
      action: `export_${exp.export_type || "cohort"}`,
      resource: exp.patient_id ? `Patient ${exp.patient_id.slice(0, 8)}` : "Cohort",
      status: "Completed",
      details: `File object: ${exp.r2_object_key || "export file"}`,
      type: "export" as const,
    })),
  ].sort((a, b) => new Date(b.timestamp ?? "").getTime() - new Date(a.timestamp ?? "").getTime());

  return NextResponse.json({ logs: combined });
}
