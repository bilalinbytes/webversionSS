import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { executeExport } from "@/lib/server/exports/export.service";
import type { ExportRequestPayload } from "@/lib/server/exports/export.types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Resolve patient record from database
    const { data: patientRow } = await supabase
      .from("patients")
      .select("id, name, uhid")
      .eq("id", user.id)
      .maybeSingle();

    const patientName = patientRow?.name ?? "Patient";

    let body: { start_date?: string; end_date?: string; format?: "pdf" | "excel" } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body fallback
    }

    // Force single_patient PDF export
    const payload: ExportRequestPayload = {
      export_type: "single_patient",
      patient_id: user.id,
      format: "pdf",
      start_date: body.start_date,
      end_date: body.end_date,
    };

    const result = await executeExport(user.id, patientName, payload);

    return new NextResponse(result.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Patient report generation error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate health report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
