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

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, id } = body as { type?: string; id?: string };

  if (!type || !id) {
    return NextResponse.json(
      { error: "Missing type or id" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // ── Delete patient ──────────────────────────────────────────────────────────
  if (type === "patient") {
    // Delete related rows first (cascade may not cover auth.users)
    await Promise.all([
      admin.from("daily_logs").delete().eq("patient_id", id),
      admin.from("disease_alerts").delete().eq("patient_id", id),
      admin.from("red_flag_scores").delete().eq("patient_id", id),
      admin.from("medications").delete().eq("patient_id", id),
      admin.from("pft_records").delete().eq("patient_id", id),
      admin.from("respiratory_support").delete().eq("patient_id", id),
      admin.from("doctor_instructions").delete().eq("patient_id", id),
      admin.from("patient_diagnoses").delete().eq("patient_id", id),
      admin.from("audit_logs").delete().eq("target_patient_id", id),
    ]);

    const { error } = await admin.from("patients").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also delete from Supabase Auth
    await admin.auth.admin.deleteUser(id);

    return NextResponse.json({ ok: true });
  }

  // ── Delete doctor ───────────────────────────────────────────────────────────
  if (type === "doctor") {
    // Unlink patients (set doctor_id to null rather than delete them)
    await admin
      .from("patients")
      .update({ doctor_id: null })
      .eq("doctor_id", id);

    await Promise.all([
      admin.from("doctor_instructions").delete().eq("doctor_id", id),
      admin.from("export_records").delete().eq("doctor_id", id),
      admin.from("audit_logs").delete().eq("actor_id", id),
    ]);

    const { error } = await admin.from("doctors").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also delete from Supabase Auth
    await admin.auth.admin.deleteUser(id);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
