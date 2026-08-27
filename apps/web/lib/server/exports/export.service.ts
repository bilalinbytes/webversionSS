import { createAdminClient } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/database.types";
import type {
  ExportRequestPayload,
  ExportResult,
  PatientExportRecord,
  DetailedLogRecord,
  DetailedAlertRecord,
  DetailedMedicationRecord,
  DetailedPftRecord,
  ExportDataBundle,
  ExportFileFormat,
} from "./export.types";

import { fetchAuthorizedPatientIds, fetchPatientsByIds } from "./repositories/patient.repository";
import { fetchDiagnosesByPatientIds } from "./repositories/diagnosis.repository";
import { fetchClinicalLogsByPatientIds } from "./repositories/clinical-log.repository";
import { fetchPftRecordsByPatientIds } from "./repositories/pft.repository";
import { fetchMedicationsByPatientIds } from "./repositories/medication.repository";
import { fetchRespiratorySupportByPatientIds } from "./repositories/respiratory-support.repository";
import { fetchRiskScoresByPatientIds } from "./repositories/risk.repository";
import { fetchDiseaseAlertsByPatientIds } from "./repositories/alert.repository";

import {
  toTitleCase,
  formatDateDDMMYYYY,
  computeAgeFromDob,
  normalizeSex,
  formatCleanMobile,
  safeValue,
  aggregateClinicalLogs,
} from "./aggregation/clinical-metrics";
import { calculateRiskCategory } from "./aggregation/risk-level";
import { calculateAdherencePercentage, formatActiveMedications } from "./aggregation/medication-adherence";
import { resolveCompleteDiagnosis, formatRespiratorySupport } from "./aggregation/diagnosis-resolver";

import { renderExcelRegistry } from "./renderers/excel.renderer";
import { renderCsvRegistry } from "./renderers/csv.renderer";
import { renderPdfRegistry } from "./renderers/pdf.renderer";

type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type PftRow = Database["public"]["Tables"]["pft_records"]["Row"];

function getFormattedDateStamp(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export async function executeExport(
  doctorId: string,
  doctorName: string,
  payload: ExportRequestPayload,
): Promise<ExportResult> {
  const admin = createAdminClient();
  const format: ExportFileFormat = payload.format ?? "excel";
  const dateStamp = getFormattedDateStamp();

  // 1. Resolve authorized patient IDs for this doctor
  let authorizedIds = await fetchAuthorizedPatientIds(admin, doctorId);

  // If no patients found, check if the caller is actually a patient requesting their own data
  if (authorizedIds.length === 0 && payload.export_type === "single_patient" && (payload.patient_id === doctorId || (payload.patient_ids && payload.patient_ids[0] === doctorId))) {
    const { data: selfCheck } = await admin.from("patients").select("id").eq("id", doctorId).maybeSingle();
    if (selfCheck) {
       authorizedIds = [doctorId];
    }
  }

  if (authorizedIds.length === 0) {
    throw new Error("No authorized patients found for this doctor.");
  }

  // 2. Determine target patient IDs based on export type/scope
  let targetIds: string[] = [];
  const normalizedScope = payload.export_type.toLowerCase();

  if (normalizedScope === "single_patient") {
    const requestedId = payload.patient_id || (payload.patient_ids && payload.patient_ids[0]);
    if (!requestedId || !authorizedIds.includes(requestedId)) {
      throw new Error("Invalid or unauthorized single patient selected.");
    }
    targetIds = [requestedId];
  } else if (normalizedScope === "selected_patients" || (payload.patient_ids && payload.patient_ids.length > 0 && normalizedScope !== "all_patients" && normalizedScope !== "combined")) {
    targetIds = payload.patient_ids!.filter((id) => authorizedIds.includes(id));
    if (targetIds.length === 0) {
      throw new Error("None of the selected patients are accessible.");
    }
  } else {
    // all_patients, combined, disease_specific, date_wise, daily, weekly, etc.
    targetIds = authorizedIds;
  }

  // 3. Batch fetch all clinical data in parallel (avoid N+1)
  const logOptions = normalizedScope === "date_wise"
    ? { startDate: payload.start_date, endDate: payload.end_date }
    : undefined;

  const [
    rawPatients,
    rawDiagnoses,
    rawLogs,
    rawScores,
    rawAlerts,
    rawMeds,
    rawPfts,
    rawResp,
  ] = await Promise.all([
    fetchPatientsByIds(admin, targetIds),
    fetchDiagnosesByPatientIds(admin, targetIds),
    fetchClinicalLogsByPatientIds(admin, targetIds, logOptions),
    fetchRiskScoresByPatientIds(admin, targetIds),
    fetchDiseaseAlertsByPatientIds(admin, targetIds),
    fetchMedicationsByPatientIds(admin, targetIds),
    fetchPftRecordsByPatientIds(admin, targetIds),
    fetchRespiratorySupportByPatientIds(admin, targetIds),
  ]);

  // 4. Handle Disease-Specific filtering if applicable
  let patients = rawPatients;
  if (normalizedScope === "disease_specific" && payload.disease_filter) {
    const filterLower = payload.disease_filter.toLowerCase().trim();
    const matchingPatientIds = new Set(
      rawDiagnoses
        .filter((d) => {
          const primary = (d.primary_diagnosis ?? "").toLowerCase();
          const effective = (d.effective_dashboard ?? "").toLowerCase();
          const diagExt = d as typeof d & Record<string, unknown>;
          const oadSub = String(diagExt["oad_diagnosis"] ?? "").toLowerCase();
          const ildSub = String(diagExt["ild_subtype"] ?? "").toLowerCase();
          const bronchSub = String(diagExt["bronchiectasis_cause"] ?? "").toLowerCase();

          return (
            primary.includes(filterLower) ||
            effective.includes(filterLower) ||
            oadSub.includes(filterLower) ||
            ildSub.includes(filterLower) ||
            bronchSub.includes(filterLower)
          );
        })
        .map((d) => d.patient_id)
        .filter((id): id is string => Boolean(id)),
    );
    patients = rawPatients.filter((p) => matchingPatientIds.has(p.id));
  }

  if (patients.length === 0) {
    throw new Error("No patient records matched the specified export criteria.");
  }

  // 5. Index data by patient_id
  const diagMap = new Map<string, (typeof rawDiagnoses)[0]>();
  rawDiagnoses.forEach((d) => {
    if (d.patient_id && !diagMap.has(d.patient_id)) diagMap.set(d.patient_id, d);
  });

  const latestScoreMap = new Map<string, (typeof rawScores)[0]>();
  rawScores.forEach((s) => {
    if (s.patient_id && !latestScoreMap.has(s.patient_id)) latestScoreMap.set(s.patient_id, s);
  });

  const activeAlertMap = new Map<string, (typeof rawAlerts)[0]>();
  rawAlerts
    .filter((a) => !a.acknowledged_by_doctor && !a.is_suppressed)
    .forEach((a) => {
      if (a.patient_id && !activeAlertMap.has(a.patient_id)) activeAlertMap.set(a.patient_id, a);
    });

  const latestPftMap = new Map<string, PftRow>();
  rawPfts.forEach((p) => {
    if (p.patient_id && !latestPftMap.has(p.patient_id)) latestPftMap.set(p.patient_id, p);
  });

  const respMap = new Map<string, (typeof rawResp)[0]>();
  rawResp.forEach((r) => {
    if (r.patient_id && !respMap.has(r.patient_id)) respMap.set(r.patient_id, r);
  });

  const medsByPatient = new Map<string, typeof rawMeds>();
  rawMeds.forEach((m) => {
    if (!m.patient_id) return;
    const arr = medsByPatient.get(m.patient_id) ?? [];
    arr.push(m);
    medsByPatient.set(m.patient_id, arr);
  });

  const logsByPatient = new Map<string, typeof rawLogs>();
  rawLogs.forEach((l) => {
    if (!l.patient_id) return;
    const arr = logsByPatient.get(l.patient_id) ?? [];
    arr.push(l);
    logsByPatient.set(l.patient_id, arr);
  });

  // Sort patients: highest risk score first, then by name
  const sortedPatients = [...patients].sort((a, b) => {
    const scoreA = latestScoreMap.get(a.id)?.global_score ?? -1;
    const scoreB = latestScoreMap.get(b.id)?.global_score ?? -1;
    return scoreB - scoreA || a.name.localeCompare(b.name);
  });

  // 6. Aggregate into normalized PatientExportRecord[]
  const records: PatientExportRecord[] = sortedPatients.map((patient, idx) => {
    const diag = diagMap.get(patient.id);
    const score = latestScoreMap.get(patient.id);
    const alert = activeAlertMap.get(patient.id);
    const pft = latestPftMap.get(patient.id);
    const patLogs = logsByPatient.get(patient.id) ?? [];
    const patMeds = medsByPatient.get(patient.id) ?? [];
    const resp = respMap.get(patient.id);

    const patExt = patient as PatientRow & Record<string, unknown>;
    const pftOther = (pft?.other_fields ?? {}) as Record<string, unknown>;

    const diagDetails = resolveCompleteDiagnosis(diag);
    const logStats = aggregateClinicalLogs(patLogs);
    const adherence = calculateAdherencePercentage(patLogs);
    const currentMeds = formatActiveMedications(patMeds);
    const respSupport = formatRespiratorySupport(resp);

    const uhid = `P-${patient.id.slice(0, 8).toUpperCase()}`;
    const enrollYear = patient.created_at ? new Date(patient.created_at).getFullYear() : new Date().getFullYear();
    const fileNo = `${String(idx + 1).padStart(3, "0")}/${enrollYear}`;

    const riskScoreVal = score?.global_score ?? null;
    const riskLevel = calculateRiskCategory(riskScoreVal);

    return {
      sno: idx + 1,
      fileNo,
      uhid,
      mobile: formatCleanMobile(patient.mobile_number),
      name: toTitleCase(patient.name),
      age: computeAgeFromDob(patient.date_of_birth),
      sex: normalizeSex(patient.gender),
      occupation: safeValue(patExt["occupation"]),
      smoker: safeValue(patExt["smoker"] ?? patExt["smoking_status"]),
      symptomatic: logStats.symptomatic,
      dateOfEnroll: formatDateDDMMYYYY(patient.created_at),
      histopathology: diagDetails.histopathology,
      completeDiag: diagDetails.completeDiag,
      typeOfConnective: diagDetails.connective,
      comorbidities: diagDetails.comorbidities,
      sixMwd: safeValue(pftOther["six_mwd"] ?? patExt["six_mwd"]),
      fev1Fvc: safeValue(pft?.fev1_fvc_ratio),
      observedFev: safeValue(pft?.fev1),
      pctPredictedFev1: safeValue(pftOther["fev1_pct_pred"]),
      observedFvc: safeValue(pft?.fvc),
      pctPredictedFvc: safeValue(pftOther["fvc_pct_pred"]),
      dlco: safeValue(pft?.dlco),
      baselineSpo2: safeValue(patExt["baseline_spo2"] ?? pftOther["baseline_spo2"]),
      baselineHr: safeValue(patExt["baseline_heart_rate"] ?? pftOther["baseline_heart_rate"]),
      worstSpo2: logStats.worstSpo2,
      worstMmrc: logStats.worstMmrc,
      worstRiskScore: riskScoreVal !== null ? riskScoreVal : "—",
      riskLevel,
      alertStatus: alert?.alert_type ? alert.alert_type : "Normal",
      totalLogs: logStats.totalLogs,
      adherencePct: adherence,
      currentMeds,
      respiratorySupport: respSupport,
    };
  });

  // 7. For Single Patient mode: Build multi-sheet detailed data
  let singlePatientLogs: DetailedLogRecord[] | undefined;
  let singlePatientAlerts: DetailedAlertRecord[] | undefined;
  let singlePatientMeds: DetailedMedicationRecord[] | undefined;
  let singlePatientPfts: DetailedPftRecord[] | undefined;
  let singlePatientUhid: string | undefined;

  if (normalizedScope === "single_patient" && patients.length === 1 && patients[0] && records[0]) {
    const pId = patients[0].id;
    singlePatientUhid = records[0].uhid;

    // Sheet 2: Logs
    const patLogs = [...(logsByPatient.get(pId) ?? [])].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    );
    singlePatientLogs = patLogs.map((log) => {
      const vasStr = typeof log.vas_symptoms === "object" && log.vas_symptoms
        ? Object.entries(log.vas_symptoms)
            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
            .join(", ")
        : "—";

      const compStr = typeof log.medication_compliance === "object" && log.medication_compliance
        ? Object.entries(log.medication_compliance)
            .map(([k, v]) => `${k}: ${v ? "Taken" : "Missed"}`)
            .join(", ")
        : "—";

      return {
        date: formatDateDDMMYYYY(log.logged_at),
        spo2Rest: safeValue(log.spo2_rest),
        spo2Walk: safeValue(log.spo2_exertion),
        mmrc: safeValue(log.mmrc_today),
        aqi: safeValue(log.aqi_value),
        vasSymptoms: vasStr,
        medicationCompliance: compStr,
        riskScore: safeValue(log.aqi_value),
        clinicalNotes: "Daily routine check-in recorded",
      };
    });

    // Sheet 3: Alerts
    const patAlerts = rawAlerts.filter((a) => a.patient_id === pId);
    singlePatientAlerts = patAlerts.map((a) => {
      const aExt = a as typeof a & Record<string, unknown>;
      return {
        date: formatDateDDMMYYYY(a.created_at),
        alertType: a.alert_type || "Critical",
        severity: String(aExt["severity"] ?? (a.alert_type.toLowerCase().includes("red") || a.alert_type.toLowerCase().includes("crit") ? "Critical" : "High")),
        status: a.acknowledged_by_doctor ? "Acknowledged" : "Active",
        reason: safeValue(aExt["trigger_reason"] ?? aExt["suggested_action"] ?? a.triggering_metrics ?? "Threshold exceeded"),
      };
    });

    // Sheet 4: Medications
    const patMeds = rawMeds.filter((m) => m.patient_id === pId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    singlePatientMeds = patMeds.map((m) => {
      const isActive = !m.end_date || new Date(m.end_date) >= today;
      return {
        drugName: m.drug_name,
        route: "Oral/Inhaled",
        dose: `${m.dose || ""} ${m.dose_unit || ""}`.trim() || "—",
        frequency: m.frequency || "—",
        startDate: formatDateDDMMYYYY(m.start_date),
        endDate: m.end_date ? formatDateDDMMYYYY(m.end_date) : "Ongoing",
        status: isActive ? "Active" : "Discontinued",
      };
    });

    // Sheet 5: PFT History (Zero raw JSON)
    const patPfts = rawPfts.filter((p) => p.patient_id === pId);
    singlePatientPfts = patPfts.map((p) => {
      const other = (p.other_fields ?? {}) as Record<string, unknown>;
      return {
        testDate: formatDateDDMMYYYY(p.test_date),
        fev1FvcRatio: safeValue(p.fev1_fvc_ratio),
        observedFev: safeValue(p.fev1),
        pctPredictedFev1: safeValue(other["fev1_pct_pred"]),
        observedFvc: safeValue(p.fvc),
        pctPredictedFvc: safeValue(other["fvc_pct_pred"]),
        dlco: safeValue(p.dlco),
        sixMwd: safeValue(other["six_mwd"]),
        baselineSpo2: safeValue(other["baseline_spo2"]),
        baselineHr: safeValue(other["baseline_heart_rate"]),
      };
    });
  }

  let allPatientLogs: DetailedLogRecord[] | undefined;
  if (normalizedScope === "all_patients" || normalizedScope === "selected_patients") {
    const sortedLogs = [...rawLogs].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    );
    allPatientLogs = sortedLogs.map((log) => {
      const patient = patients.find((p) => p.id === log.patient_id);
      const uhid = log.patient_id ? `P-${log.patient_id.slice(0, 8).toUpperCase()}` : "N/A";
      
      const vasStr = typeof log.vas_symptoms === "object" && log.vas_symptoms
        ? Object.entries(log.vas_symptoms)
            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
            .join(", ")
        : "--";

      const compStr = typeof log.medication_compliance === "object" && log.medication_compliance
        ? Object.entries(log.medication_compliance)
            .map(([k, v]) => `${k}: ${v ? "Taken" : "Missed"}`)
            .join(", ")
        : "--";

      return {
        patientName: patient?.name || "Unknown",
        uhid,
        date: formatDateDDMMYYYY(log.logged_at),
        spo2Rest: safeValue(log.spo2_rest),
        spo2Walk: safeValue(log.spo2_exertion),
        mmrc: safeValue(log.mmrc_today),
        aqi: safeValue(log.aqi_value),
        vasSymptoms: vasStr,
        medicationCompliance: compStr,
        riskScore: safeValue((log as any).computed_risk_score),
        clinicalNotes: safeValue((log as any).clinical_notes),
      };
    });
  }

  // 8. Compute Standardized File Name (Requirement 19)
  let baseFilename = `O2Plus_All_Patient_Records_${dateStamp}`;
  if (normalizedScope === "selected_patients") {
    baseFilename = `O2Plus_Selected_Patient_Records_${dateStamp}`;
  } else if (normalizedScope === "single_patient" && singlePatientUhid) {
    baseFilename = `O2Plus_Patient_${singlePatientUhid}_${dateStamp}`;
  } else if (normalizedScope === "disease_specific" && payload.disease_filter) {
    const cleanDisease = payload.disease_filter.replace(/[^a-zA-Z0-9]/g, "_");
    baseFilename = `O2Plus_${cleanDisease}_Records_${dateStamp}`;
  } else if (normalizedScope === "date_wise") {
    baseFilename = `O2Plus_Datewise_Records_${dateStamp}`;
  }

  const bundle: ExportDataBundle = {
    records,
    scope: normalizedScope,
    format,
    doctorName,
    diseaseFilter: payload.disease_filter,
    startDate: payload.start_date,
    endDate: payload.end_date,
    singlePatientLogs,
    singlePatientAlerts,
    singlePatientMeds,
    singlePatientPfts,
    singlePatientUhid,
    allPatientLogs,
  };

  // 9. Delegate to format renderer
  let buffer: Buffer | Uint8Array | string;
  let mimeType: string;
  let filename: string;

  if (format === "csv") {
    buffer = renderCsvRegistry(bundle);
    mimeType = "text/csv; charset=utf-8";
    filename = `${baseFilename}.csv`;
  } else if (format === "pdf") {
    buffer = await renderPdfRegistry(bundle);
    mimeType = "application/pdf";
    filename = `${baseFilename}.pdf`;
  } else {
    // excel default
    buffer = await renderExcelRegistry(bundle);
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    filename = `${baseFilename}.xlsx`;
  }

  // 10. Audit Trail (Asynchronous fire-and-forget)
  Promise.resolve(
    admin.from("export_records").insert({
      doctor_id: doctorId,
      export_type: normalizedScope,
      generated_at: new Date().toISOString(),
      patient_id: normalizedScope === "single_patient" && targetIds.length === 1 && targetIds[0] ? targetIds[0] : null,
    }),
  ).catch((err: unknown) => console.error("Audit log insert failed:", err));

  return {
    filename,
    mimeType,
    buffer,
  };
}
