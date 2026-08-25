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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: doctorRow } = await supabase
      .from("doctors")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    const doctorName = doctorRow?.name ?? "Doctor";

    let body: { patient_ids?: string[] } = {};
    try {
      body = (await request.json()) as { patient_ids?: string[] };
    } catch {
      // empty body
    }

    const payload: ExportRequestPayload = {
      export_type: body.patient_ids && body.patient_ids.length > 0 ? "selected_patients" : "all_patients",
      format: "excel",
      patient_ids: body.patient_ids,
    };

    const result = await executeExport(user.id, doctorName, payload);

    return new NextResponse(result.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Excel export error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate Excel export.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
