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
      return NextResponse.json({ error: "Unauthorized. Please log in as a doctor." }, { status: 401 });
    }

    // Fetch doctor's display name
    const { data: doctorRow } = await supabase
      .from("doctors")
      .select("name, hospital")
      .eq("id", user.id)
      .maybeSingle();

    const doctorName = doctorRow?.name ?? "Doctor";

    let payload: ExportRequestPayload = { export_type: "all_patients", format: "excel" };
    try {
      payload = (await request.json()) as ExportRequestPayload;
    } catch {
      // Default to all_patients excel if empty body
    }

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
    console.error("Export generation error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate clinical export.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
