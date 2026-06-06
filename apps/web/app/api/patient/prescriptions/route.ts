import { NextResponse } from "next/server";
import React from "react";
import { Document, Page, StyleSheet, Text, View, pdf, type DocumentProps } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";

const pdfStyles = StyleSheet.create({
  page: { padding: 44, backgroundColor: "#ffffff", fontSize: 11, color: "#111827", fontFamily: "Helvetica" },
  header: { borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingBottom: 12, marginBottom: 18 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  meta: { fontSize: 10, color: "#4b5563", marginBottom: 3 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 7 },
  cellNo: { width: "9%" },
  cellRoute: { width: "12%" },
  cellDrug: { width: "20%" },
  cell: { width: "10%" },
  cellDate: { width: "12%" },
  cellStatus: { width: "15%" },
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
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Prescription List"),
        React.createElement(
          View,
          { style: [pdfStyles.row, { fontWeight: 700 }] },
          React.createElement(Text, { style: pdfStyles.cellNo }, "Serial number"),
          React.createElement(Text, { style: pdfStyles.cellRoute }, "Route"),
          React.createElement(Text, { style: pdfStyles.cellDrug }, "Drug Name"),
          React.createElement(Text, { style: pdfStyles.cell }, "Dose"),
          React.createElement(Text, { style: pdfStyles.cell }, "Unit"),
          React.createElement(Text, { style: pdfStyles.cell }, "Frequency"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "Start date"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "End date"),
          React.createElement(Text, { style: pdfStyles.cellStatus }, "Continue/discontinue"),
        ),
        ...medications.map((medication, index) =>
          React.createElement(
            View,
            { key: `${medication.drug_name}-${index}`, style: pdfStyles.row },
            React.createElement(Text, { style: pdfStyles.cellNo }, String(medication.serial_number ?? index + 1)),
            React.createElement(Text, { style: pdfStyles.cellRoute }, medication.route),
            React.createElement(Text, { style: pdfStyles.cellDrug }, medication.drug_name),
            React.createElement(Text, { style: pdfStyles.cell }, medication.dose !== null ? String(medication.dose) : "-"),
            React.createElement(Text, { style: pdfStyles.cell }, medication.dose_unit ?? "-"),
            React.createElement(Text, { style: pdfStyles.cell }, medication.frequency ?? "-"),
            React.createElement(Text, { style: pdfStyles.cellDate }, medication.start_date ?? prescriptionDate),
            React.createElement(Text, { style: pdfStyles.cellDate }, medication.end_date ?? "-"),
            React.createElement(Text, { style: pdfStyles.cellStatus }, medication.end_date ? "Discontinue" : "Continue"),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Patient Instructions"),
        React.createElement(Text, { style: pdfStyles.instruction }, instruction || " "),
      ),
      React.createElement(
        View,
        { style: pdfStyles.footer },
        React.createElement(Text, null, "Saans Sync prescription"),
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
    const filename = `saans-emergency-prescription-${prescriptionDate}-${generatedAt.replace(/[:.]/g, "-")}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
