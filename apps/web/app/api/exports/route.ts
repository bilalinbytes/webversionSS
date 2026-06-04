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

function csvCell(value: unknown): string {
  const text = displayValue(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function htmlEscape(value: unknown): string {
  return displayValue(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rowsToExcelHtml(rows: string[][]): string {
  const tableRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`;
}

function buildSpreadsheetRows(
  summaryRows: Array<{ patientName: string; diagnosis: string; riskLevel: string; score: string; alert: string }>,
  medicationRows: Array<{ patientName: string; taken: number; total: number; rateLabel: string }>,
  patientDetails: PatientDetailSection[],
  notes: string[],
): string[][] {
  const rows: string[][] = [];
  rows.push(["Section", "Patient", "Field 1", "Field 2", "Field 3", "Field 4", "Field 5", "Field 6"]);
  rows.push(["Summary", "Patient", "Diagnosis", "Risk level", "Score", "Alert"]);
  summaryRows.forEach((row) => rows.push(["Summary", row.patientName, row.diagnosis, row.riskLevel, row.score, row.alert]));
  rows.push([]);
  rows.push(["Medication Compliance", "Patient", "Taken", "Total", "Rate"]);
  medicationRows.forEach((row) => rows.push(["Medication Compliance", row.patientName, String(row.taken), String(row.total), row.rateLabel]));

  patientDetails.forEach((patient) => {
    rows.push([]);
    rows.push(["Patient Detail", patient.patientName]);
    [
      ["Demographics", patient.demographics],
      ["Diagnosis", patient.diagnosis],
      ["Respiratory Support", patient.respiratorySupport],
    ].forEach(([section, entries]) => {
      rows.push([section as string, patient.patientName, "Field", "Value"]);
      (entries as Array<[string, string]>).forEach(([field, value]) => rows.push([section as string, patient.patientName, field, value]));
    });

    [
      ["PFT History", ["Date", "FEV1/FVC", "FEV1", "FVC", "DLCO", "Other"], patient.pftRows],
      ["Medication History", ["Drug", "Route", "Dose", "Frequency", "Start", "End"], patient.medicationRows],
      ["Daily Logs", ["Date", "SpO2 Rest", "SpO2 Walk", "mMRC", "AQI", "Symptoms"], patient.logRows],
      ["Alerts", ["Date", "Type", "Status", "Reason"], patient.alertRows],
      ["Instructions", ["Date", "Instruction", "Read At"], patient.instructionRows],
    ].forEach(([section, headers, entries]) => {
      rows.push([section as string, patient.patientName, ...(headers as string[])]);
      (entries as string[][]).forEach((entry) => rows.push([section as string, patient.patientName, ...entry]));
    });
  });

  rows.push([]);
  rows.push(["Notes"]);
  notes.forEach((note) => rows.push(["Notes", note]));
  return rows;
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

      return {
        patientName: patient.name,
        diagnosis:
          diagnosis?.effective_dashboard ?? diagnosis?.primary_diagnosis ?? "n/a",
        riskLevel: score?.risk_level ?? score?.indicator_color ?? "n/a",
        score: score ? String(score.global_score) : "n/a",
        alert: alert?.alert_type ?? "n/a",
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
          ["Mobile", displayValue(patient.mobile_number)],
          ["Alternate mobile", displayValue(patient.alternate_mobile_number)],
          ["Gender", displayValue(patient.gender)],
          ["Date of birth", displayValue(patient.date_of_birth)],
          ["Address", displayValue(patient.address)],
          ["Emergency contact", displayValue(patient.emergency_contact_name)],
          ["Emergency phone", displayValue(patient.emergency_contact_phone)],
          ["Registered at", formatExportDate(patient.created_at)],
          ["Last updated", formatExportDate(patient.updated_at)],
        ] as Array<[string, string]>,
        diagnosis: [
          ["Primary diagnosis", displayValue(diagnosis?.primary_diagnosis)],
          ["Effective dashboard", displayValue(diagnosis?.effective_dashboard)],
          ["Post ICU sub diagnosis", displayValue(diagnosis?.post_icu_sub_diagnosis)],
          ["Comorbidities", displayValue(diagnosis?.comorbidities)],
          ["Comorbidities other", displayValue(diagnosis?.comorbidities_other_text)],
          ["Diagnosed at", displayValue(diagnosis?.diagnosed_at)],
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
      return new NextResponse(rowsToCsv(spreadsheetRows), {
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
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
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
