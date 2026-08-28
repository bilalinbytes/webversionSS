import { NextResponse } from "next/server";
import React from "react";
import { Document, Page, StyleSheet, Text, View, pdf, type DocumentProps } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";

const pdfStyles = StyleSheet.create({
  page: { padding: 36, backgroundColor: "#ffffff", fontSize: 9.5, color: "#0f172a", fontFamily: "Helvetica" },
  topBar: { height: 4, backgroundColor: "#0284c7", marginBottom: 14, borderRadius: 2 },
  header: { backgroundColor: "#0f2b48", color: "#ffffff", padding: 18, marginBottom: 16, borderRadius: 8 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4, color: "#ffffff" },
  subtitle: { fontSize: 10, color: "#93c5fd", marginBottom: 10 },
  headerGrid: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.18)", paddingTop: 8 },
  headerMetaLeft: { width: "50%" },
  headerMetaRight: { width: "50%", alignItems: "flex-end" },
  meta: { fontSize: 9, color: "#e2e8f0", marginBottom: 2 },
  metaBold: { fontWeight: "bold", color: "#ffffff" },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 11.5, fontWeight: "bold", marginBottom: 8, color: "#0369a1", borderBottomWidth: 1.5, borderBottomColor: "#bae6fd", paddingBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 7 },
  rowEven: { backgroundColor: "#f8fafc" },
  tableHeader: { flexDirection: "row", backgroundColor: "#e0f2fe", paddingVertical: 7, borderBottomWidth: 1.5, borderBottomColor: "#bae6fd", fontWeight: "bold", color: "#0369a1", borderRadius: 4 },
  cellNo: { width: "7%", paddingHorizontal: 4 },
  cellRoute: { width: "12%", paddingHorizontal: 4 },
  cellDrug: { width: "25%", paddingHorizontal: 4, fontWeight: "bold", color: "#0f172a" },
  cell: { width: "11%", paddingHorizontal: 4 },
  cellFreq: { width: "14%", paddingHorizontal: 4 },
  cellDate: { width: "10%", paddingHorizontal: 4 },
  instructionBox: { borderLeftWidth: 3.5, borderLeftColor: "#059669", backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", padding: 12, minHeight: 48, lineHeight: 1.45, borderRadius: 6 },
  instructionText: { fontSize: 9.5, color: "#166534" },
  footer: { position: "absolute", left: 36, right: 36, bottom: 28, flexDirection: "row", justifyContent: "space-between", color: "#64748b", fontSize: 8.5, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10 },
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
  medications: Array<{ drug_name: string; route: string; dose: number | null; dose_unit: string | null; frequency: string | null; start_date?: string | null; end_date: string | null; serial_number: number | null }>;
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
      React.createElement(View, { style: pdfStyles.topBar }),
      React.createElement(
        View,
        { style: pdfStyles.header },
        React.createElement(Text, { style: pdfStyles.title }, "Medical Prescription"),
        React.createElement(Text, { style: pdfStyles.subtitle }, "O2Plus Respiratory Care Platform"),
        React.createElement(
          View,
          { style: pdfStyles.headerGrid },
          React.createElement(
            View,
            { style: pdfStyles.headerMetaLeft },
            React.createElement(Text, { style: pdfStyles.meta }, `Patient: `, React.createElement(Text, { style: pdfStyles.metaBold }, patientName)),
            React.createElement(Text, { style: pdfStyles.meta }, `Doctor: `, React.createElement(Text, { style: pdfStyles.metaBold }, doctorName)),
          ),
          React.createElement(
            View,
            { style: pdfStyles.headerMetaRight },
            React.createElement(Text, { style: pdfStyles.meta }, `Prescription Date: `, React.createElement(Text, { style: pdfStyles.metaBold }, prescriptionDate)),
            React.createElement(Text, { style: pdfStyles.meta }, `Issued: ${generatedLabel}`),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Medication Regimen"),
        React.createElement(
          View,
          { style: pdfStyles.tableHeader },
          React.createElement(Text, { style: pdfStyles.cellNo }, "S.No"),
          React.createElement(Text, { style: pdfStyles.cellRoute }, "Route"),
          React.createElement(Text, { style: pdfStyles.cellDrug }, "Drug Name"),
          React.createElement(Text, { style: pdfStyles.cell }, "Dose"),
          React.createElement(Text, { style: pdfStyles.cell }, "Unit"),
          React.createElement(Text, { style: pdfStyles.cellFreq }, "Frequency"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "Start Date"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "End Date"),
        ),
        ...medications.map((medication, index) =>
          React.createElement(
            View,
            { key: `${medication.drug_name}-${index}`, style: [pdfStyles.row, index % 2 === 1 ? pdfStyles.rowEven : {}] },
            React.createElement(Text, { style: pdfStyles.cellNo }, String(medication.serial_number ?? index + 1)),
            React.createElement(Text, { style: pdfStyles.cellRoute }, medication.route),
            React.createElement(Text, { style: pdfStyles.cellDrug }, medication.drug_name),
            React.createElement(Text, { style: pdfStyles.cell }, medication.dose !== null ? String(medication.dose) : "-"),
            React.createElement(Text, { style: pdfStyles.cell }, medication.dose_unit ?? "-"),
            React.createElement(Text, { style: pdfStyles.cellFreq }, medication.frequency ?? "-"),
            React.createElement(Text, { style: pdfStyles.cellDate }, medication.start_date ?? prescriptionDate),
            React.createElement(Text, { style: pdfStyles.cellDate }, medication.end_date ?? "-"),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Doctor's Instructions & Care Advice"),
        React.createElement(
          View,
          { style: pdfStyles.instructionBox },
          React.createElement(Text, { style: pdfStyles.instructionText }, instruction || "Take medications regularly as prescribed. Report any acute breathlessness or red flag symptoms immediately."),
        ),
      ),
      React.createElement(
        View,
        { style: pdfStyles.footer },
        React.createElement(Text, null, "O2Plus Clinical Care Platform · Valid Medical Record"),
        React.createElement(Text, null, "Authorized Signature: ____________________"),
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

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: patient } = await admin
    .from("patients")
    .select("id, name, doctor_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!patient) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedFormat = url.searchParams.get("format");
  const requestedDate = url.searchParams.get("date");
  const requestedDisposition = url.searchParams.get("disposition");

  if (requestedFormat === "pdf") {
    const prescriptionDate = requestedDate ?? new Date().toISOString().split("T")[0]!;
    const [doctorRes, medsRes, instructionRes] = await Promise.all([
      patient.doctor_id
        ? admin.from("doctors").select("name").eq("id", patient.doctor_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      admin
        .from("medications")
        .select("drug_name, dose, dose_unit, route, frequency, start_date, end_date, serial_number")
        .eq("patient_id", patient.id)
        .eq("start_date", prescriptionDate)
        .order("serial_number", { ascending: true }),
      admin
        .from("doctor_instructions")
        .select("instruction_text")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (doctorRes.error || medsRes.error || instructionRes.error) {
      return NextResponse.json({ error: doctorRes.error?.message ?? medsRes.error?.message ?? instructionRes.error?.message }, { status: 500 });
    }

    const generatedAt = new Date().toISOString();
    const pdfBuffer = await renderPrescriptionPdfBuffer({
      patientName: patient.name ?? "Patient",
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
        "Content-Disposition": `${requestedDisposition === "inline" ? "inline" : "attachment"}; filename="${filename}"`,
      },
    });
  }

  const [{ data: meds, error: medsError }, { data: instruction, error: instructionError }] = await Promise.all([
    admin
      .from("medications")
      .select("id, drug_name, dose, dose_unit, route, frequency, start_date, end_date, serial_number, created_at")
      .eq("patient_id", patient.id)
      .order("start_date", { ascending: false })
      .order("serial_number", { ascending: true }),
    admin
      .from("doctor_instructions")
      .select("id, instruction_text, created_at, read_by_patient_at")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (medsError) {
    return NextResponse.json({ error: medsError.message }, { status: 500 });
  }

  if (instructionError) {
    return NextResponse.json({ error: instructionError.message }, { status: 500 });
  }

  const grouped: Record<string, typeof meds> = {};
  for (const med of meds ?? []) {
    const key = med.start_date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(med);
  }

  const prescriptions = Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, medications]) => {
      const createdAt = (medications ?? [])
        .map((medication) => medication.created_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

      return { date, created_at: createdAt, medications };
    });

  return NextResponse.json({ prescriptions, instruction: instruction ?? null });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { instruction_id?: string };
  try {
    body = await request.json() as { instruction_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.instruction_id) {
    return NextResponse.json({ error: "instruction_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("doctor_instructions")
    .update({ read_by_patient_at: new Date().toISOString() })
    .eq("id", body.instruction_id)
    .eq("patient_id", user.id)
    .is("read_by_patient_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
