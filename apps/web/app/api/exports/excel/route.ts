import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database, Json } from "@/lib/database.types";

export const runtime = "nodejs";

// ── Types ─────────────────────────────────────────────────────────────────────
type PatientRow     = Database["public"]["Tables"]["patients"]["Row"];
type DiagnosisRow   = Database["public"]["Tables"]["patient_diagnoses"]["Row"];
type DailyLogRow    = Database["public"]["Tables"]["daily_logs"]["Row"];
type ScoreRow       = Database["public"]["Tables"]["red_flag_scores"]["Row"];
type AlertRow       = Database["public"]["Tables"]["disease_alerts"]["Row"];
type MedRow         = Database["public"]["Tables"]["medications"]["Row"];
type PftRow         = Database["public"]["Tables"]["pft_records"]["Row"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    }); // 01-Jun-2025
  } catch { return ""; }
}

function fmtPct(taken: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((taken / total) * 100)}%`;
}

function safeStr(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  // JSON — flatten to readable string, no raw JSON in cells
  if (Array.isArray(value)) return value.map((v) => safeStr(v)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${safeStr(v)}`)
      .join("; ");
  }
  return String(value);
}

function vasSymptoms(value: Json | null): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => typeof v === "number" && (v as number) > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

function parseCompliance(value: Json | null): { taken: number; total: number } {
  if (!value) return { taken: 0, total: 0 };
  if (typeof value === "boolean") return { taken: value ? 1 : 0, total: 1 };
  if (Array.isArray(value)) {
    return value.reduce<{ taken: number; total: number }>(
      (acc, v) => {
        const n = parseCompliance(v as Json);
        return { taken: acc.taken + n.taken, total: acc.total + n.total };
      },
      { taken: 0, total: 0 },
    );
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, Json>).reduce<{ taken: number; total: number }>(
      (acc, v) => {
        const n = parseCompliance(v);
        return { taken: acc.taken + n.taken, total: acc.total + n.total };
      },
      { taken: 0, total: 0 },
    );
  }
  return { taken: 0, total: 0 };
}

function riskFromScore(score: number | null): string {
  if (score === null) return "";
  if (score >= 9) return "Critical";
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Stable";
}

// ── Stylesheet helpers ────────────────────────────────────────────────────────
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3A4A" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri", size: 11,
};
const SUMMARY_LABEL_FONT: Partial<ExcelJS.Font> = {
  bold: true, name: "Calibri", size: 11, color: { argb: "FF1A3A4A" },
};
const DATA_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 10 };
const BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: "FFD0DDE2" } },
  left:   { style: "thin", color: { argb: "FFD0DDE2" } },
  bottom: { style: "thin", color: { argb: "FFD0DDE2" } },
  right:  { style: "thin", color: { argb: "FFD0DDE2" } },
};

function styleHeaderRow(row: ExcelJS.Row, colCount: number) {
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill  = HEADER_FILL;
    cell.font  = HEADER_FONT;
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", horizontal: "left" };
  }
}

function styleDataRow(row: ExcelJS.Row, colCount: number, even: boolean) {
  row.height = 18;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font   = DATA_FONT;
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
    if (even) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F8FA" } };
    }
  }
}

function applySheet(
  ws: ExcelJS.Worksheet,
  headers: { header: string; key: string; width: number }[],
  data: Record<string, string | number>[],
) {
  ws.columns = headers.map((h) => ({ header: h.header, key: h.key, width: h.width }));

  // Style header
  styleHeaderRow(ws.getRow(1), headers.length);
  ws.getRow(1).commit();

  // Freeze header
  ws.views = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];

  // Auto-filter on header row
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: headers.length },
  };

  // Data rows
  data.forEach((record, i) => {
    const row = ws.addRow(record);
    styleDataRow(row, headers.length, i % 2 === 1);
    row.commit();
  });
}

// ── Auth + data fetching ──────────────────────────────────────────────────────
async function authenticateDoctor() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function fetchAccessiblePatientIds(admin: ReturnType<typeof createAdminClient>, doctorId: string) {
  const [primaryRes, importedRes] = await Promise.all([
    admin.from("patients").select("id").eq("doctor_id", doctorId),
    admin.from("audit_logs").select("target_patient_id")
      .eq("action", "patient_access_granted").eq("actor_id", doctorId),
  ]);
  const primary  = (primaryRes.data ?? []).map((r) => r.id).filter(Boolean);
  const imported = (importedRes.data ?? []).map((r) => r.target_patient_id).filter((id): id is string => Boolean(id));
  return Array.from(new Set([...primary, ...imported]));
}

// ── Main route ────────────────────────────────────────────────────────────────
export async function POST(request: Request): Promise<NextResponse> {
  const user = await authenticateDoctor();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { patient_ids?: string[] } = {};
  try { body = await request.json() as { patient_ids?: string[] }; } catch { /* empty body = all patients */ }

  const admin = createAdminClient();

  // Fetch doctor name
  const { data: doctorRow } = await admin
    .from("doctors")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();
  const doctorName = doctorRow?.name ?? "Unknown Doctor";

  // Determine which patients to export
  const allAccessible = await fetchAccessiblePatientIds(admin, user.id);
  const selectedIds = body.patient_ids?.length
    ? allAccessible.filter((id) => body.patient_ids!.includes(id))
    : allAccessible;

  if (selectedIds.length === 0) {
    return NextResponse.json({ error: "No patients found." }, { status: 404 });
  }

  // Fetch all data in parallel
  const [
    patientsRes,
    diagnosesRes,
    logsRes,
    scoresRes,
    alertsRes,
    medsRes,
    pftRes,
  ] = await Promise.all([
    admin.from("patients").select("*").in("id", selectedIds).order("name"),
    admin.from("patient_diagnoses").select("*").in("patient_id", selectedIds),
    admin.from("daily_logs").select("*").in("patient_id", selectedIds).order("logged_at", { ascending: false }),
    admin.from("red_flag_scores").select("*").in("patient_id", selectedIds).order("computed_at", { ascending: false }),
    admin.from("disease_alerts").select("*").in("patient_id", selectedIds).order("created_at", { ascending: false }),
    admin.from("medications").select("*").in("patient_id", selectedIds).order("start_date", { ascending: false }),
    admin.from("pft_records").select("*").in("patient_id", selectedIds).order("test_date", { ascending: false }),
  ]);

  const patients:   PatientRow[]   = patientsRes.data   ?? [];
  const diagnoses:  DiagnosisRow[] = diagnosesRes.data  ?? [];
  const logs:       DailyLogRow[]  = logsRes.data       ?? [];
  const scores:     ScoreRow[]     = scoresRes.data     ?? [];
  const alerts:     AlertRow[]     = alertsRes.data     ?? [];
  const meds:       MedRow[]       = medsRes.data       ?? [];
  const pfts:       PftRow[]       = pftRes.data        ?? [];

  // Index by patient_id
  const diagByPatient   = new Map<string, DiagnosisRow>();
  diagnoses.forEach((d) => { if (d.patient_id && !diagByPatient.has(d.patient_id)) diagByPatient.set(d.patient_id, d); });

  const latestScore = new Map<string, ScoreRow>();
  scores.forEach((s) => { if (s.patient_id && !latestScore.has(s.patient_id)) latestScore.set(s.patient_id, s); });

  const latestLog = new Map<string, DailyLogRow>();
  logs.forEach((l) => { if (l.patient_id && !latestLog.has(l.patient_id)) latestLog.set(l.patient_id, l); });

  const complianceByPatient = new Map<string, { taken: number; total: number }>();
  logs.forEach((l) => {
    if (!l.patient_id) return;
    const c = parseCompliance(l.medication_compliance);
    const cur = complianceByPatient.get(l.patient_id) ?? { taken: 0, total: 0 };
    complianceByPatient.set(l.patient_id, { taken: cur.taken + c.taken, total: cur.total + c.total });
  });

  // Sort patients: critical first
  const sortedPatients = [...patients].sort((a, b) => {
    const sa = latestScore.get(a.id)?.global_score ?? -1;
    const sb = latestScore.get(b.id)?.global_score ?? -1;
    return sb - sa;
  });

  // ── Build workbook ──────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator  = "O2Plus";
  wb.created  = new Date();
  wb.modified = new Date();

  // ── Sheet 0: Summary ────────────────────────────────────────────────────────
  const wsSummary = wb.addWorksheet("Summary");
  wsSummary.views = [{ state: "normal" }];

  const criticalCount  = sortedPatients.filter((p) => (latestScore.get(p.id)?.global_score ?? 0) >= 9).length;
  const openAlertCount = alerts.filter((a) => !a.acknowledged_by_doctor && !a.is_suppressed).length;
  const totalComp      = sortedPatients.reduce(
    (acc, p) => {
      const c = complianceByPatient.get(p.id) ?? { taken: 0, total: 0 };
      return { taken: acc.taken + c.taken, total: acc.total + c.total };
    },
    { taken: 0, total: 0 },
  );
  const avgCompliance = fmtPct(totalComp.taken, totalComp.total);

  const summaryData = [
    ["Doctor Name",       doctorName],
    ["Total Patients",    String(sortedPatients.length)],
    ["Critical Patients", String(criticalCount)],
    ["Active Alerts",     String(openAlertCount)],
    ["Avg Compliance",    avgCompliance],
    ["Export Date",       fmtDate(new Date().toISOString())],
  ];

  wsSummary.getColumn(1).width = 24;
  wsSummary.getColumn(2).width = 32;

  // Title
  const titleRow = wsSummary.addRow(["O2Plus — Patient Export Report"]);
  titleRow.getCell(1).font      = { bold: true, size: 14, name: "Calibri", color: { argb: "FF1A3A4A" } };
  titleRow.getCell(1).alignment = { horizontal: "left" };
  titleRow.height = 28;
  wsSummary.addRow([]);

  summaryData.forEach(([label, value]) => {
    const row = wsSummary.addRow([label, value]);
    row.getCell(1).font      = SUMMARY_LABEL_FONT;
    row.getCell(2).font      = DATA_FONT;
    row.getCell(1).border    = BORDER;
    row.getCell(2).border    = BORDER;
    row.height = 20;
    row.commit();
  });

  // ── Sheet 1: Patients ────────────────────────────────────────────────────────
  const wsPatients = wb.addWorksheet("Patients");
  applySheet(
    wsPatients,
    [
      { header: "Patient Name",       key: "name",         width: 24 },
      { header: "Phone Number",       key: "phone",        width: 18 },
      { header: "Diagnosis",          key: "diagnosis",    width: 22 },
      { header: "Risk Level",         key: "risk",         width: 14 },
      { header: "Risk Score",         key: "score",        width: 13 },
      { header: "Alert Status",       key: "alert",        width: 16 },
      { header: "Date of Enrollment", key: "enrolled",     width: 20 },
      { header: "Last Activity",      key: "lastActivity", width: 20 },
    ],
    sortedPatients.map((p) => {
      const diag   = diagByPatient.get(p.id);
      const score  = latestScore.get(p.id);
      const last   = latestLog.get(p.id);
      const openAl = alerts.find((a) => a.patient_id === p.id && !a.acknowledged_by_doctor && !a.is_suppressed);
      return {
        name:         p.name,
        phone:        p.mobile_number ?? "",
        diagnosis:    diag?.effective_dashboard ?? diag?.primary_diagnosis ?? "",
        risk:         riskFromScore(score?.global_score ?? null),
        score:        score?.global_score ?? "",
        alert:        openAl ? openAl.alert_type : "None",
        enrolled:     fmtDate(p.created_at),
        lastActivity: fmtDate(last?.logged_at),
      };
    }),
  );

  // ── Sheet 2: Medication Compliance ──────────────────────────────────────────
  const wsCompliance = wb.addWorksheet("Medication Compliance");
  const compData = sortedPatients.map((p) => {
    const c = complianceByPatient.get(p.id) ?? { taken: 0, total: 0 };
    const missed = Math.max(0, c.total - c.taken);
    return {
      name:       p.name,
      prescribed: c.total,
      taken:      c.taken,
      missed:     missed,
      pct:        fmtPct(c.taken, c.total),
    };
  });
  applySheet(
    wsCompliance,
    [
      { header: "Patient Name",    key: "name",       width: 24 },
      { header: "Prescribed Doses",key: "prescribed", width: 18 },
      { header: "Taken Doses",     key: "taken",      width: 14 },
      { header: "Missed Doses",    key: "missed",     width: 14 },
      { header: "Compliance %",    key: "pct",        width: 14 },
    ],
    compData,
  );

  // ── Sheet 3: Alerts ──────────────────────────────────────────────────────────
  const wsAlerts = wb.addWorksheet("Alerts");
  const patientNameById = new Map(patients.map((p) => [p.id, p.name]));
  const alertData = [...alerts]
    .sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime())
    .map((a) => ({
      name:     patientNameById.get(a.patient_id ?? "") ?? "",
      type:     a.alert_type,
      severity: a.alert_type === "RED" ? "Critical" : a.alert_type === "YELLOW" ? "Warning" : "Info",
      date:     fmtDate(a.created_at),
      status:   a.acknowledged_by_doctor ? "Acknowledged" : a.is_suppressed ? "Suppressed" : "Open",
    }));
  applySheet(
    wsAlerts,
    [
      { header: "Patient Name", key: "name",     width: 24 },
      { header: "Alert Type",   key: "type",     width: 14 },
      { header: "Severity",     key: "severity", width: 14 },
      { header: "Date",         key: "date",     width: 18 },
      { header: "Status",       key: "status",   width: 16 },
    ],
    alertData,
  );

  // ── Sheet 4: Medications ─────────────────────────────────────────────────────
  const wsMeds = wb.addWorksheet("Medications");
  applySheet(
    wsMeds,
    [
      { header: "Patient Name", key: "name",      width: 24 },
      { header: "Medication",   key: "drug",      width: 24 },
      { header: "Route",        key: "route",     width: 14 },
      { header: "Dose",         key: "dose",      width: 14 },
      { header: "Frequency",    key: "frequency", width: 18 },
      { header: "Start Date",   key: "start",     width: 16 },
      { header: "End Date",     key: "end",       width: 16 },
    ],
    meds.map((m) => ({
      name:      patientNameById.get(m.patient_id ?? "") ?? "",
      drug:      m.drug_name,
      route:     m.route ?? "",
      dose:      m.dose != null ? `${m.dose} ${m.dose_unit ?? ""}`.trim() : "",
      frequency: m.frequency ?? "",
      start:     fmtDate(m.start_date),
      end:       fmtDate(m.end_date),
    })),
  );

  // ── Sheet 5: PFT History ─────────────────────────────────────────────────────
  const wsPft = wb.addWorksheet("PFT History");
  applySheet(
    wsPft,
    [
      { header: "Patient Name",   key: "name",  width: 24 },
      { header: "Test Date",      key: "date",  width: 16 },
      { header: "FEV1",           key: "fev1",  width: 10 },
      { header: "FVC",            key: "fvc",   width: 10 },
      { header: "FEV1/FVC Ratio", key: "ratio", width: 16 },
      { header: "DLCO",           key: "dlco",  width: 10 },
    ],
    pfts.map((p) => ({
      name:  patientNameById.get(p.patient_id ?? "") ?? "",
      date:  fmtDate(p.test_date),
      fev1:  p.fev1  ?? "",
      fvc:   p.fvc   ?? "",
      ratio: p.fev1_fvc_ratio ?? "",
      dlco:  p.dlco  ?? "",
    })),
  );

  // ── Sheet 6: Daily Logs ──────────────────────────────────────────────────────
  const wsLogs = wb.addWorksheet("Daily Logs");
  applySheet(
    wsLogs,
    [
      { header: "Patient Name",  key: "name",    width: 24 },
      { header: "Date",          key: "date",    width: 16 },
      { header: "SpO2 Rest (%)", key: "spo2r",   width: 14 },
      { header: "SpO2 Walk (%)", key: "spo2e",   width: 14 },
      { header: "mMRC Score",    key: "mmrc",    width: 13 },
      { header: "AQI",           key: "aqi",     width: 10 },
      { header: "Symptoms",      key: "symptoms",width: 40 },
    ],
    logs.map((l) => ({
      name:     patientNameById.get(l.patient_id ?? "") ?? "",
      date:     fmtDate(l.logged_at),
      spo2r:    l.spo2_rest    ?? "",
      spo2e:    l.spo2_exertion ?? "",
      mmrc:     l.mmrc_today   ?? "",
      aqi:      l.aqi_value    ?? "",
      symptoms: vasSymptoms(l.vas_symptoms),
    })),
  );

  // ── Reorder sheets: Summary first ───────────────────────────────────────────
  wb.views = [{ activeTab: 0 }];

  // ── Serialize ────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename  = `o2plus-patients-${timestamp}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
