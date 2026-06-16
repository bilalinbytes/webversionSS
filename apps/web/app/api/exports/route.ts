import React from "react";
import { NextResponse } from "next/server";
import { z } from "zod";
import { type DocumentProps, pdf } from "@react-pdf/renderer";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/database.types";
import { ExportPdfDocument, type PatientDetailSection } from "@/lib/server/export-pdf";
import { createAdminClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type PatientDiagnosisRow =
  Database["public"]["Tables"]["patient_diagnoses"]["Row"];
type DailyLogRow = Database["public"]["Tables"]["daily_logs"]["Row"];
type RedFlagScoreRow =
  Database["public"]["Tables"]["red_flag_scores"]["Row"];
type DiseaseAlertRow =
  Database["public"]["Tables"]["disease_alerts"]["Row"];
type MedicationRow = Database["public"]["Tables"]["medications"]["Row"];
type PftRecordRow = Database["public"]["Tables"]["pft_records"]["Row"];
type RespiratorySupportRow =
  Database["public"]["Tables"]["respiratory_support"]["Row"];
type DoctorInstructionRow =
  Database["public"]["Tables"]["doctor_instructions"]["Row"];

const exportRequestSchema = z
  .object({
    export_type: z.enum([
      "disease_specific",
      "combined",
      "date_wise",
      "weekly",
      "monthly",
      "single_patient",
    ]),
    patient_id: z.string().uuid().optional(),
    disease_filter: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    patient_ids: z.array(z.string().uuid()).optional(),
    format: z.enum(["pdf", "csv", "excel"]).optional().default("pdf"),
  })
  .superRefine((value, context) => {
    if (value.export_type === "single_patient" && !value.patient_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["patient_id"],
        message: "patient_id is required for single_patient exports.",
      });
    }

    if (value.export_type === "disease_specific" && !value.disease_filter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["disease_filter"],
        message: "disease_filter is required for disease_specific exports.",
      });
    }

    if (value.export_type === "date_wise") {
      if (!value.start_date) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["start_date"],
          message: "start_date is required for date_wise exports.",
        });
      }
      if (!value.end_date) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["end_date"],
          message: "end_date is required for date_wise exports.",
        });
      }
    }
  });

function formatFieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors;
}

function isoDateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function dateLabel(start?: string | null, end?: string | null) {
  if (!start && !end) {
    return "All available records";
  }

  if (start && end) {
    return `${start} to ${end}`;
  }

  return start ?? end ?? "All available records";
}

function parseComplianceCounts(value: Json | null): { taken: number; total: number } {
  if (value === null) {
    return { taken: 0, total: 0 };
  }

  if (typeof value === "boolean") {
    return { taken: value ? 1 : 0, total: 1 };
  }

  if (Array.isArray(value)) {
    return value.reduce<{ taken: number; total: number }>(
      (accumulator, entry) => {
        const next = parseComplianceCounts(entry ?? null);
        return {
          taken: accumulator.taken + next.taken,
          total: accumulator.total + next.total,
        };
      },
      { taken: 0, total: 0 },
    );
  }

  if (typeof value === "object") {
    return Object.values(value).reduce<{ taken: number; total: number }>(
      (accumulator, entry) => {
        const next = parseComplianceCounts(entry ?? null);
        return {
          taken: accumulator.taken + next.taken,
          total: accumulator.total + next.total,
        };
      },
      { taken: 0, total: 0 },
    );
  }

  return { taken: 0, total: 0 };
}

async function renderPdfBuffer(props: React.ComponentProps<typeof ExportPdfDocument>) {
  const rendered = await pdf(
    React.createElement(ExportPdfDocument, props) as React.ReactElement<DocumentProps>,
  ).toBuffer();

  if (Buffer.isBuffer(rendered)) {
    return rendered;
  }

  const arrayBuffer = await new Response(rendered as unknown as BodyInit).arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function complianceRateLabel(taken: number, total: number) {
  if (total === 0) {
    return "No data";
  }

  return `${Math.round((taken / total) * 100)}%`;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "n/a";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Prefix phone numbers with a tab so Excel treats them as text, not numbers */
function safePhone(value: unknown): string {
  const s = displayValue(value);
  if (s === "n/a") return s;
  // Strip to digits only then re-format — prevents scientific notation
  const digits = s.replace(/\D/g, "");
  return digits.length > 0 ? `'${digits}` : s;
}

function csvCell(value: unknown): string {
  const text = displayValue(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function htmlEscape(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Professional hospital-grade spreadsheet export.
 *
 * Structure:
 *   Sheet 1 — Patient Registry (one row per patient, all key fields)
 *   Sheet 2 — Medication Compliance
 *   Sheet 3 — Daily Logs
 *   Sheet 4 — Alerts
 *
 * Since .xls HTML format is a single sheet, we separate sections with a
 * clear header row and two blank rows between each table.
 */
function buildSpreadsheetRows(
  summaryRows: Array<{
    patientName: string;
    diagnosis: string;
    riskLevel: string;
    score: string;
    alert: string;
    enrolledAt: string;
  }>,
  medicationRows: Array<{
    patientName: string;
    taken: number;
    total: number;
    rateLabel: string;
  }>,
  patientDetails: PatientDetailSection[],
  notes: string[],
): string[][] {
  void notes; // notes omitted — keep file clean

  const rows: string[][] = [];

  // ── Section 1: Patient Registry ─────────────────────────────────────────────
  rows.push(["PATIENT REGISTRY"]);
  rows.push([
    "No.",
    "Patient Name",
    "Diagnosis",
    "Risk Level",
    "Risk Score",
    "Alert Status",
    "Enrolled On",
  ]);
  summaryRows.forEach((r, i) =>
    rows.push([
      String(i + 1),
      r.patientName,
      r.diagnosis,
      r.riskLevel,
      r.score,
      r.alert,
      r.enrolledAt,
    ]),
  );

  rows.push([], []);

  // ── Section 2: Medication Compliance ────────────────────────────────────────
  rows.push(["MEDICATION COMPLIANCE"]);
  rows.push(["Patient Name", "Doses Taken", "Total Doses", "Compliance Rate"]);
  medicationRows.forEach((r) =>
    rows.push([r.patientName, String(r.taken), String(r.total), r.rateLabel]),
  );

  rows.push([], []);

  // ── Section 3: Patient Details ───────────────────────────────────────────────
  rows.push(["PATIENT DETAILS"]);
  rows.push([
    "Patient Name",
    "Mobile",
    "Gender",
    "Date of Birth",
    "Address",
    "Emergency Contact",
    "Emergency Phone",
    "Enrolled On",
    "Primary Diagnosis",
    "Effective Dashboard",
    "Comorbidities",
  ]);

  patientDetails.forEach((patient) => {
    const dem = Object.fromEntries(patient.demographics);
    const diag = Object.fromEntries(patient.diagnosis);
    rows.push([
      patient.patientName,
      safePhone(dem["Mobile"] ?? ""),
      dem["Gender"] ?? "n/a",
      dem["Date of birth"] ?? "n/a",
      dem["Address"] ?? "n/a",
      dem["Emergency contact"] ?? "n/a",
      safePhone(dem["Emergency phone"] ?? ""),
      dem["Enrolled on"] ?? "n/a",
      diag["Primary diagnosis"] ?? "n/a",
      diag["Effective dashboard"] ?? "n/a",
      diag["Comorbidities"] ?? "n/a",
    ]);
  });

  rows.push([], []);

  // ── Section 4: Daily Logs ────────────────────────────────────────────────────
  if (patientDetails.some((p) => p.logRows.length > 0)) {
    rows.push(["DAILY LOGS"]);
    rows.push([
      "Patient Name",
      "Date",
      "SpO2 Rest (%)",
      "SpO2 Walk (%)",
      "mMRC Score",
      "AQI",
      "VAS Symptoms",
    ]);
    patientDetails.forEach((patient) => {
      patient.logRows.forEach((log) => {
        rows.push([patient.patientName, ...log]);
      });
    });
    rows.push([], []);
  }

  // ── Section 5: Alerts ────────────────────────────────────────────────────────
  if (patientDetails.some((p) => p.alertRows.length > 0)) {
    rows.push(["ALERTS"]);
    rows.push(["Patient Name", "Date", "Alert Type", "Status", "Reason"]);
    patientDetails.forEach((patient) => {
      patient.alertRows.forEach((alert) => {
        rows.push([patient.patientName, ...alert]);
      });
    });
    rows.push([], []);
  }

  // ── Section 6: Medications ───────────────────────────────────────────────────
  if (patientDetails.some((p) => p.medicationRows.length > 0)) {
    rows.push(["MEDICATIONS"]);
    rows.push(["Patient Name", "Drug", "Route", "Dose", "Frequency", "Start Date", "End Date"]);
    patientDetails.forEach((patient) => {
      patient.medicationRows.forEach((med) => {
        rows.push([patient.patientName, ...med]);
      });
    });
    rows.push([], []);
  }

  // ── Section 7: PFT History ───────────────────────────────────────────────────
  if (patientDetails.some((p) => p.pftRows.length > 0)) {
    rows.push(["PFT HISTORY"]);
    rows.push(["Patient Name", "Test Date", "FEV1/FVC Ratio", "FEV1", "FVC", "DLCO", "Other"]);
    patientDetails.forEach((patient) => {
      patient.pftRows.forEach((pft) => {
        rows.push([patient.patientName, ...pft]);
      });
    });
  }

  return rows;
}

function rowsToExcelHtml(rows: string[][]): string {
  const SECTION_TITLES = new Set([
    "PATIENT REGISTRY",
    "MEDICATION COMPLIANCE",
    "PATIENT DETAILS",
    "DAILY LOGS",
    "ALERTS",
    "MEDICATIONS",
    "PFT HISTORY",
  ]);

  // Column headers are always the row immediately after a section title
  let nextIsHeader = false;

  const tableRows = rows.map((row) => {
    if (row.length === 0) {
      nextIsHeader = false;
      return `<tr><td style="padding:5px;border:none">&nbsp;</td></tr>`;
    }

    const isSectionTitle = row.length === 1 && SECTION_TITLES.has(row[0] ?? "");

    if (isSectionTitle) {
      nextIsHeader = true;
      return `<tr>
  <td colspan="12" style="
    background:#1a3a4a;
    color:#ffffff;
    font-family:Calibri,Arial,sans-serif;
    font-size:11pt;
    font-weight:bold;
    padding:8px 12px;
    letter-spacing:0.5px;
    border-bottom:2px solid #0d2535;
  ">${htmlEscape(row[0] ?? "")}</td>
</tr>`;
    }

    if (nextIsHeader) {
      nextIsHeader = false;
      const cells = row.map(
        (cell) => `<td style="
    background:#e8f0f3;
    color:#1a3a4a;
    font-family:Calibri,Arial,sans-serif;
    font-size:10pt;
    font-weight:bold;
    padding:6px 10px;
    border:1px solid #b0c4cc;
    white-space:nowrap;
  ">${htmlEscape(cell)}</td>`,
      ).join("");
      return `<tr>${cells}</tr>`;
    }

    const cells = row.map(
      (cell) => `<td style="
    font-family:Calibri,Arial,sans-serif;
    font-size:10pt;
    color:#222222;
    padding:5px 10px;
    border:1px solid #d4dfe3;
    vertical-align:top;
  ">${htmlEscape(cell)}</td>`,
    ).join("");
    return `<tr>${cells}</tr>`;
  });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body  { font-family: Calibri, Arial, sans-serif; font-size: 10pt; margin: 0; }
    table { border-collapse: collapse; width: 100%; }
    tr:nth-child(even) td { background-color: #f5f9fb; }
    tr:nth-child(odd)  td { background-color: #ffffff; }
    td[style*="background:#e8f0f3"] { background-color: #e8f0f3 !important; }
    td[style*="background:#1a3a4a"] { background-color: #1a3a4a !important; color: #ffffff !important; }
  </style>
</head>
<body>
<table>${tableRows.join("\n")}</table>
</body>
</html>`;
}

function formatExportDate(value: string | null | undefined): string {
  if (!value) return "n/a";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * For each patient, merge same-day log entries keeping the worst values.
 * "Worst" = lowest SpO2, highest mMRC, highest VAS symptom scores.
 * This implements the export requirement: final report captures worst score/value of the day.
 */
function deduplicateLogsByWorstDay(logs: DailyLogRow[]): DailyLogRow[] {
  // Group by patient_id + date
  const grouped = new Map<string, DailyLogRow[]>();
  for (const log of logs) {
    if (!log.patient_id) continue;
    const date = log.logged_at.split("T")[0] ?? log.logged_at;
    const key = `${log.patient_id}::${date}`;
    const existing = grouped.get(key) ?? [];
    existing.push(log);
    grouped.set(key, existing);
  }

  const result: DailyLogRow[] = [];
  for (const dayLogs of grouped.values()) {
    if (dayLogs.length === 1) {
      result.push(dayLogs[0]!);
      continue;
    }
    // Merge: keep worst values
    const merged = { ...dayLogs[0]! };
    for (const log of dayLogs.slice(1)) {
      // Lowest SpO2 = worst
      if (log.spo2_rest !== null && (merged.spo2_rest === null || log.spo2_rest < merged.spo2_rest)) {
        merged.spo2_rest = log.spo2_rest;
      }
      if (log.spo2_exertion !== null && (merged.spo2_exertion === null || log.spo2_exertion < merged.spo2_exertion)) {
        merged.spo2_exertion = log.spo2_exertion;
      }
      // Highest mMRC = worst
      if (log.mmrc_today !== null && (merged.mmrc_today === null || log.mmrc_today > merged.mmrc_today)) {
        merged.mmrc_today = log.mmrc_today;
      }
      // Highest AQI = worst
      if (log.aqi_value !== null && (merged.aqi_value === null || log.aqi_value > merged.aqi_value)) {
        merged.aqi_value = log.aqi_value;
      }
      // Merge VAS symptoms: keep highest per symptom
      if (log.vas_symptoms && typeof log.vas_symptoms === "object" && !Array.isArray(log.vas_symptoms)) {
        const mergedVas = (merged.vas_symptoms as Record<string, number> | null) ?? {};
        const logVas = log.vas_symptoms as Record<string, number>;
        for (const [key, val] of Object.entries(logVas)) {
          if (typeof val === "number") {
            mergedVas[key] = Math.max(mergedVas[key] ?? 0, val);
          }
        }
        merged.vas_symptoms = mergedVas as unknown as typeof merged.vas_symptoms;
      }
    }
    result.push(merged);
  }

  // Sort chronologically
  return result.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
}

function latestBy<T extends { patient_id: string | null; created_at?: string | null; computed_at?: string | null }>(
  rows: T[],
) {
  const result = new Map<string, T>();

  for (const row of rows) {
    if (!row.patient_id) {
      continue;
    }

    const current = result.get(row.patient_id);
    const rowTimestamp = row.created_at ?? row.computed_at ?? "";
    const currentTimestamp = current?.created_at ?? current?.computed_at ?? "";

    if (!current || rowTimestamp >= currentTimestamp) {
      result.set(row.patient_id, row);
    }
  }

  return result;
}

async function readRequestJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function authenticateDoctor() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

async function fetchPatientsForDoctor(
  admin: ReturnType<typeof createAdminClient>,
  doctorId: string,
  patientIds?: string[],
) {
  const accessiblePatientIds = await fetchAccessiblePatientIds(admin, doctorId);
  const selectedIds = patientIds && patientIds.length > 0
    ? accessiblePatientIds.filter((id) => patientIds.includes(id))
    : accessiblePatientIds;

  if (selectedIds.length === 0) {
    return [] as PatientRow[];
  }

  const result = await admin
    .from("patients")
    .select("*")
    .in("id", selectedIds)
    .order("created_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function fetchAccessiblePatientIds(
  admin: ReturnType<typeof createAdminClient>,
  doctorId: string,
) {
  const [primaryRes, importedRes] = await Promise.all([
    admin.from("patients").select("id").eq("doctor_id", doctorId),
    admin
      .from("audit_logs")
      .select("target_patient_id")
      .eq("action", "patient_access_granted")
      .eq("actor_id", doctorId),
  ]);

  if (primaryRes.error) throw primaryRes.error;
  if (importedRes.error) throw importedRes.error;

  const primaryIds = (primaryRes.data ?? []).map((row) => row.id).filter(Boolean);
  const importedIds = (importedRes.data ?? [])
    .map((row) => row.target_patient_id)
    .filter((id): id is string => Boolean(id));

  return Array.from(new Set([...primaryIds, ...importedIds]));
}

async function fetchDiagnoses(
  admin: ReturnType<typeof createAdminClient>,
  patientIds: string[],
) {
  if (patientIds.length === 0) {
    return [] as PatientDiagnosisRow[];
  }

  const result = await admin
    .from("patient_diagnoses")
    .select("*")
    .in("patient_id", patientIds);

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function fetchLogs(
  admin: ReturnType<typeof createAdminClient>,
  patientIds: string[],
  options: { start?: string; end?: string },
) {
  if (patientIds.length === 0) {
    return [] as DailyLogRow[];
  }

  let query = admin
    .from("daily_logs")
    .select("*")
    .in("patient_id", patientIds)
    .order("logged_at", { ascending: false });

  if (options.start) {
    query = query.gte("logged_at", options.start);
  }
  if (options.end) {
    query = query.lte("logged_at", options.end);
  }

  const result = await query;

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function fetchScores(
  admin: ReturnType<typeof createAdminClient>,
  patientIds: string[],
  logIds: string[],
  limitToLogs: boolean,
) {
  if (patientIds.length === 0) {
    return [] as RedFlagScoreRow[];
  }

  let query = admin
    .from("red_flag_scores")
    .select("*")
    .order("computed_at", { ascending: false });

  if (limitToLogs) {
    if (logIds.length === 0) {
      return [] as RedFlagScoreRow[];
    }
    query = query.in("log_id", logIds);
  } else {
    query = query.in("patient_id", patientIds);
  }

  const result = await query;
  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function fetchAlerts(
  admin: ReturnType<typeof createAdminClient>,
  patientIds: string[],
  logIds: string[],
  limitToLogs: boolean,
) {
  if (patientIds.length === 0) {
    return [] as DiseaseAlertRow[];
  }

  let query = admin
    .from("disease_alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (limitToLogs) {
    if (logIds.length === 0) {
      return [] as DiseaseAlertRow[];
    }
    query = query.in("log_id", logIds);
  } else {
    query = query.in("patient_id", patientIds);
  }

  const result = await query;
  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function fetchMedications(
  admin: ReturnType<typeof createAdminClient>,
  patientIds: string[],
) {
  if (patientIds.length === 0) {
    return [] as MedicationRow[];
  }

  const result = await admin
    .from("medications")
    .select("*")
    .in("patient_id", patientIds)
    .order("start_date", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function fetchPftRecords(
  admin: ReturnType<typeof createAdminClient>,
  patientIds: string[],
) {
  if (patientIds.length === 0) {
    return [] as PftRecordRow[];
  }

  const result = await admin
    .from("pft_records")
    .select("*")
    .in("patient_id", patientIds)
    .order("test_date", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function fetchRespiratorySupport(
  admin: ReturnType<typeof createAdminClient>,
  patientIds: string[],
) {
  if (patientIds.length === 0) {
    return [] as RespiratorySupportRow[];
  }

  const result = await admin
    .from("respiratory_support")
    .select("*")
    .in("patient_id", patientIds);

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function fetchDoctorInstructions(
  admin: ReturnType<typeof createAdminClient>,
  patientIds: string[],
) {
  if (patientIds.length === 0) {
    return [] as DoctorInstructionRow[];
  }

  const result = await admin
    .from("doctor_instructions")
    .select("*")
    .in("patient_id", patientIds)
    .order("created_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await authenticateDoctor();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await readRequestJson(request);
  if (!json) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = exportRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        field_errors: formatFieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const admin = createAdminClient();

  try {
    const { data: doctor, error: doctorError } = await admin
      .from("doctors")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    if (doctorError) {
      throw doctorError;
    }

    let patients: PatientRow[] = [];
    let diagnoses: PatientDiagnosisRow[] = [];
    let logs: DailyLogRow[] = [];
    let scores: RedFlagScoreRow[] = [];
    let alerts: DiseaseAlertRow[] = [];
    let medications: MedicationRow[] = [];
    let pftRecords: PftRecordRow[] = [];
    let respiratorySupportRows: RespiratorySupportRow[] = [];
    let doctorInstructions: DoctorInstructionRow[] = [];
    let startLabel: string | null = null;
    let endLabel: string | null = null;
    let limitToLogs = false;

    if (payload.export_type === "single_patient") {
      const { data: patient, error: patientError } = await admin
        .from("patients")
        .select("*")
        .eq("id", payload.patient_id!)
        .maybeSingle();

      if (patientError) {
        throw patientError;
      }

      if (!patient) {
        return NextResponse.json({ error: "Patient not found." }, { status: 404 });
      }

      const accessiblePatientIds = await fetchAccessiblePatientIds(admin, user.id);
      if (!accessiblePatientIds.includes(patient.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      patients = [patient];
      diagnoses = await fetchDiagnoses(admin, [patient.id]);
      logs = await fetchLogs(admin, [patient.id], {});
      scores = await fetchScores(
        admin,
        [patient.id],
        logs.map((log) => log.id),
        false,
      );
      alerts = await fetchAlerts(
        admin,
        [patient.id],
        logs.map((log) => log.id),
        false,
      );
      medications = await fetchMedications(admin, [patient.id]);
      pftRecords = await fetchPftRecords(admin, [patient.id]);
      respiratorySupportRows = await fetchRespiratorySupport(admin, [patient.id]);
      doctorInstructions = await fetchDoctorInstructions(admin, [patient.id]);
    } else {
      patients = await fetchPatientsForDoctor(admin, user.id, payload.patient_ids);
      diagnoses = await fetchDiagnoses(
        admin,
        patients.map((patient) => patient.id),
      );

      if (payload.export_type === "disease_specific") {
        const diagnosisPatientIds = new Set(
          diagnoses
            .filter(
              (diagnosis) =>
                diagnosis.primary_diagnosis === payload.disease_filter,
            )
            .map((diagnosis) => diagnosis.patient_id)
            .filter((patientId): patientId is string => Boolean(patientId)),
        );

        patients = patients.filter((patient) => diagnosisPatientIds.has(patient.id));
      }

      const selectedPatientIds = patients.map((patient) => patient.id);
      diagnoses = diagnoses.filter(
        (diagnosis) =>
          diagnosis.patient_id !== null && selectedPatientIds.includes(diagnosis.patient_id),
      );
      medications = await fetchMedications(admin, selectedPatientIds);
      pftRecords = await fetchPftRecords(admin, selectedPatientIds);
      respiratorySupportRows = await fetchRespiratorySupport(admin, selectedPatientIds);
      doctorInstructions = await fetchDoctorInstructions(admin, selectedPatientIds);

      if (payload.export_type === "date_wise") {
        startLabel = payload.start_date ?? null;
        endLabel = payload.end_date ?? null;
        limitToLogs = true;
        logs = await fetchLogs(admin, selectedPatientIds, {
          start: payload.start_date,
          end: payload.end_date,
        });
      } else if (payload.export_type === "weekly") {
        startLabel = isoDateDaysAgo(7);
        endLabel = new Date().toISOString();
        limitToLogs = true;
        logs = await fetchLogs(admin, selectedPatientIds, {
          start: startLabel,
          end: endLabel,
        });
      } else if (payload.export_type === "monthly") {
        startLabel = isoDateDaysAgo(30);
        endLabel = new Date().toISOString();
        limitToLogs = true;
        logs = await fetchLogs(admin, selectedPatientIds, {
          start: startLabel,
          end: endLabel,
        });
      } else {
        logs = await fetchLogs(admin, selectedPatientIds, {});
      }

      const logIds = logs.map((log) => log.id);
      scores = await fetchScores(admin, selectedPatientIds, logIds, limitToLogs);
      alerts = await fetchAlerts(admin, selectedPatientIds, logIds, limitToLogs);
    }

    const diagnosesByPatient = new Map<string, PatientDiagnosisRow>();
    diagnoses.forEach((diagnosis) => {
      if (diagnosis.patient_id) {
        diagnosesByPatient.set(diagnosis.patient_id, diagnosis);
      }
    });

    // Deduplicate same-day logs keeping worst values (per export requirements)
    const deduplicatedLogs = deduplicateLogsByWorstDay(logs);

    const latestScores = latestBy(
      scores.map((score) => ({
        ...score,
        created_at: score.computed_at,
      })),
    );
    const latestAlerts = latestBy(alerts);

    const logsByPatient = new Map<string, DailyLogRow[]>();
    deduplicatedLogs.forEach((log) => {
      if (!log.patient_id) return;
      logsByPatient.set(log.patient_id, [...(logsByPatient.get(log.patient_id) ?? []), log]);
    });

    const alertsByPatient = new Map<string, DiseaseAlertRow[]>();
    alerts.forEach((alert) => {
      if (!alert.patient_id) return;
      alertsByPatient.set(alert.patient_id, [...(alertsByPatient.get(alert.patient_id) ?? []), alert]);
    });

    const medsByPatient = new Map<string, MedicationRow[]>();
    medications.forEach((medication) => {
      if (!medication.patient_id) return;
      medsByPatient.set(medication.patient_id, [...(medsByPatient.get(medication.patient_id) ?? []), medication]);
    });

    const pftByPatient = new Map<string, PftRecordRow[]>();
    pftRecords.forEach((pft) => {
      if (!pft.patient_id) return;
      pftByPatient.set(pft.patient_id, [...(pftByPatient.get(pft.patient_id) ?? []), pft]);
    });

    const respiratoryByPatient = new Map<string, RespiratorySupportRow>();
    respiratorySupportRows.forEach((support) => {
      if (!support.patient_id) return;
      respiratoryByPatient.set(support.patient_id, support);
    });

    const instructionsByPatient = new Map<string, DoctorInstructionRow[]>();
    doctorInstructions.forEach((instruction) => {
      if (!instruction.patient_id) return;
      instructionsByPatient.set(instruction.patient_id, [...(instructionsByPatient.get(instruction.patient_id) ?? []), instruction]);
    });

    const complianceByPatient = new Map<string, { taken: number; total: number }>();
    deduplicatedLogs.forEach((log) => {
      if (!log.patient_id) {
        return;
      }

      const next = parseComplianceCounts(log.medication_compliance);
      const current = complianceByPatient.get(log.patient_id) ?? {
        taken: 0,
        total: 0,
      };

      complianceByPatient.set(log.patient_id, {
        taken: current.taken + next.taken,
        total: current.total + next.total,
      });
    });

    const summaryRows = patients.map((patient) => {
      const diagnosis = diagnosesByPatient.get(patient.id);
      const score = latestScores.get(patient.id);
      const alert = latestAlerts.get(patient.id);
      // Show human readable primary diagnosis; fall back to effective_dashboard label
      const diagnosisDisplay = diagnosis?.primary_diagnosis ?? diagnosis?.effective_dashboard ?? "n/a";

      return {
        patientName: patient.name,
        diagnosis: diagnosisDisplay,
        riskLevel: score?.risk_level ?? score?.indicator_color ?? "n/a",
        score: score ? String(score.global_score) : "n/a",
        alert: alert?.alert_type ?? "n/a",
        enrolledAt: formatExportDate(patient.created_at),
      };
    });

    const medicationRows = patients.map((patient) => {
      const compliance = complianceByPatient.get(patient.id) ?? {
        taken: 0,
        total: 0,
      };

      return {
        patientName: patient.name,
        taken: compliance.taken,
        total: compliance.total,
        rateLabel: complianceRateLabel(compliance.taken, compliance.total),
      };
    });

    const patientDetails: PatientDetailSection[] = patients.map((patient) => {
      const diagnosis = diagnosesByPatient.get(patient.id);
      const support = respiratoryByPatient.get(patient.id);
      const supportRows = support
        ? Object.entries(support)
            .filter(([key]) => !["id", "patient_id", "created_at", "updated_at"].includes(key))
            .map(([key, value]) => [key.replaceAll("_", " "), displayValue(value)] as [string, string])
        : [["Support record", "No respiratory support record"]] as Array<[string, string]>;

      return {
        patientName: patient.name,
        demographics: [
          ["Patient ID", patient.id],
          ["Mobile", safePhone(patient.mobile_number)],
          ["Alternate mobile", safePhone(patient.alternate_mobile_number)],
          ["Gender", displayValue(patient.gender)],
          ["Date of birth", displayValue(patient.date_of_birth)],
          ["Address", displayValue(patient.address)],
          ["Emergency contact", displayValue(patient.emergency_contact_name)],
          ["Emergency phone", safePhone(patient.emergency_contact_phone)],
          ["Enrolled on", formatExportDate(patient.created_at)],
          ["Last updated", formatExportDate(patient.updated_at)],
        ] as Array<[string, string]>,
        diagnosis: [
          ["Primary diagnosis",        displayValue(diagnosis?.primary_diagnosis)],
          ["Effective dashboard",       displayValue(diagnosis?.effective_dashboard)],
          ["Post ICU sub diagnosis",    displayValue(diagnosis?.post_icu_sub_diagnosis)],
          ["Comorbidities",            displayValue(diagnosis?.comorbidities)],
          ["Comorbidities other",      displayValue(diagnosis?.comorbidities_other_text)],
          ["Diagnosed at",             displayValue(diagnosis?.diagnosed_at)],
        ] as Array<[string, string]>,
        respiratorySupport: supportRows,
        pftRows: (pftByPatient.get(patient.id) ?? []).map((pft) => [
          displayValue(pft.test_date),
          displayValue(pft.fev1_fvc_ratio),
          displayValue(pft.fev1),
          displayValue(pft.fvc),
          displayValue(pft.dlco),
          displayValue(pft.other_fields),
        ]),
        medicationRows: (medsByPatient.get(patient.id) ?? []).map((med) => [
          displayValue(med.drug_name),
          displayValue(med.route),
          `${displayValue(med.dose)} ${displayValue(med.dose_unit)}`.trim(),
          displayValue(med.frequency),
          displayValue(med.start_date),
          displayValue(med.end_date),
        ]),
        logRows: (logsByPatient.get(patient.id) ?? []).map((log) => [
          formatExportDate(log.logged_at),
          displayValue(log.spo2_rest),
          displayValue(log.spo2_exertion),
          displayValue(log.mmrc_today),
          displayValue(log.aqi_value),
          displayValue(log.vas_symptoms),
        ]),
        alertRows: (alertsByPatient.get(patient.id) ?? []).map((alert) => [
          formatExportDate(alert.created_at),
          displayValue(alert.alert_type),
          displayValue(alert.acknowledged_by_doctor ? "Acknowledged" : "Open"),
          displayValue(alert.reason_text),
        ]),
        instructionRows: (instructionsByPatient.get(patient.id) ?? []).map((instruction) => [
          formatExportDate(instruction.created_at),
          displayValue(instruction.instruction_text),
          formatExportDate(instruction.read_by_patient_at),
        ]),
      };
    });

    const notes = [
      `Daily logs included: ${deduplicatedLogs.length} (deduplicated from ${logs.length} raw entries, worst-day values kept)`,
      `Red flag score rows included: ${scores.length}`,
      `Disease alerts included: ${alerts.length}`,
      `Medication rows included: ${medications.length}`,
    ];

    if (payload.export_type === "monthly" || payload.export_type === "single_patient") {
      notes.push(`PFT history rows included: ${pftRecords.length}`);
    }
    if (payload.export_type === "single_patient") {
      notes.push(
        `Respiratory support rows included: ${respiratorySupportRows.length}`,
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const spreadsheetRows = buildSpreadsheetRows(summaryRows, medicationRows, patientDetails, notes);

    if (payload.format === "csv") {
      const filename = `saans-export-${payload.export_type}-${timestamp}.csv`;
      // Prepend UTF-8 BOM so Excel opens CSV with correct encoding
      const bom = "\uFEFF";
      return new NextResponse(bom + rowsToCsv(spreadsheetRows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (payload.format === "excel") {
      const filename = `saans-export-${payload.export_type}-${timestamp}.xls`;
      return new NextResponse(rowsToExcelHtml(spreadsheetRows), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const pdfBuffer = await renderPdfBuffer({
      exportType: payload.export_type,
      doctorName: doctor?.name ?? "Unknown Doctor",
      generatedAt: new Date().toISOString(),
      dateRangeLabel: dateLabel(startLabel, endLabel),
      patientNames: patients.map((patient) => patient.name),
      summaryRows,
      medicationRows,
      patientDetails,
      notes,
    });

    const filename = `saans-export-${payload.export_type}-${timestamp}.pdf`;

    // Audit trail — fire-and-forget, never block the response
    admin.from("export_records").insert({
      doctor_id: user.id,
      export_type: payload.export_type,
      generated_at: new Date().toISOString(),
      patient_id: payload.export_type === "single_patient" ? (payload.patient_id ?? null) : null,
    }).then(() => { /* intentionally fire-and-forget */ });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate export.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
