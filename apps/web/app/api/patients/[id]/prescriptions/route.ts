import { NextResponse } from "next/server";
import React from "react";
import { Document, Page, StyleSheet, Text, View, pdf, type DocumentProps } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";

const PATIENT_INSTRUCTION_WORD_LIMIT = 50;

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

const pdfStyles = StyleSheet.create({
  page: { padding: 44, backgroundColor: "#ffffff", fontSize: 11, color: "#111827", fontFamily: "Helvetica" },
  header: { borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingBottom: 12, marginBottom: 18 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  meta: { fontSize: 10, color: "#4b5563", marginBottom: 3 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 7 },
  cellNo: { width: "8%" },
  cellDrug: { width: "36%" },
  cell: { width: "14%" },
  instruction: { borderWidth: 1, borderColor: "#d1d5db", padding: 10, minHeight: 54, lineHeight: 1.5 },
  footer: { position: "absolute", left: 44, right: 44, bottom: 36, flexDirection: "row", justifyContent: "space-between", color: "#6b7280", fontSize: 9 },
});

function PrescriptionPdfDocument({
  patientName,
  doctorName,
  generatedAt,
  prescriptionDate,
  medications,
  instruction,
}: {
  patientName: string;
  doctorName: string;
  generatedAt: string;
  prescriptionDate: string;
  medications: Array<{ drug_name: string; route: string; dose: number | null; dose_unit: string | null; frequency: string | null; end_date: string | null; serial_number: number | null }>;
  instruction: string | null;
}) {
  const generatedLabel = new Date(generatedAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: pdfStyles.page },
      React.createElement(
        View,
        { style: pdfStyles.header },
        React.createElement(Text, { style: pdfStyles.title }, "Emergency Prescription"),
        React.createElement(Text, { style: pdfStyles.meta }, `Patient: ${patientName}`),
        React.createElement(Text, { style: pdfStyles.meta }, `Doctor: ${doctorName}`),
        React.createElement(Text, { style: pdfStyles.meta }, `Prescription date: ${prescriptionDate}`),
        React.createElement(Text, { style: pdfStyles.meta }, `Generated: ${generatedLabel}`),
      ),
      React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Medicines"),
        React.createElement(
          View,
          { style: [pdfStyles.row, { fontWeight: 700 }] },
          React.createElement(Text, { style: pdfStyles.cellNo }, "#"),
          React.createElement(Text, { style: pdfStyles.cellDrug }, "Drug"),
          React.createElement(Text, { style: pdfStyles.cell }, "Route"),
          React.createElement(Text, { style: pdfStyles.cell }, "Dose"),
          React.createElement(Text, { style: pdfStyles.cell }, "Frequency"),
          React.createElement(Text, { style: pdfStyles.cell }, "End"),
        ),
        ...medications.map((medication, index) =>
          React.createElement(
            View,
            { key: `${medication.drug_name}-${index}`, style: pdfStyles.row },
            React.createElement(Text, { style: pdfStyles.cellNo }, String(medication.serial_number ?? index + 1)),
            React.createElement(Text, { style: pdfStyles.cellDrug }, medication.drug_name),
            React.createElement(Text, { style: pdfStyles.cell }, medication.route),
            React.createElement(Text, { style: pdfStyles.cell }, medication.dose !== null ? `${medication.dose} ${medication.dose_unit ?? ""}` : "-"),
            React.createElement(Text, { style: pdfStyles.cell }, medication.frequency ?? "-"),
            React.createElement(Text, { style: pdfStyles.cell }, medication.end_date ?? "Ongoing"),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Instructions"),
        React.createElement(Text, { style: pdfStyles.instruction }, instruction || " "),
      ),
      React.createElement(
        View,
        { style: pdfStyles.footer },
        React.createElement(Text, null, "Plain A4 prescription"),
        React.createElement(Text, null, "Signature: ____________________"),
      ),
    ),
  );
}

async function renderPrescriptionPdfBuffer(props: React.ComponentProps<typeof PrescriptionPdfDocument>) {
  const rendered = await pdf(
    React.createElement(PrescriptionPdfDocument, props) as React.ReactElement<DocumentProps>,
  ).toBuffer();

  if (Buffer.isBuffer(rendered)) return rendered;
  const arrayBuffer = await new Response(rendered as unknown as BodyInit).arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function canAccessPatient(patientId: string, doctorId: string) {
  const admin = createAdminClient();
  const { data: patient } = await admin
    .from("patients")
    .select("id, doctor_id")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) return false;
  if (patient.doctor_id === doctorId) return true;
  const { data: grant } = await admin
    .from("audit_logs")
    .select("id")
    .eq("action", "patient_access_granted")
    .eq("actor_id", doctorId)
    .eq("target_patient_id", patientId)
    .limit(1)
    .maybeSingle();
  return Boolean(grant);
}

// ── GET /api/patients/[id]/prescriptions ──────────────────────────────────────
// Returns all medications grouped by prescription date (start_date),
// sorted newest first. Each group = one consultation's prescription.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: patientId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canAccessPatient(patientId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const url = new URL(request.url);
  const requestedFormat = url.searchParams.get("format");
  const requestedDate = url.searchParams.get("date");

  if (requestedFormat === "pdf") {
    const prescriptionDate = requestedDate ?? new Date().toISOString().split("T")[0]!;
    const [patientRes, doctorRes, medsRes, instructionRes] = await Promise.all([
      admin.from("patients").select("name").eq("id", patientId).maybeSingle(),
      admin.from("doctors").select("name").eq("id", user.id).maybeSingle(),
      admin
        .from("medications")
        .select("drug_name, dose, dose_unit, route, frequency, end_date, serial_number")
        .eq("patient_id", patientId)
        .eq("start_date", prescriptionDate)
        .order("serial_number", { ascending: true }),
      admin
        .from("doctor_instructions")
        .select("instruction_text")
        .eq("patient_id", patientId)
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (patientRes.error || doctorRes.error || medsRes.error || instructionRes.error) {
      return NextResponse.json({ error: patientRes.error?.message ?? doctorRes.error?.message ?? medsRes.error?.message ?? instructionRes.error?.message }, { status: 500 });
    }

    const generatedAt = new Date().toISOString();
    const pdfBuffer = await renderPrescriptionPdfBuffer({
      patientName: patientRes.data?.name ?? "Patient",
      doctorName: doctorRes.data?.name ?? "Doctor",
      generatedAt,
      prescriptionDate,
      medications: medsRes.data ?? [],
      instruction: instructionRes.data?.instruction_text ?? null,
    });
    const filename = `saans-prescription-${prescriptionDate}-${generatedAt.replace(/[:.]/g, "-")}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const [medsRes, instructionRes] = await Promise.all([
    admin
      .from("medications")
      .select("id, drug_name, dose, dose_unit, route, frequency, start_date, end_date, serial_number")
      .eq("patient_id", patientId)
      .order("start_date", { ascending: false })
      .order("serial_number", { ascending: true }),
    admin
      .from("doctor_instructions")
      .select("id, instruction_text, created_at")
      .eq("patient_id", patientId)
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (medsRes.error || instructionRes.error) {
    return NextResponse.json({ error: medsRes.error?.message ?? instructionRes.error?.message }, { status: 500 });
  }

  // Group by start_date (prescription date)
  const grouped: Record<string, typeof medsRes.data> = {};
  for (const med of medsRes.data ?? []) {
    const key = med.start_date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(med);
  }

  // Return as sorted array of { date, medications[] }
  const prescriptions = Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, medications]) => ({ date, medications }));

  return NextResponse.json({ prescriptions, instruction: instructionRes.data ?? null });
}

// ── POST /api/patients/[id]/prescriptions ─────────────────────────────────────
// Saves a new prescription (batch of medications) for today's date.
// Each drug in the batch gets start_date = today.
// Optionally marks previous drugs as ended (end_date = yesterday) if replaced.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: patientId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canAccessPatient(patientId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = createAdminClient();

  let body: {
    prescription_date: string;
    notes?: string;
    patient_instruction?: string;
    medications: Array<{
      drug_name: string;
      route: string;
      dose: number | null;
      dose_unit: string | null;
      frequency: string | null;
      end_date: string | null;
      status: "continue" | "modified" | "new" | "stopped";
    }>;
    stopped_medication_ids?: string[];
  };

  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prescription_date, medications, stopped_medication_ids } = body;
  const patientInstruction = body.patient_instruction?.trim() ?? "";

  if (!prescription_date || !medications?.length) {
    return NextResponse.json({ error: "prescription_date and medications are required" }, { status: 400 });
  }

  if (patientInstruction && wordCount(patientInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT) {
    return NextResponse.json({ error: "Patient instructions must be 50 words or fewer" }, { status: 400 });
  }

  // Mark stopped medications as ended
  if (stopped_medication_ids?.length) {
    const yesterday = new Date(prescription_date);
    yesterday.setDate(yesterday.getDate() - 1);
    const endDate = yesterday.toISOString().split("T")[0]!;

    await admin
      .from("medications")
      .update({ end_date: endDate })
      .in("id", stopped_medication_ids)
      .eq("patient_id", patientId);
  }

  // Saving the same consultation date replaces that prescription batch instead of stacking duplicates.
  const { error: deleteExistingError } = await admin
    .from("medications")
    .delete()
    .eq("patient_id", patientId)
    .eq("start_date", prescription_date);

  if (deleteExistingError) {
    return NextResponse.json({ error: deleteExistingError.message }, { status: 500 });
  }

  // Insert new/modified medications with the selected prescription date
  const inserts = medications
    .filter(m => m.status !== "stopped")
    .map((m, idx) => ({
      patient_id: patientId,
      prescribed_by_doctor_id: user.id,
      drug_name: m.drug_name,
      route: m.route,
      dose: m.dose,
      dose_unit: m.dose_unit,
      frequency: m.frequency,
      start_date: prescription_date,
      end_date: m.end_date ?? null,
      serial_number: idx + 1,
    }));

  if (inserts.length > 0) {
    const { error: insertError } = await admin.from("medications").insert(inserts);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  if (patientInstruction) {
    const { error: instructionError } = await admin
      .from("doctor_instructions")
      .insert({
        patient_id: patientId,
        doctor_id: user.id,
        instruction_text: patientInstruction,
      });

    if (instructionError) {
      return NextResponse.json({ error: instructionError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, saved: inserts.length });
}
