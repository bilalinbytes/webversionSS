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
  page: { padding: 36, backgroundColor: "#ffffff", fontSize: 9.5, color: "#0f2b48", fontFamily: "Helvetica" },
  topBar: { height: 4, backgroundColor: "#0284c7", marginBottom: 14, borderRadius: 2 },
  header: { borderBottomWidth: 1, borderBottomColor: "#1e6091", paddingBottom: 12, marginBottom: 14, flexDirection: "row", justifyContent: "space-between" },
  headerLeft: {},
  headerRight: { textAlign: "right" },
  title: { fontSize: 18, fontWeight: "bold", color: "#0f2b48", marginBottom: 4 },
  meta: { fontSize: 9.5, color: "#4b5563", marginBottom: 2 },
  metaBold: { fontWeight: "bold", color: "#0f2b48" },

  // Prescription Update / Changes Banner
  updateBox: { marginTop: 10, marginBottom: 10, padding: 12, backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#0284c7", borderRadius: 6 },
  updateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#bae6fd", paddingBottom: 6, marginBottom: 8 },
  updateTitle: { fontSize: 11, fontWeight: "bold", color: "#0369a1" },
  updateTime: { fontSize: 8.5, color: "#64748b" },
  updateGrid: { gap: 6 },
  changeGroup: { marginBottom: 4 },
  changeGroupTitle: { fontSize: 9, fontWeight: "bold", marginBottom: 2 },
  changeItem: { fontSize: 8.5, color: "#334155", marginLeft: 8, marginBottom: 1.5 },
  stoppedTag: { color: "#dc2626", fontWeight: "bold" },
  startedTag: { color: "#16a34a", fontWeight: "bold" },
  modifiedTag: { color: "#d97706", fontWeight: "bold" },

  section: { marginTop: 14 },
  sectionTitle: { fontSize: 11.5, fontWeight: "bold", color: "#1e6091", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 6 },
  rowEven: { backgroundColor: "#f8fafc" },
  rowHeader: { backgroundColor: "#e0f2fe", fontWeight: "bold", color: "#0369a1", borderRadius: 4 },
  cellNo: { width: "7%", paddingHorizontal: 4 },
  cellRoute: { width: "12%", paddingHorizontal: 4 },
  cellDrug: { width: "25%", paddingHorizontal: 4, fontWeight: "bold", color: "#0f172a" },
  cell: { width: "11%", paddingHorizontal: 4 },
  cellFreq: { width: "14%", paddingHorizontal: 4 },
  cellDate: { width: "10%", paddingHorizontal: 4 },
  instruction: { borderWidth: 1, borderColor: "#cbd5e1", padding: 10, minHeight: 40, lineHeight: 1.45, borderRadius: 4, backgroundColor: "#f8fafc", fontSize: 9 },
  footer: { position: "absolute", left: 36, right: 36, bottom: 24, flexDirection: "row", justifyContent: "space-between", color: "#94a3b8", fontSize: 8.5, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
  
  trendRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 4 },
  trendCellDate: { width: "20%", color: "#64748b", fontSize: 8 },
  trendCellValue: { width: "80%", fontSize: 8 },
  trendGrid: { flexDirection: "row", flexWrap: "wrap" },
  trendBox: { width: "48%", marginBottom: 12, marginRight: "2%" },
});

export interface PrescriptionChangeSummary {
  updated_at?: string;
  prescription_date?: string;
  doctor_name?: string;
  has_changes?: boolean;
  stopped?: Array<{ name: string; details?: string; route?: string; dose?: string }>;
  started?: Array<{ name: string; details?: string; route?: string; dose?: string; frequency?: string }>;
  modified?: Array<{ name: string; details?: string; from?: string; to?: string }>;
}

function PrescriptionPdfDocument({
  patientName,
  doctorName,
  generatedAt,
  prescriptionDate,
  medications,
  discontinuedMedications,
  instruction,
  recentLogs,
  changes,
}: {
  patientName: string;
  doctorName: string;
  generatedAt: string;
  prescriptionDate: string;
  medications: any[];
  discontinuedMedications?: any[];
  instruction: string | null;
  recentLogs: any[];
  changes?: PrescriptionChangeSummary | null;
}) {
  const generatedLabel = new Date(generatedAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasStopped = Boolean(changes?.stopped && changes.stopped.length > 0);
  const hasStarted = Boolean(changes?.started && changes.started.length > 0);
  const hasModified = Boolean(changes?.modified && changes.modified.length > 0);
  const hasAnyChange = hasStopped || hasStarted || hasModified;

  const changeTimeLabel = changes?.updated_at
    ? new Date(changes.updated_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : generatedLabel;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: pdfStyles.page },
      // Header Bar
      React.createElement(View, { style: pdfStyles.topBar }),
      
      // Header
      React.createElement(
        View,
        { style: pdfStyles.header },
        React.createElement(
          View,
          { style: pdfStyles.headerLeft },
          React.createElement(Text, { style: pdfStyles.title }, "Medical Prescription"),
          React.createElement(Text, { style: pdfStyles.meta }, "Patient: ", React.createElement(Text, { style: pdfStyles.metaBold }, patientName)),
          React.createElement(Text, { style: pdfStyles.meta }, "Doctor: ", React.createElement(Text, { style: pdfStyles.metaBold }, doctorName)),
        ),
        React.createElement(
          View,
          { style: pdfStyles.headerRight },
          React.createElement(Text, { style: pdfStyles.meta }, "Prescription Date: ", React.createElement(Text, { style: pdfStyles.metaBold }, prescriptionDate)),
          React.createElement(Text, { style: pdfStyles.meta }, `Issued: ${generatedLabel}`),
        ),
      ),

      // Highlighted Prescription Update Box if prescription was modified/changed
      hasAnyChange && React.createElement(
        View,
        { style: pdfStyles.updateBox },
        React.createElement(
          View,
          { style: pdfStyles.updateHeader },
          React.createElement(Text, { style: pdfStyles.updateTitle }, "Prescription Updated · Recent Changes"),
          React.createElement(Text, { style: pdfStyles.updateTime }, `Updated: ${changeTimeLabel}`),
        ),
        React.createElement(
          View,
          { style: pdfStyles.updateGrid },
          hasStopped && React.createElement(
            View,
            { style: pdfStyles.changeGroup },
            React.createElement(Text, { style: [pdfStyles.changeGroupTitle, pdfStyles.stoppedTag] }, "🔴 Discontinued / Deleted:"),
            ...(changes?.stopped ?? []).map((m, idx) =>
              React.createElement(Text, { key: `stopped-${idx}`, style: pdfStyles.changeItem }, `• Medication deleted/discontinued: ${m.name} ${m.details || m.dose || ""}`.trim())
            ),
          ),
          hasStarted && React.createElement(
            View,
            { style: pdfStyles.changeGroup },
            React.createElement(Text, { style: [pdfStyles.changeGroupTitle, pdfStyles.startedTag] }, "🟢 Newly Prescribed:"),
            ...(changes?.started ?? []).map((m, idx) =>
              React.createElement(Text, { key: `started-${idx}`, style: pdfStyles.changeItem }, `• New medication added: ${m.name} ${m.details || `${m.dose || ""} ${m.frequency || ""}`}`.trim())
            ),
          ),
          hasModified && React.createElement(
            View,
            { style: pdfStyles.changeGroup },
            React.createElement(Text, { style: [pdfStyles.changeGroupTitle, pdfStyles.modifiedTag] }, "🟡 Modified:"),
            ...(changes?.modified ?? []).map((m, idx) =>
              React.createElement(Text, { key: `mod-${idx}`, style: pdfStyles.changeItem }, `• Medication modified: ${m.name} — ${m.details || `${m.from || ""} → ${m.to || ""}`}`.trim())
            ),
          ),
        ),
      ),

      // Current Active Medications
      React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Current Active Medication Regimen"),
        React.createElement(
          View,
          { style: [pdfStyles.row, pdfStyles.rowHeader] },
          React.createElement(Text, { style: pdfStyles.cellNo }, "S.No"),
          React.createElement(Text, { style: pdfStyles.cellRoute }, "Route"),
          React.createElement(Text, { style: pdfStyles.cellDrug }, "Drug Name"),
          React.createElement(Text, { style: pdfStyles.cell }, "Dose"),
          React.createElement(Text, { style: pdfStyles.cell }, "Unit"),
          React.createElement(Text, { style: pdfStyles.cellFreq }, "Freq"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "Start"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "Status")
        ),
        medications.length === 0 
          ? React.createElement(Text, { style: { padding: 10, color: "#64748b" } }, "No active medications.")
          : medications.map((medication, index) => {
              const isNewlyAdded = changes?.started?.some((s) => s.name.toLowerCase() === (medication.drug_name || "").toLowerCase());
              return React.createElement(
                View,
                { key: index, style: [pdfStyles.row, index % 2 === 1 ? pdfStyles.rowEven : {}] },
                React.createElement(Text, { style: pdfStyles.cellNo }, String(medication.serial_number ?? index + 1)),
                React.createElement(Text, { style: pdfStyles.cellRoute }, medication.route),
                React.createElement(
                  Text,
                  { style: pdfStyles.cellDrug },
                  medication.drug_name,
                  isNewlyAdded ? " (✨ NEW)" : ""
                ),
                React.createElement(Text, { style: pdfStyles.cell }, medication.dose !== null ? String(medication.dose) : "-"),
                React.createElement(Text, { style: pdfStyles.cell }, medication.dose_unit ?? "-"),
                React.createElement(Text, { style: pdfStyles.cellFreq }, medication.frequency ?? "-"),
                React.createElement(Text, { style: pdfStyles.cellDate }, medication.start_date ?? prescriptionDate),
                React.createElement(Text, { style: [pdfStyles.cellDate, { color: isNewlyAdded ? "#0369a1" : "#166534", fontFamily: "Helvetica-Bold" }] }, isNewlyAdded ? "Newly Added" : "Active")
              );
            })
      ),

      // Discontinued Medications Table (if any)
      discontinuedMedications && discontinuedMedications.length > 0 && React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: [pdfStyles.sectionTitle, { color: "#dc2626" }] }, "🔴 Discontinued / Stopped Medications"),
        React.createElement(
          View,
          { style: [pdfStyles.row, pdfStyles.rowHeader, { backgroundColor: "#fef2f2" }] },
          React.createElement(Text, { style: pdfStyles.cellNo }, "S.No"),
          React.createElement(Text, { style: pdfStyles.cellRoute }, "Route"),
          React.createElement(Text, { style: pdfStyles.cellDrug }, "Drug Name"),
          React.createElement(Text, { style: pdfStyles.cell }, "Dose"),
          React.createElement(Text, { style: pdfStyles.cell }, "Unit"),
          React.createElement(Text, { style: pdfStyles.cellFreq }, "Freq"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "Start"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "Discontinued")
        ),
        ...discontinuedMedications.map((medication, index) =>
          React.createElement(
            View,
            { key: `disc-${index}`, style: [pdfStyles.row, index % 2 === 1 ? pdfStyles.rowEven : {}] },
            React.createElement(Text, { style: pdfStyles.cellNo }, String(index + 1)),
            React.createElement(Text, { style: pdfStyles.cellRoute }, medication.route),
            React.createElement(Text, { style: [pdfStyles.cellDrug, { color: "#dc2626", textDecoration: "line-through" }] }, medication.drug_name),
            React.createElement(Text, { style: pdfStyles.cell }, medication.dose !== null ? String(medication.dose) : "-"),
            React.createElement(Text, { style: pdfStyles.cell }, medication.dose_unit ?? "-"),
            React.createElement(Text, { style: pdfStyles.cellFreq }, medication.frequency ?? "-"),
            React.createElement(Text, { style: pdfStyles.cellDate }, medication.start_date ?? "-"),
            React.createElement(Text, { style: [pdfStyles.cellDate, { color: "#dc2626", fontFamily: "Helvetica-Bold" }] }, medication.end_date ?? "Stopped")
          )
        )
      ),

      // Instructions
      React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Doctor's Instructions & Care Advice"),
        React.createElement(Text, { style: pdfStyles.instruction }, instruction || "Take medications regularly as prescribed. Report any acute breathlessness or red flag symptoms immediately.")
      ),

      // Trend Data Section
      recentLogs.length > 0 && React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Recent Patient Trends (Last 7 Logs)"),
        React.createElement(
          View,
          { style: pdfStyles.trendGrid },
          
          // SpO2 Trend
          React.createElement(View, { style: pdfStyles.trendBox }, 
            React.createElement(Text, { style: { fontWeight: "bold", marginBottom: 4 } }, "SpO2 Trend"),
            recentLogs.map((log, i) => React.createElement(View, { key: "spo2-"+i, style: pdfStyles.trendRow }, 
              React.createElement(Text, { style: pdfStyles.trendCellDate }, log.date),
              React.createElement(Text, { style: pdfStyles.trendCellValue }, (log.spo2_rest ? log.spo2_rest+"% (Rest)" : "-") + " | " + (log.spo2_exertion ? log.spo2_exertion+"% (Walk)" : "-"))
            ))
          ),

          // MMRC Trend
          React.createElement(View, { style: pdfStyles.trendBox }, 
            React.createElement(Text, { style: { fontWeight: "bold", marginBottom: 4 } }, "mMRC Score"),
            recentLogs.map((log, i) => React.createElement(View, { key: "mmrc-"+i, style: pdfStyles.trendRow }, 
              React.createElement(Text, { style: pdfStyles.trendCellDate }, log.date),
              React.createElement(Text, { style: pdfStyles.trendCellValue }, log.mmrc_today !== null ? String(log.mmrc_today) : "-")
            ))
          ),

          // Symptom Trend
          React.createElement(View, { style: pdfStyles.trendBox }, 
            React.createElement(Text, { style: { fontWeight: "bold", marginBottom: 4 } }, "Symptoms & Severity"),
            recentLogs.map((log, i) => {
              let symStr = "-";
              if (log.vas_symptoms && typeof log.vas_symptoms === "object") {
                const entries = Object.entries(log.vas_symptoms);
                if (entries.length > 0) symStr = entries.map(e => e[0] + " (" + e[1] + ")").join(", ");
              }
              return React.createElement(View, { key: "sym-"+i, style: pdfStyles.trendRow }, 
                React.createElement(Text, { style: pdfStyles.trendCellDate }, log.date),
                React.createElement(Text, { style: pdfStyles.trendCellValue }, symStr)
              );
            })
          ),

          // Adherence Trend
          React.createElement(View, { style: pdfStyles.trendBox }, 
            React.createElement(Text, { style: { fontWeight: "bold", marginBottom: 4 } }, "Medication Adherence"),
            recentLogs.map((log, i) => {
              let adStr = "-";
              if (log.medication_compliance && typeof log.medication_compliance === "object") {
                const entries = Object.entries(log.medication_compliance);
                const taken = entries.filter(e => e[1]).length;
                if (entries.length > 0) adStr = taken + " / " + entries.length + " Taken";
              }
              return React.createElement(View, { key: "ad-"+i, style: pdfStyles.trendRow }, 
                React.createElement(Text, { style: pdfStyles.trendCellDate }, log.date),
                React.createElement(Text, { style: pdfStyles.trendCellValue }, adStr)
              );
            })
          )
        )
      ),

      // Footer
      React.createElement(
        View,
        { style: pdfStyles.footer },
        React.createElement(Text, null, "O2Plus Respiratory Care Platform · Valid Clinical Record"),
        React.createElement(Text, null, "Doctor Signature: ____________________")
      )
    )
  );
}

async function renderPrescriptionPdfBuffer(props: React.ComponentProps<typeof PrescriptionPdfDocument>) {
  const rendered = await pdf(
    React.createElement(PrescriptionPdfDocument, props) as React.ReactElement<DocumentProps>
  ).toBuffer();
  if (Buffer.isBuffer(rendered)) return rendered;
  const arrayBuffer = await new Response(rendered as unknown as BodyInit).arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    const patientId = p.id;
    const body = await request.json();
    const instructionText = (body.patient_instruction || body.instruction_text)?.trim();
    const prescriptionDate = body.prescription_date || new Date().toISOString().split("T")[0]!;
    const medicationsList: any[] = body.medications || [];
    const stoppedMedicationIds: string[] = body.stopped_medication_ids || [];

    if (instructionText) {
      const wordLimit = PATIENT_INSTRUCTION_WORD_LIMIT;
      if (wordCount(instructionText) > wordLimit) {
        return NextResponse.json({ error: `Instruction text exceeds ${wordLimit} words limit` }, { status: 400 });
      }
    }

    const admin = createAdminClient();

    // Fetch doctor name
    const { data: doctor } = await admin
      .from("doctors")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    const doctorName = doctor?.name ?? "Attending Doctor";

    // Fetch existing medications to compute diffs accurately
    const { data: existingMeds } = await admin
      .from("medications")
      .select("*")
      .eq("patient_id", patientId);

    const existingMap = new Map((existingMeds || []).map((m) => [m.id, m]));

    // Handle stopped medications
    if (stoppedMedicationIds.length > 0) {
      await admin
        .from("medications")
        .update({ end_date: prescriptionDate })
        .in("id", stoppedMedicationIds)
        .eq("patient_id", patientId);
    }

    // Process new & modified medications
    const activeDrafts = medicationsList.filter((m: any) => m.drug_name && m.drug_name.trim() && m.status !== "stopped");

    if (activeDrafts.length > 0) {
      const insertRows = activeDrafts.map((m: any, idx: number) => ({
        patient_id: patientId,
        prescribed_by_doctor_id: user.id,
        route: m.route || "Tablet",
        drug_name: m.drug_name.trim(),
        dose: m.dose !== null && m.dose !== undefined && m.dose !== "" ? Number(m.dose) : null,
        dose_unit: m.dose_unit || null,
        frequency: m.frequency || "OD",
        start_date: prescriptionDate,
        end_date: m.end_date || null,
        serial_number: idx + 1,
      }));

      await admin.from("medications").insert(insertRows);
    }

    // Compute diff: Stopped, Started, Modified
    const stoppedChanges: Array<{ name: string; details: string; route?: string; dose?: string }> = [];
    const startedChanges: Array<{ name: string; details: string; route?: string; dose?: string; frequency?: string }> = [];
    const modifiedChanges: Array<{ name: string; details: string; from?: string; to?: string }> = [];

    // Stopped
    for (const stoppedId of stoppedMedicationIds) {
      const existing = existingMap.get(stoppedId);
      if (existing) {
        stoppedChanges.push({
          name: existing.drug_name,
          details: `${existing.route || "Tablet"} · ${[existing.dose, existing.dose_unit].filter(Boolean).join(" ")}`,
          route: existing.route,
          dose: [existing.dose, existing.dose_unit].filter(Boolean).join(" "),
        });
      }
    }

    // Started & Modified from draft list
    for (const m of medicationsList) {
      if (m.status === "new" && m.drug_name?.trim()) {
        const doseStr = [m.dose, m.dose_unit].filter(Boolean).join(" ");
        startedChanges.push({
          name: m.drug_name.trim(),
          details: `${m.route || "Tablet"}${doseStr ? ` · ${doseStr}` : ""}${m.frequency ? ` · ${m.frequency}` : ""}`,
          route: m.route,
          dose: doseStr,
          frequency: m.frequency,
        });
      } else if (m.status === "modified" && m.drug_name?.trim()) {
        const existing = m.source_id ? existingMap.get(m.source_id) : null;
        const fromDose = existing ? `${[existing.dose, existing.dose_unit].filter(Boolean).join(" ")} ${existing.frequency || ""}`.trim() : "previous";
        const toDose = `${[m.dose, m.dose_unit].filter(Boolean).join(" ")} ${m.frequency || ""}`.trim();
        modifiedChanges.push({
          name: m.drug_name.trim(),
          details: `${fromDose} → ${toDose} (dosage/instructions changed)`,
          from: fromDose,
          to: toDose,
        });
      }
    }

    // Save doctor instruction
    let savedInstructionId = null;
    if (instructionText) {
      const ins = await admin
        .from("doctor_instructions")
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          instruction_text: instructionText,
        })
        .select("id")
        .single();
      if (ins.error) throw ins.error;
      savedInstructionId = ins.data.id;
    }

    const changesSummary: PrescriptionChangeSummary = {
      updated_at: new Date().toISOString(),
      prescription_date: prescriptionDate,
      doctor_name: doctorName,
      has_changes: stoppedChanges.length > 0 || startedChanges.length > 0 || modifiedChanges.length > 0,
      stopped: stoppedChanges,
      started: startedChanges,
      modified: modifiedChanges,
    };

    // Save prescription update in audit log
    await admin.from("audit_logs").insert({
      action: "prescription_updated",
      actor_id: user.id,
      actor_role: "doctor",
      target_patient_id: patientId,
      metadata: {
        ...changesSummary,
      },
    });

    return NextResponse.json({
      success: true,
      instruction_id: savedInstructionId,
      changes: changesSummary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    const patientId = p.id;
    const url = new URL(request.url);
    const requestedFormat = url.searchParams.get("format");
    const requestedDate = url.searchParams.get("date");

    const admin = createAdminClient();

    // Fetch latest changes audit log
    const { data: latestAudit } = await admin
      .from("audit_logs")
      .select("created_at, metadata")
      .eq("action", "prescription_updated")
      .eq("target_patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let latestChanges: PrescriptionChangeSummary | null = null;
    if (latestAudit?.metadata && typeof latestAudit.metadata === "object") {
      const meta = latestAudit.metadata as Record<string, any>;
      if (meta.changes || meta.stopped || meta.started || meta.modified) {
        latestChanges = {
          updated_at: meta.updated_at ?? latestAudit.created_at,
          prescription_date: meta.prescription_date,
          doctor_name: meta.doctor_name,
          has_changes: Boolean(
            (meta.stopped?.length ?? 0) > 0 ||
            (meta.started?.length ?? 0) > 0 ||
            (meta.modified?.length ?? 0) > 0
          ),
          stopped: meta.stopped ?? meta.changes?.stopped ?? [],
          started: meta.started ?? meta.changes?.started ?? [],
          modified: meta.modified ?? meta.changes?.modified ?? [],
        };
      }
    }

    if (requestedFormat === "pdf") {
      const prescriptionDate: string = requestedDate || (new Date().toISOString().split("T")[0] as string);
      
      const [patientRes, doctorRes, medsRes, instructionRes, logsRes] = await Promise.all([
        admin.from("patients").select("name").eq("id", patientId).maybeSingle(),
        admin.from("doctors").select("name").eq("id", user.id).maybeSingle(),
        admin
          .from("medications")
          .select("drug_name, dose, dose_unit, route, frequency, start_date, end_date, serial_number")
          .eq("patient_id", patientId)
          .order("serial_number", { ascending: true }),
        admin
          .from("doctor_instructions")
          .select("instruction_text")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("daily_logs")
          .select("logged_at, spo2_rest, spo2_exertion, mmrc_today, vas_symptoms, medication_compliance, disease_specific_data")
          .eq("patient_id", patientId)
          .order("logged_at", { ascending: false })
          .limit(7)
      ]);

      if (patientRes.error || doctorRes.error || medsRes.error || instructionRes.error || logsRes.error) {
        return NextResponse.json({ error: "Failed to fetch PDF data" }, { status: 500 });
      }

      const today = new Date().toISOString().split("T")[0]!;
      const activeMeds = (medsRes.data || []).filter(
        (m) => (!m.end_date || m.end_date > today) && (!m.start_date || m.start_date <= today || m.start_date === prescriptionDate)
      );
      const discontinuedMeds = (medsRes.data || []).filter(
        (m) => m.end_date && m.end_date <= today && m.start_date !== prescriptionDate
      );
      
      const formattedLogs = (logsRes.data || []).map(log => ({
        date: new Date(log.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        ...log
      }));

      const generatedAt = new Date().toISOString();
      const pdfBuffer = await renderPrescriptionPdfBuffer({
        patientName: patientRes.data?.name ?? "Patient",
        doctorName: doctorRes.data?.name ?? "Doctor",
        generatedAt,
        prescriptionDate,
        medications: activeMeds,
        discontinuedMedications: discontinuedMeds,
        instruction: instructionRes.data?.instruction_text ?? null,
        recentLogs: formattedLogs,
        changes: latestChanges,
      });
      const filename = "o2plus-prescription-" + prescriptionDate + "-" + generatedAt.replace(/[:.]/g, "-") + ".pdf";

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=\"" + filename + "\"",
        },
      });
    }

    // Default JSON response for doctor dashboard
    const [{ data: meds, error: medsError }, { data: instruction, error: instructionError }] = await Promise.all([
      admin
        .from("medications")
        .select("id, drug_name, dose, dose_unit, route, frequency, start_date, end_date, serial_number, created_at")
        .eq("patient_id", patientId)
        .order("start_date", { ascending: false })
        .order("serial_number", { ascending: true }),
      admin
        .from("doctor_instructions")
        .select("id, instruction_text, created_at, read_by_patient_at")
        .eq("patient_id", patientId)
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

    return NextResponse.json({
      prescriptions,
      instruction: instruction ?? null,
      latest_changes: latestChanges,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
