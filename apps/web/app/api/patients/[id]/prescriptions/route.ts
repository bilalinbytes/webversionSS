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
  page: { padding: 44, backgroundColor: "#ffffff", fontSize: 10, color: "#0f2b48", fontFamily: "Helvetica" },
  header: { borderBottomWidth: 1, borderBottomColor: "#1e6091", paddingBottom: 12, marginBottom: 18, flexDirection: "row", justifyContent: "space-between" },
  headerLeft: {},
  headerRight: { textAlign: "right" },
  title: { fontSize: 20, fontWeight: 700, color: "#0f2b48", marginBottom: 6 },
  meta: { fontSize: 10, color: "#4b5563", marginBottom: 3 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#1e6091", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 6 },
  rowHeader: { backgroundColor: "#f1f5f9", fontWeight: 700 },
  cellNo: { width: "9%", paddingHorizontal: 4 },
  cellRoute: { width: "12%", paddingHorizontal: 4 },
  cellDrug: { width: "20%", paddingHorizontal: 4 },
  cell: { width: "10%", paddingHorizontal: 4 },
  cellDate: { width: "12%", paddingHorizontal: 4 },
  cellStatus: { width: "15%", paddingHorizontal: 4 },
  instruction: { borderWidth: 1, borderColor: "#cbd5e1", padding: 10, minHeight: 40, lineHeight: 1.5, borderRadius: 4, backgroundColor: "#f8fafc" },
  footer: { position: "absolute", left: 44, right: 44, bottom: 36, flexDirection: "row", justifyContent: "space-between", color: "#94a3b8", fontSize: 9, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
  
  trendRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 4 },
  trendCellDate: { width: "20%", color: "#64748b" },
  trendCellValue: { width: "80%" },
  trendGrid: { flexDirection: "row", flexWrap: "wrap" },
  trendBox: { width: "48%", marginBottom: 16, marginRight: "2%" },
});

function PrescriptionPdfDocument({
  patientName,
  doctorName,
  generatedAt,
  prescriptionDate,
  medications,
  instruction,
  recentLogs,
}: {
  patientName: string;
  doctorName: string;
  generatedAt: string;
  prescriptionDate: string;
  medications: any[];
  instruction: string | null;
  recentLogs: any[];
}) {
  const generatedLabel = new Date(generatedAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: pdfStyles.page },
      // Header
      React.createElement(
        View,
        { style: pdfStyles.header },
        React.createElement(
          View,
          { style: pdfStyles.headerLeft },
          React.createElement(Text, { style: pdfStyles.title }, "Patient Summary & Prescription"),
          React.createElement(Text, { style: pdfStyles.meta }, "Patient: " + patientName),
          React.createElement(Text, { style: pdfStyles.meta }, "Doctor: " + doctorName)
        ),
        React.createElement(
          View,
          { style: pdfStyles.headerRight },
          React.createElement(Text, { style: pdfStyles.meta }, "Date: " + prescriptionDate),
          React.createElement(Text, { style: pdfStyles.meta }, "Generated: " + generatedLabel)
        )
      ),

      // Medications
      React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Medications Prescribed"),
        React.createElement(
          View,
          { style: [pdfStyles.row, pdfStyles.rowHeader] },
          React.createElement(Text, { style: pdfStyles.cellNo }, "S.No"),
          React.createElement(Text, { style: pdfStyles.cellRoute }, "Route"),
          React.createElement(Text, { style: pdfStyles.cellDrug }, "Drug Name"),
          React.createElement(Text, { style: pdfStyles.cell }, "Dose"),
          React.createElement(Text, { style: pdfStyles.cell }, "Unit"),
          React.createElement(Text, { style: pdfStyles.cell }, "Freq"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "Start"),
          React.createElement(Text, { style: pdfStyles.cellDate }, "End"),
          React.createElement(Text, { style: pdfStyles.cellStatus }, "Status")
        ),
        medications.length === 0 
          ? React.createElement(Text, { style: { padding: 10, color: "#64748b" } }, "No active medications.")
          : medications.map((medication, index) =>
              React.createElement(
                View,
                { key: index, style: pdfStyles.row },
                React.createElement(Text, { style: pdfStyles.cellNo }, String(medication.serial_number ?? index + 1)),
                React.createElement(Text, { style: pdfStyles.cellRoute }, medication.route),
                React.createElement(Text, { style: pdfStyles.cellDrug }, medication.drug_name),
                React.createElement(Text, { style: pdfStyles.cell }, medication.dose !== null ? String(medication.dose) : "-"),
                React.createElement(Text, { style: pdfStyles.cell }, medication.dose_unit ?? "-"),
                React.createElement(Text, { style: pdfStyles.cell }, medication.frequency ?? "-"),
                React.createElement(Text, { style: pdfStyles.cellDate }, medication.start_date ?? prescriptionDate),
                React.createElement(Text, { style: pdfStyles.cellDate }, medication.end_date ?? "-"),
                React.createElement(Text, { style: pdfStyles.cellStatus }, medication.end_date ? "Discontinue" : "Continue")
              )
            )
      ),

      // Instructions
      React.createElement(
        View,
        { style: pdfStyles.section },
        React.createElement(Text, { style: pdfStyles.sectionTitle }, "Doctor's Instructions"),
        React.createElement(Text, { style: pdfStyles.instruction }, instruction || "No specific instructions provided.")
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
            React.createElement(Text, { style: { fontWeight: 700, marginBottom: 4 } }, "SpO2 Trend"),
            recentLogs.map((log, i) => React.createElement(View, { key: "spo2-"+i, style: pdfStyles.trendRow }, 
              React.createElement(Text, { style: pdfStyles.trendCellDate }, log.date),
              React.createElement(Text, { style: pdfStyles.trendCellValue }, (log.spo2_rest ? log.spo2_rest+"% (Rest)" : "-") + " | " + (log.spo2_exertion ? log.spo2_exertion+"% (Walk)" : "-"))
            ))
          ),

          // MMRC Trend
          React.createElement(View, { style: pdfStyles.trendBox }, 
            React.createElement(Text, { style: { fontWeight: 700, marginBottom: 4 } }, "mMRC Score"),
            recentLogs.map((log, i) => React.createElement(View, { key: "mmrc-"+i, style: pdfStyles.trendRow }, 
              React.createElement(Text, { style: pdfStyles.trendCellDate }, log.date),
              React.createElement(Text, { style: pdfStyles.trendCellValue }, log.mmrc_today !== null ? String(log.mmrc_today) : "-")
            ))
          ),

          // Symptom Trend
          React.createElement(View, { style: pdfStyles.trendBox }, 
            React.createElement(Text, { style: { fontWeight: 700, marginBottom: 4 } }, "Symptoms & Severity"),
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
            React.createElement(Text, { style: { fontWeight: 700, marginBottom: 4 } }, "Medication Adherence"),
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
          ),

          // Disease Specific Scores
          React.createElement(View, { style: pdfStyles.trendBox }, 
            React.createElement(Text, { style: { fontWeight: 700, marginBottom: 4 } }, "Disease Specific Scores (Asthma/ILD)"),
            recentLogs.map((log, i) => {
              let scoreStr = "-";
              if (log.disease_specific_data && typeof log.disease_specific_data === "object") {
                const d = log.disease_specific_data as any;
                const scores = [];
                if (d.asthma?.act_score !== undefined) scores.push("ACT: " + d.asthma.act_score);
                if (d.ild?.kbild_score !== undefined) scores.push("K-BILD: " + d.ild.kbild_score);
                if (scores.length > 0) scoreStr = scores.join(" | ");
              }
              return React.createElement(View, { key: "ds-"+i, style: pdfStyles.trendRow }, 
                React.createElement(Text, { style: pdfStyles.trendCellDate }, log.date),
                React.createElement(Text, { style: pdfStyles.trendCellValue }, scoreStr)
              );
            })
          )
        )
      ),

      // Footer
      React.createElement(
        View,
        { style: pdfStyles.footer },
        React.createElement(Text, null, "O2Plus Respiratory Care Platform"),
        React.createElement(Text, null, "Signature: ____________________")
      )
    )
  );
}

async function renderPrescriptionPdfBuffer(props: React.ComponentProps<typeof PrescriptionPdfDocument>) {
  const rendered = await pdf(
    React.createElement(PrescriptionPdfDocument, props) as React.ReactElement<DocumentProps>
  ).toBuffer();
  return rendered;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    const patientId = p.id;
    const body = await request.json();
    const instructionText = body.instruction_text?.trim();

    if (instructionText) {
      const wordLimit = PATIENT_INSTRUCTION_WORD_LIMIT;
      if (wordCount(instructionText) > wordLimit) {
        return NextResponse.json({ error: "Instruction text exceeds " + wordLimit + " words limit" }, { status: 400 });
      }
    }

    const admin = createAdminClient();
    
    // De-duplicate instruction insertion (check last 5 mins)
    let savedInstructionId = null;
    if (instructionText) {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const recentCheck = await admin
        .from("doctor_instructions")
        .select("id, instruction_text")
        .eq("patient_id", patientId)
        .eq("doctor_id", user.id)
        .gte("created_at", fiveMinsAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentCheck.data && recentCheck.data.instruction_text === instructionText) {
        savedInstructionId = recentCheck.data.id;
      } else {
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
    }

    return NextResponse.json({ success: true, instruction_id: savedInstructionId });
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

    if (requestedFormat === "pdf") {
      const prescriptionDate = requestedDate ?? new Date().toISOString().split("T")[0];
      const admin = createAdminClient();
      
      const [patientRes, doctorRes, medsRes, instructionRes, logsRes] = await Promise.all([
        admin.from("patients").select("name").eq("id", patientId).maybeSingle(),
        admin.from("doctors").select("name").eq("id", user.id).maybeSingle(),
        admin
          .from("medications")
          .select("drug_name, dose, dose_unit, route, frequency, start_date, end_date, serial_number")
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
        medications: medsRes.data ?? [],
        instruction: instructionRes.data?.instruction_text ?? null,
        recentLogs: formattedLogs,
      });
      const filename = "saans-summary-" + prescriptionDate + "-" + generatedAt.replace(/[:.]/g, "-") + ".pdf";

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=\"" + filename + "\"",
        },
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
