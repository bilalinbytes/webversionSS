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
import {
  processIldLogEntry,
  processAsthmaLogEntry,
  processCopdLogEntry,
  processBronchLogEntry,
  processPostIcuLogEntry,
} from "./aggregation/disease-score-calculator";
import type {
  IldTrackRecord,
  AsthmaTrackRecord,
  CopdTrackRecord,
  BronchTrackRecord,
  PostIcuTrackRecord,
} from "./export.types";

import { renderExcelRegistry } from "./renderers/excel.renderer";
import { renderCsvRegistry } from "./renderers/csv.renderer";
import { renderPdfRegistry } from "./renderers/pdf.renderer";
import {
  transformPatientToLongitudinal,
  type LongitudinalPatientData,
} from "./aggregation/longitudinal-transformer";

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
    rawInstructionsRes,
    rawAppointmentsRes,
  ] = await Promise.all([
    fetchPatientsByIds(admin, targetIds),
    fetchDiagnosesByPatientIds(admin, targetIds),
    fetchClinicalLogsByPatientIds(admin, targetIds, logOptions),
    fetchRiskScoresByPatientIds(admin, targetIds),
    fetchDiseaseAlertsByPatientIds(admin, targetIds),
    fetchMedicationsByPatientIds(admin, targetIds),
    fetchPftRecordsByPatientIds(admin, targetIds),
    fetchRespiratorySupportByPatientIds(admin, targetIds),
    admin
      .from("doctor_instructions")
      .select("id, patient_id, instruction_text, created_at, doctor_id, read_by_patient_at")
      .in("patient_id", targetIds)
      .order("created_at", { ascending: false }),
    admin
      .from("appointments")
      .select("id, patient_id, scheduled_at, title, notes, status, created_at, doctor_id, updated_at")
      .in("patient_id", targetIds)
      .order("scheduled_at", { ascending: false }),
  ]);

  const rawInstructions = rawInstructionsRes.data ?? [];
  const rawAppointments = rawAppointmentsRes.data ?? [];

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
  const scoresByPatient = new Map<string, typeof rawScores>();
  rawScores.forEach((s) => {
    if (s.patient_id && !latestScoreMap.has(s.patient_id)) latestScoreMap.set(s.patient_id, s);
    if (s.patient_id) {
      const arr = scoresByPatient.get(s.patient_id) ?? [];
      arr.push(s);
      scoresByPatient.set(s.patient_id, arr);
    }
  });

  const activeAlertMap = new Map<string, (typeof rawAlerts)[0]>();
  const alertsByPatient = new Map<string, typeof rawAlerts>();
  rawAlerts.forEach((a) => {
    if (a.patient_id && !a.acknowledged_by_doctor && !a.is_suppressed && !activeAlertMap.has(a.patient_id)) {
      activeAlertMap.set(a.patient_id, a);
    }
    if (a.patient_id) {
      const arr = alertsByPatient.get(a.patient_id) ?? [];
      arr.push(a);
      alertsByPatient.set(a.patient_id, arr);
    }
  });

  const latestPftMap = new Map<string, PftRow>();
  const pftsByPatient = new Map<string, PftRow[]>();
  rawPfts.forEach((p) => {
    if (p.patient_id && !latestPftMap.has(p.patient_id)) latestPftMap.set(p.patient_id, p);
    if (p.patient_id) {
      const arr = pftsByPatient.get(p.patient_id) ?? [];
      arr.push(p);
      pftsByPatient.set(p.patient_id, arr);
    }
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

  const instructionsByPatient = new Map<string, typeof rawInstructions>();
  rawInstructions.forEach((ins) => {
    if (!ins.patient_id) return;
    const arr = instructionsByPatient.get(ins.patient_id) ?? [];
    arr.push(ins);
    instructionsByPatient.set(ins.patient_id, arr);
  });

  const appointmentsByPatient = new Map<string, typeof rawAppointments>();
  rawAppointments.forEach((apt) => {
    if (!apt.patient_id) return;
    const arr = appointmentsByPatient.get(apt.patient_id) ?? [];
    arr.push(apt);
    appointmentsByPatient.set(apt.patient_id, arr);
  });

  // Sort patients: highest risk score first, then by name
  const sortedPatients = [...patients].sort((a, b) => {
    const scoreA = latestScoreMap.get(a.id)?.global_score ?? -1;
    const scoreB = latestScoreMap.get(b.id)?.global_score ?? -1;
    return scoreB - scoreA || a.name.localeCompare(b.name);
  });


  // 6. Aggregate into normalized PatientExportRecord[] (Single Consolidated Row per Patient)
  const records: PatientExportRecord[] = sortedPatients.map((patient, idx) => {
    const diag = diagMap.get(patient.id);
    const score = latestScoreMap.get(patient.id);
    const alert = activeAlertMap.get(patient.id);
    const pft = latestPftMap.get(patient.id);
    const patPfts = pftsByPatient.get(patient.id) ?? [];
    const patLogs = logsByPatient.get(patient.id) ?? [];
    const patMeds = medsByPatient.get(patient.id) ?? [];
    const resp = respMap.get(patient.id);

    const patExt = patient as PatientRow & Record<string, unknown>;
    const pftOther = (pft?.other_fields ?? {}) as Record<string, unknown>;

    const diagDetails = resolveCompleteDiagnosis(diag);
    const logStats = aggregateClinicalLogs(patLogs);
    const respSupport = formatRespiratorySupport(resp);

    const uhid = `P-${patient.id.slice(0, 8).toUpperCase()}`;
    const enrollYear = patient.created_at ? new Date(patient.created_at).getFullYear() : new Date().getFullYear();
    const fileNo = `${String(idx + 1).padStart(3, "0")}/${enrollYear}`;

    const riskScoreVal = score?.global_score ?? null;
    const riskLevel = calculateRiskCategory(riskScoreVal);

    // ── Updated & Longitudinal PFTs ──
    const sortedPfts = [...patPfts].sort((a, b) => new Date(a.test_date ?? a.created_at ?? 0).getTime() - new Date(b.test_date ?? b.created_at ?? 0).getTime());
    const latestPft = sortedPfts[sortedPfts.length - 1] ?? pft;
    const latestFev1 = safeValue(latestPft?.fev1);
    const latestFvc = safeValue(latestPft?.fvc);
    const latestFev1Fvc = safeValue(latestPft?.fev1_fvc_ratio);
    const latestDlco = safeValue(latestPft?.dlco);
    const longitudinalPftHistory = sortedPfts.length > 0
      ? sortedPfts.map((p) => `[${formatDateDDMMYYYY(p.test_date ?? p.created_at)}] FEV1: ${safeValue(p.fev1)}L, FVC: ${safeValue(p.fvc)}L, Ratio: ${safeValue(p.fev1_fvc_ratio)}%${p.dlco ? `, DLCO: ${p.dlco}%` : ""}`).join(" | ")
      : "No longitudinal PFTs recorded";

    // ── Telemetry Surveillance Averages & Extremes ──
    const restingSpo2Vals = patLogs.map(l => l.spo2_rest).filter((v): v is number => typeof v === "number" && v > 0);
    const avgSpo2Rest = restingSpo2Vals.length > 0 ? `${Math.round(restingSpo2Vals.reduce((a, b) => a + b, 0) / restingSpo2Vals.length)}%` : "—";
    const worstSpo2Rest = restingSpo2Vals.length > 0 ? `${Math.min(...restingSpo2Vals)}%` : "—";

    const exertionSpo2Vals = patLogs.map(l => l.spo2_exertion).filter((v): v is number => typeof v === "number" && v > 0);
    const avgSpo2Exertion = exertionSpo2Vals.length > 0 ? `${Math.round(exertionSpo2Vals.reduce((a, b) => a + b, 0) / exertionSpo2Vals.length)}%` : "—";
    const worstSpo2Exertion = exertionSpo2Vals.length > 0 ? `${Math.min(...exertionSpo2Vals)}%` : "—";

    const hrVals = patLogs.map(l => {
      const raw = l as Record<string, unknown>;
      const ds = (l.disease_specific_data ?? {}) as Record<string, unknown>;
      const vas = (l.vas_symptoms ?? {}) as Record<string, unknown>;
      return typeof raw["heart_rate"] === "number" ? raw["heart_rate"] : typeof ds["heart_rate"] === "number" ? ds["heart_rate"] : typeof vas["heart_rate"] === "number" ? vas["heart_rate"] : null;
    }).filter((v): v is number => typeof v === "number" && v > 0);
    const avgHeartRate = hrVals.length > 0 ? `${Math.round(hrVals.reduce((a, b) => a + b, 0) / hrVals.length)} BPM` : "—";
    const worstHeartRate = hrVals.length > 0 ? `${Math.max(...hrVals)} BPM` : "—";

    const aqiVals = patLogs.map(l => l.aqi_value).filter((v): v is number => typeof v === "number" && v > 0);
    const avgAqi = aqiVals.length > 0 ? `${Math.round(aqiVals.reduce((a, b) => a + b, 0) / aqiVals.length)}` : "—";
    const worstAqi = aqiVals.length > 0 ? `${Math.max(...aqiVals)}` : "—";

    const mmrcVals = patLogs.map(l => l.mmrc_today).filter((v): v is number => typeof v === "number" && v >= 0);
    const latestMmrc = mmrcVals.length > 0 ? `Grade ${mmrcVals[mmrcVals.length - 1]}` : "—";
    const worstMmrc = mmrcVals.length > 0 ? `Grade ${Math.max(...mmrcVals)}` : "—";

    // ── Consolidated Symptoms Surveillance ──
    const symptomMap = new Map<string, { severities: number[]; lastVal: number }>();
    patLogs.forEach(l => {
      if (l.vas_symptoms && typeof l.vas_symptoms === "object") {
        Object.entries(l.vas_symptoms as Record<string, unknown>).forEach(([symp, val]) => {
          if (typeof val === "number") {
            const entry = symptomMap.get(symp) ?? { severities: [], lastVal: 0 };
            entry.severities.push(val);
            entry.lastVal = val;
            symptomMap.set(symp, entry);
          }
        });
      }
    });
    const allSymptomsSummary = symptomMap.size > 0
      ? Array.from(symptomMap.entries()).map(([k, v]) => {
          const avg = (v.severities.reduce((a, b) => a + b, 0) / v.severities.length).toFixed(1);
          const status = v.lastVal === 0 ? "Resolved" : `Latest: ${v.lastVal}/10`;
          return `${toTitleCase(k.replace(/_/g, " "))} (Avg: ${avg}/10, ${status})`;
        }).join("; ")
      : "No symptoms reported";

    // ── Formatted Daily Logs ──
    const formattedDailyLogs = patLogs
      .slice()
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      .map((log) => {
        const raw = log as Record<string, unknown>;
        const logDate = formatDateDDMMYYYY(log.logged_at);
        const aqi = safeValue(log.aqi_value);
        const spo2Rest = safeValue(log.spo2_rest);
        const spo2Exertion = safeValue(log.spo2_exertion);
        const heartRate = safeValue(raw["heart_rate"] ?? (log as { heart_rate?: unknown }).heart_rate);
        const mmrc = safeValue(log.mmrc_today);

        // Medication adherence
        let medicationAdherence = "—";
        if (log.medication_compliance && typeof log.medication_compliance === "object") {
          const entries = Object.entries(log.medication_compliance as Record<string, boolean>);
          if (entries.length > 0) {
            const taken = entries.filter(([, v]) => v === true).length;
            const total = entries.length;
            medicationAdherence = `${taken}/${total} Taken (${Math.round((taken / total) * 100)}%)`;
          }
        }

        // Symptoms VAS
        let symptomsVas = "—";
        if (log.vas_symptoms && typeof log.vas_symptoms === "object") {
          const entries = Object.entries(log.vas_symptoms as Record<string, number | string>);
          if (entries.length > 0) {
            symptomsVas = entries
              .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}/10`)
              .join(", ");
          }
        }

        // Drug Side Effects
        let sideEffects = "None";
        const seRaw = raw["side_effects"];
        if (Array.isArray(seRaw) && seRaw.length > 0) {
          sideEffects = seRaw.map((s) => toTitleCase(String(s))).join(", ");
        } else if (typeof seRaw === "string" && seRaw.trim()) {
          sideEffects = seRaw;
        }

        // K-BILD Score
        let kbild = "—";
        const kScore = raw["kbild_score"];
        const kAnswered = raw["kbild_answered_count"];
        if (kScore !== null && kScore !== undefined) {
          kbild = `${kScore}/100${kAnswered ? ` (${kAnswered}/15 Qs)` : ""}`;
        }

        // Asthma Control Score
        let asthmaControl = "—";
        const acStatus = raw["asthma_control_status"];
        const acYesCount = raw["asthma_control_yes_count"];
        if (acStatus || (acYesCount !== null && acYesCount !== undefined)) {
          const statusLabel = acStatus ? String(acStatus).replace(/_/g, " ") : "";
          asthmaControl = `${toTitleCase(statusLabel)}${acYesCount !== null && acYesCount !== undefined ? ` (${acYesCount}/4 Yes)` : ""}`.trim() || "—";
        }

        // Sputum & Hemoptysis
        const sputumParts: string[] = [];
        if (raw["sputum_volume"]) sputumParts.push(`Vol: ${toTitleCase(String(raw["sputum_volume"]))}`);
        if (raw["sputum_colour"]) sputumParts.push(`Colour: ${toTitleCase(String(raw["sputum_colour"]))}`);
        if (raw["haemoptysis"] === true || raw["haemoptysis_volume"]) {
          sputumParts.push(`Haemoptysis: ${toTitleCase(String(raw["haemoptysis_volume"] ?? "Present"))}`);
        }
        const sputumHemoptysis = sputumParts.length > 0 ? sputumParts.join(", ") : "None / Normal";

        // Disease Specific Fields
        const dsParts: string[] = [];
        if (raw["pefr_lpm"] || raw["pefr_reading"]) {
          dsParts.push(`PEFR: ${raw["pefr_lpm"] ?? raw["pefr_reading"]} L/min`);
        }
        if (raw["rescue_inhaler_puffs"]) {
          dsParts.push(`Rescue Puffs: ${raw["rescue_inhaler_puffs"]}`);
        }
        if (raw["ease_of_clearance"] || raw["ease_of_sputum_clearance"]) {
          dsParts.push(`Clearance Ease: ${raw["ease_of_clearance"] ?? raw["ease_of_sputum_clearance"]}/5`);
        }
        if (raw["recorded_temperature_f"] || raw["temperature_f"]) {
          dsParts.push(`Temp: ${raw["recorded_temperature_f"] ?? raw["temperature_f"]}°F`);
        }
        if (raw["energy_level"] !== null && raw["energy_level"] !== undefined) {
          dsParts.push(`Energy: ${raw["energy_level"]}/10`);
        }
        if (raw["chest_heaviness"] !== null && raw["chest_heaviness"] !== undefined) {
          dsParts.push(`Chest Heaviness: ${raw["chest_heaviness"]}/10`);
        }
        if (raw["cough_frequency"] !== null && raw["cough_frequency"] !== undefined) {
          dsParts.push(`Cough Freq: ${raw["cough_frequency"]}/4`);
        }
        if (raw["night_waking"] === true) dsParts.push(`Night Waking: Yes`);
        if (raw["wheezing"] === true) dsParts.push(`Wheezing: Yes`);
        if (raw["malaise"] === true) dsParts.push(`Malaise: Yes`);
        if (raw["sleep_disturbed"] === true) dsParts.push(`Sleep Disturbed: Yes`);

        const diseaseSpecific = dsParts.length > 0 ? dsParts.join("; ") : "—";

        return {
          logDate,
          aqi,
          spo2Rest,
          spo2Exertion,
          heartRate,
          medicationAdherence,
          mmrc,
          symptomsVas,
          sideEffects,
          kbild,
          asthmaControl,
          sputumHemoptysis,
          diseaseSpecific,
        };
      });

    const longitudinalLogsHistory = formattedDailyLogs.length > 0
      ? formattedDailyLogs.map(l => `[${l.logDate}] SpO2: ${l.spo2Rest}%, HR: ${l.heartRate}, mMRC: ${l.mmrc}, AQI: ${l.aqi}, Symptoms: ${l.symptomsVas}, Meds: ${l.medicationAdherence}${l.diseaseSpecific !== "—" ? `, Specific: ${l.diseaseSpecific}` : ""}`).join(" | ")
      : "No daily logs recorded";

    // ── Medications (Active, Newly Added, Discontinued & Compliance) ──
    const todayIso = new Date().toISOString().split("T")[0]!;
    const activeMedsList = patMeds.filter(m => !m.end_date || m.end_date > todayIso);
    const discontinuedMedsList = patMeds.filter(m => m.end_date && m.end_date <= todayIso);
    const currentMeds = formatActiveMedications(activeMedsList);
    const newlyAddedMeds = activeMedsList.filter(m => m.start_date && m.start_date >= (payload.start_date ?? todayIso)).map(m => `${m.drug_name} (${m.dose || ""}${m.dose_unit || ""} ${m.frequency || ""})`.trim()).join("; ") || "None in period";
    const discontinuedMedsHistory = discontinuedMedsList.map(m => `${m.drug_name} (${m.dose || ""}${m.dose_unit || ""} - Discontinued: ${m.end_date})`).join("; ") || "None";

    let totalLoggedDoses = 0;
    let takenDoses = 0;
    patLogs.forEach(l => {
      if (l.medication_compliance && typeof l.medication_compliance === "object") {
        const entries = Object.values(l.medication_compliance as Record<string, boolean>);
        entries.forEach(v => {
          totalLoggedDoses++;
          if (v === true) takenDoses++;
        });
      }
    });
    const medicationComplianceSummary = totalLoggedDoses > 0
      ? `${Math.round((takenDoses / totalLoggedDoses) * 100)}% (${takenDoses}/${totalLoggedDoses} doses taken)`
      : "No medication compliance logged";

    // ── Quality of Life & Disease Specific Details ──
    const kbildScores = patLogs.map(l => (l as Record<string, unknown>)["kbild_score"]).filter((v): v is number => typeof v === "number");
    const latestKbildScore = kbildScores.length > 0 ? `${kbildScores[kbildScores.length - 1]}/100` : "—";
    const latestLogWithKbild = patLogs.slice().reverse().find(l => typeof (l as Record<string, unknown>)["kbild_score"] === "number");
    let kbildSubscoresInterpretation = "—";
    if (latestLogWithKbild) {
      const raw = latestLogWithKbild as Record<string, unknown>;
      const psych = raw["kbild_psychological"] ?? raw["kbild_psych"] ?? "—";
      const breath = raw["kbild_breathlessness"] ?? raw["kbild_breath"] ?? "—";
      const chest = raw["kbild_chest"] ?? "—";
      const kScoreNum = Number(raw["kbild_score"]);
      const interp = kScoreNum >= 70 ? "Good HRQoL" : kScoreNum >= 50 ? "Moderate HRQoL Impact" : "Significant HRQoL Impairment";
      kbildSubscoresInterpretation = `Psych: ${psych}, Breath: ${breath}, Chest: ${chest} | ${interp}`;
    }

    const asthmaLogs = patLogs.filter(l => (l as Record<string, unknown>)["asthma_control_status"] || (l as Record<string, unknown>)["pefr_lpm"] || (l as Record<string, unknown>)["pefr_reading"]);
    const latestAsthmaLog = asthmaLogs[asthmaLogs.length - 1];
    let asthmaControlStatus = "—";
    let asthmaPefrRescuePuffs = "—";
    if (latestAsthmaLog) {
      const raw = latestAsthmaLog as Record<string, unknown>;
      const status = raw["asthma_control_status"] ? toTitleCase(String(raw["asthma_control_status"]).replace(/_/g, " ")) : "Assessed";
      const yesCount = raw["asthma_control_yes_count"] ?? "—";
      asthmaControlStatus = `${status} (${yesCount}/4 Criteria Yes)`;
      const pefr = raw["pefr_lpm"] ?? raw["pefr_reading"] ?? "—";
      const puffs = raw["rescue_inhaler_puffs"] ?? "0";
      asthmaPefrRescuePuffs = `PEFR: ${pefr} L/min | Rescue Puffs: ${puffs}/day`;
    }

    const copdLogs = patLogs.filter(l => (l as Record<string, unknown>)["energy_level"] !== undefined || (l as Record<string, unknown>)["sputum_volume"]);
    let copdMetricsSummary = "—";
    if (copdLogs.length > 0) {
      const latest = copdLogs[copdLogs.length - 1] as Record<string, unknown>;
      const energy = latest["energy_level"] ?? "—";
      const heaviness = latest["chest_heaviness"] ?? "—";
      const sputumVol = latest["sputum_volume"] ? toTitleCase(String(latest["sputum_volume"])) : "Normal";
      const sputumCol = latest["sputum_colour"] ? toTitleCase(String(latest["sputum_colour"])) : "Clear";
      copdMetricsSummary = `Energy: ${energy}/10, Chest Heaviness: ${heaviness}/10, Sputum: ${sputumVol} (${sputumCol})`;
    }

    const bronchLogs = patLogs.filter(l => (l as Record<string, unknown>)["ease_of_clearance"] || (l as Record<string, unknown>)["recorded_temperature_f"]);
    let bronchPostIcuMetricsSummary = "—";
    if (bronchLogs.length > 0) {
      const latest = bronchLogs[bronchLogs.length - 1] as Record<string, unknown>;
      const ease = latest["ease_of_clearance"] ?? latest["ease_of_sputum_clearance"] ?? "—";
      const temp = latest["recorded_temperature_f"] ?? latest["temperature_f"] ?? "—";
      const malaise = latest["malaise"] === true ? "Yes" : "No";
      bronchPostIcuMetricsSummary = `Clearance Ease: ${ease}/5, Temp: ${temp}°F, Malaise: ${malaise}`;
    }

    let diseaseSpecificMetricsSummary = "—";
    const diagStr = (diag?.primary_diagnosis || diagDetails.completeDiag || "").toLowerCase();
    const effStr = (diag?.effective_dashboard || "").toLowerCase();
    if (effStr === "ild" || diagStr.includes("ild") || diagStr.includes("ipf")) {
      diseaseSpecificMetricsSummary = latestKbildScore !== "—" ? `K-BILD: ${latestKbildScore}/100 (${kbildSubscoresInterpretation})` : "K-BILD: Surveillance active";
    } else if (effStr === "asthma" || diagStr.includes("asthma")) {
      diseaseSpecificMetricsSummary = `GINA: ${asthmaControlStatus} | ${asthmaPefrRescuePuffs}`;
    } else if (effStr === "copd" || diagStr.includes("copd")) {
      diseaseSpecificMetricsSummary = copdMetricsSummary !== "—" ? copdMetricsSummary : "COPD Surveillance active";
    } else if (effStr === "bronchiectasis" || effStr === "post_icu" || diagStr.includes("bronch") || diagStr.includes("icu")) {
      diseaseSpecificMetricsSummary = bronchPostIcuMetricsSummary !== "—" ? bronchPostIcuMetricsSummary : "Airway Clearance & Recovery active";
    } else {
      const activeMetrics = [copdMetricsSummary, bronchPostIcuMetricsSummary, asthmaControlStatus].filter(s => s !== "—");
      diseaseSpecificMetricsSummary = activeMetrics.length > 0 ? activeMetrics.join(" | ") : "Clinical surveillance active";
    }

    let totalDaysSpan = 30;
    if (payload.start_date && payload.end_date) {
      const diffMs = new Date(payload.end_date).getTime() - new Date(payload.start_date).getTime();
      totalDaysSpan = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
    } else if (patLogs.length > 0) {
      const firstDate = new Date(patLogs[0]!.logged_at).getTime();
      const lastDate = new Date().getTime();
      totalDaysSpan = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1);
    }

    return {
      sno: idx + 1,
      fileNo,
      uhid,
      name: toTitleCase(patient.name),
      age: computeAgeFromDob(patient.date_of_birth),
      sex: normalizeSex(patient.gender),
      occupation: safeValue(patExt["occupation"]),
      otherOccupation: safeValue(patExt["other_occupation"]),
      significantExposure: safeValue(patExt["significant_exposure"]),
      mobile: formatCleanMobile(patient.mobile_number),
      alternateMobile: safeValue(patExt["alternate_mobile"] ?? patExt["alternate_phone"]),
      dateOfEnroll: formatDateDDMMYYYY(patient.created_at),

      // Diagnosis & Subtype
      diseaseCategory: safeValue(patExt["disease_category"] ?? diag?.effective_dashboard),
      primaryDiagnosis: diag?.primary_diagnosis || diagDetails.completeDiag || "Respiratory Condition",
      diseaseSubtype: diagDetails.completeDiag,
      histopathology: diagDetails.histopathology,
      completeDiag: diagDetails.completeDiag,
      effectiveDashboard: (diag?.effective_dashboard || "ild").toLowerCase() as any,
      typeOfConnective: diagDetails.connective,
      comorbidities: diagDetails.comorbidities,
      smoker: safeValue(patExt["smoker"] ?? patExt["smoking_status"]),
      symptomatic: logStats.symptomatic,

      // Baseline Physiology
      baselineSpo2: safeValue(patExt["baseline_spo2"] ?? pftOther["baseline_spo2"]),
      baselineHr: safeValue(patExt["baseline_heart_rate"] ?? pftOther["baseline_heart_rate"]),
      sixMwd: safeValue(pftOther["six_mwd"] ?? patExt["six_mwd"]),
      observedFev: safeValue(pft?.fev1),
      observedFvc: safeValue(pft?.fvc),
      fev1Fvc: safeValue(pft?.fev1_fvc_ratio),
      pctPredictedFev1: safeValue(pftOther["fev1_pct_pred"]),
      pctPredictedFvc: safeValue(pftOther["fvc_pct_pred"]),
      dlco: safeValue(pft?.dlco),
      respiratorySupport: respSupport,

      // Updated & Longitudinal PFTs
      latestFev1,
      latestFvc,
      latestFev1Fvc,
      latestDlco,
      longitudinalPftHistory,

      // App Engagement & Telemetry Surveillance
      totalDaysInPeriod: totalDaysSpan,
      daysLogged: logStats.totalLogs,
      adherencePct: `${Math.min(100, Math.round((logStats.totalLogs / totalDaysSpan) * 100))}%`,
      avgSpo2Rest,
      worstSpo2: worstSpo2Rest,
      avgSpo2Exertion,
      worstSpo2Exertion,
      avgHeartRate,
      worstHeartRate,
      avgAqi,
      worstAqi,
      latestMmrc,
      worstMmrc,
      worstRiskScore: riskScoreVal !== null ? riskScoreVal : "—",
      riskLevel,
      alertStatus: alert?.alert_type ? alert.alert_type : "Normal",
      totalLogs: logStats.totalLogs,

      // Symptoms & Daily Logs History
      allSymptomsSummary,
      longitudinalLogsHistory,

      // Medications
      currentMeds,
      newlyAddedMeds,
      discontinuedMedsHistory,
      medicationComplianceSummary,

      // Quality of Life & Disease Specific Details
      latestKbildScore,
      kbildSubscoresInterpretation,
      diseaseSpecificMetricsSummary,
      asthmaControlStatus,
      asthmaPefrRescuePuffs,
      copdMetricsSummary,
      bronchPostIcuMetricsSummary,

      dailyLogs: formattedDailyLogs,
    };
  });

  // 6.5 Build Disease-Track Specific Collections with Individual Responses, Calculated Scores & Interpretations
  const ildTrackRecords: IldTrackRecord[] = [];
  const asthmaTrackRecords: AsthmaTrackRecord[] = [];
  const copdTrackRecords: CopdTrackRecord[] = [];
  const bronchTrackRecords: BronchTrackRecord[] = [];
  const postIcuTrackRecords: PostIcuTrackRecord[] = [];

  records.forEach((record) => {
    const patientObj = patients.find((p) => record.uhid === `P-${p.id.slice(0, 8).toUpperCase()}`);
    const patientId = patientObj?.id;
    const rawLogsForPatient = [...(logsByPatient.get(patientId ?? "") ?? [])].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    );

    const eff = (record.effectiveDashboard || "").toLowerCase();
    const primary = (record.primaryDiagnosis || record.completeDiag || "").toLowerCase();

    // Map each daily log entry to its disease track
    if (rawLogsForPatient.length > 0) {
      rawLogsForPatient.forEach((rawLog) => {
        const rawObj = rawLog as Record<string, unknown>;
        const ds = (rawObj["disease_specific_data"] ?? {}) as Record<string, unknown>;
        const logEff = String(ds["effective_dashboard"] ?? eff).toLowerCase();

        if (logEff.includes("ild") || primary.includes("ild") || primary.includes("fibrosis") || primary.includes("nsip") || primary.includes("uip") || primary.includes("hp") || primary.includes("sarcoidosis")) {
          ildTrackRecords.push(processIldLogEntry(record, rawObj, ildTrackRecords.length + 1));
        } else if (logEff.includes("asthma") || primary.includes("asthma")) {
          asthmaTrackRecords.push(processAsthmaLogEntry(record, rawObj, asthmaTrackRecords.length + 1));
        } else if (logEff.includes("copd") || primary.includes("copd") || primary.includes("emphysema") || primary.includes("chronic bronchitis")) {
          copdTrackRecords.push(processCopdLogEntry(record, rawObj, copdTrackRecords.length + 1));
        } else if (logEff.includes("bronch") || primary.includes("bronch") || primary.includes("cylindrical") || primary.includes("cystic")) {
          bronchTrackRecords.push(processBronchLogEntry(record, rawObj, bronchTrackRecords.length + 1));
        } else if (logEff.includes("post_icu") || logEff.includes("icu") || primary.includes("icu") || primary.includes("post-icu") || primary.includes("pics") || primary.includes("ards")) {
          postIcuTrackRecords.push(processPostIcuLogEntry(record, rawObj, postIcuTrackRecords.length + 1));
        } else {
          // Default fallback
          if (eff === "asthma") asthmaTrackRecords.push(processAsthmaLogEntry(record, rawObj, asthmaTrackRecords.length + 1));
          else if (eff === "copd") copdTrackRecords.push(processCopdLogEntry(record, rawObj, copdTrackRecords.length + 1));
          else if (eff === "bronchiectasis") bronchTrackRecords.push(processBronchLogEntry(record, rawObj, bronchTrackRecords.length + 1));
          else if (eff === "post_icu") postIcuTrackRecords.push(processPostIcuLogEntry(record, rawObj, postIcuTrackRecords.length + 1));
          else ildTrackRecords.push(processIldLogEntry(record, rawObj, ildTrackRecords.length + 1));
        }
      });
    } else {
      // If patient has zero logs yet, generate a baseline track record so doctor sees the registered patient in the track sheet
      const dummyLog = { logged_at: patientObj?.created_at || new Date().toISOString() };
      if (eff.includes("asthma") || primary.includes("asthma")) {
        asthmaTrackRecords.push(processAsthmaLogEntry(record, dummyLog, asthmaTrackRecords.length + 1));
      } else if (eff.includes("copd") || primary.includes("copd")) {
        copdTrackRecords.push(processCopdLogEntry(record, dummyLog, copdTrackRecords.length + 1));
      } else if (eff.includes("bronch") || primary.includes("bronch")) {
        bronchTrackRecords.push(processBronchLogEntry(record, dummyLog, bronchTrackRecords.length + 1));
      } else if (eff.includes("post_icu") || primary.includes("icu")) {
        postIcuTrackRecords.push(processPostIcuLogEntry(record, dummyLog, postIcuTrackRecords.length + 1));
      } else {
        ildTrackRecords.push(processIldLogEntry(record, dummyLog, ildTrackRecords.length + 1));
      }
    }
  });

  // 7. For Single Patient mode: Build multi-sheet detailed data & rich surveillance series
  let singlePatientLogs: DetailedLogRecord[] | undefined;
  let singlePatientAlerts: DetailedAlertRecord[] | undefined;
  let singlePatientMeds: DetailedMedicationRecord[] | undefined;
  let singlePatientPfts: DetailedPftRecord[] | undefined;
  let singlePatientUhid: string | undefined;
  let dynamicSymptomsSeries: import("./export.types").DynamicSymptomSeries[] | undefined;
  let prescribedMedsWithAdherence: import("./export.types").MedicationPrescribedAdherence[] | undefined;
  let multiPftsProgression: import("./export.types").MultiPftProgressionPoint[] | undefined;
  let adherenceStats: { totalDays: number; loggedDays: number; pct: string } | undefined;
  let rawDoctorInstructionsList: Array<{ instructionText: string; createdAt: string }> | undefined;

  if (normalizedScope === "single_patient" && patients.length === 1 && patients[0] && records[0]) {
    const pId = patients[0].id;
    singlePatientUhid = records[0].uhid;

    // Sheet 2: Logs
    const patLogs = [...(logsByPatient.get(pId) ?? [])].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    );

    singlePatientLogs = patLogs.map((log) => {
      const rawObj = log as Record<string, unknown>;
      const vasMap: Record<string, number> = {};
      if (typeof log.vas_symptoms === "object" && log.vas_symptoms) {
        for (const [k, v] of Object.entries(log.vas_symptoms)) {
          const num = Number(v);
          if (!isNaN(num)) vasMap[k] = num;
        }
      }

      const vasStr = Object.keys(vasMap).length > 0
        ? Object.entries(vasMap)
            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}/10`)
            .join(", ")
        : "None / Stable";

      const compMap: Record<string, boolean> = {};
      if (typeof log.medication_compliance === "object" && log.medication_compliance) {
        for (const [k, v] of Object.entries(log.medication_compliance)) {
          compMap[k] = Boolean(v);
        }
      }

      const compStr = Object.keys(compMap).length > 0
        ? Object.entries(compMap)
            .map(([k, v]) => `${k}: ${v ? "Taken" : "Missed"}`)
            .join(", ")
        : "—";

      return {
        date: formatDateDDMMYYYY(log.logged_at),
        spo2Rest: safeValue(log.spo2_rest),
        spo2Walk: safeValue(log.spo2_exertion),
        heartRate: safeValue(rawObj["heart_rate"] ?? (log as any).heart_rate),
        mmrc: safeValue(log.mmrc_today),
        aqi: safeValue(log.aqi_value),
        vasSymptoms: vasStr,
        vasMap,
        medicationCompliance: compStr,
        medicationComplianceMap: compMap,
        riskScore: safeValue(log.aqi_value),
        clinicalNotes: "Daily routine check-in recorded",
        diseaseSpecificData: (log.disease_specific_data as Record<string, unknown>) ?? {},
      };
    });

    // Calculate Adherence Stats
    let totalDaysSpan = 30;
    if (payload.start_date && payload.end_date) {
      const diffMs = new Date(payload.end_date).getTime() - new Date(payload.start_date).getTime();
      totalDaysSpan = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
    } else if (patLogs.length > 0) {
      const firstDate = new Date(patLogs[0]!.logged_at).getTime();
      const lastDate = new Date().getTime();
      totalDaysSpan = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1);
    }
    const loggedCount = patLogs.length;
    adherenceStats = {
      totalDays: totalDaysSpan,
      loggedDays: loggedCount,
      pct: `${Math.min(100, Math.round((loggedCount / Math.max(1, totalDaysSpan)) * 100))}%`,
    };

    // Calculate Dynamic Symptoms Series with Zero-Drop Rule
    const allSymptomKeys = new Set<string>();
    patLogs.forEach((l) => {
      if (typeof l.vas_symptoms === "object" && l.vas_symptoms) {
        Object.keys(l.vas_symptoms).forEach((k) => allSymptomKeys.add(k));
      }
    });

    dynamicSymptomsSeries = Array.from(allSymptomKeys)
      .map((key) => {
        const points = patLogs.map((l) => {
          const vMap = (l.vas_symptoms as Record<string, number | null | undefined>) ?? {};
          const rawVal = vMap[key];
          const val = rawVal !== undefined && rawVal !== null ? Number(rawVal) : 0;
          return {
            date: formatDateDDMMYYYY(l.logged_at),
            val: isNaN(val) ? 0 : val,
          };
        });

        const hasAnyPositive = points.some((p) => p.val > 0);
        const lastPoint = points.length > 0 ? points[points.length - 1]! : { val: 0 };
        const currentSeverity = lastPoint.val;
        const isResolved = currentSeverity === 0;

        return {
          symptomName: toTitleCase(key.replace(/_/g, " ")),
          points,
          currentSeverity,
          isResolved,
          hasAnyPositive,
        };
      })
      .filter((s) => s.hasAnyPositive)
      .map(({ hasAnyPositive, ...rest }) => rest);

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

    // Sheet 4: Medications & Per-Medication Adherence
    const patMeds = rawMeds.filter((m) => m.patient_id === pId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    singlePatientMeds = patMeds.map((m) => {
      const isActive = !m.end_date || new Date(m.end_date) >= today;
      return {
        drugName: m.drug_name,
        route: m.route || "Oral/Inhaled",
        dose: `${m.dose || ""} ${m.dose_unit || ""}`.trim() || "—",
        frequency: m.frequency || "—",
        startDate: formatDateDDMMYYYY(m.start_date),
        endDate: m.end_date ? formatDateDDMMYYYY(m.end_date) : "Ongoing",
        status: isActive ? "Active" : "Discontinued",
      };
    });

    prescribedMedsWithAdherence = patMeds.map((m) => {
      const isActive = !m.end_date || new Date(m.end_date) >= today;
      const startMs = m.start_date ? new Date(m.start_date).getTime() : 0;
      const endMs = m.end_date ? new Date(m.end_date).getTime() : today.getTime();
      const medDays = Math.max(1, Math.ceil(Math.abs(endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
      const daysPrescribed = Math.min(totalDaysSpan, medDays);

      let daysTaken = 0;
      patLogs.forEach((l) => {
        if (typeof l.medication_compliance === "object" && l.medication_compliance) {
          const comp = l.medication_compliance as Record<string, boolean>;
          if (comp[m.id] === true || comp[m.drug_name] === true) {
            daysTaken++;
          }
        }
      });

      const adhPct = `${Math.min(100, Math.round((daysTaken / Math.max(1, daysPrescribed)) * 100))}%`;

      return {
        drugName: m.drug_name,
        route: m.route || "Oral/Inhaled",
        dose: `${m.dose || ""} ${m.dose_unit || ""}`.trim() || "Standard",
        frequency: m.frequency || "OD",
        startDate: formatDateDDMMYYYY(m.start_date),
        endDate: m.end_date ? formatDateDDMMYYYY(m.end_date) : "Ongoing",
        status: (isActive ? "Active" : "Discontinued") as "Active" | "Discontinued",
        daysTaken,
        daysPrescribed,
        adherencePct: adhPct,
      };
    });

    // Sheet 5: PFT History (Zero raw JSON) & Multi-PFT Progression
    const patPfts = rawPfts
      .filter((p) => p.patient_id === pId)
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

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

    multiPftsProgression = patPfts.map((p) => {
      const other = (p.other_fields ?? {}) as Record<string, unknown>;
      return {
        testDate: formatDateDDMMYYYY(p.test_date),
        fev1: p.fev1 !== null ? Number(p.fev1) : null,
        fvc: p.fvc !== null ? Number(p.fvc) : null,
        fev1Pct: other["fev1_pct_pred"] !== undefined ? Number(other["fev1_pct_pred"]) : null,
        fvcPct: other["fvc_pct_pred"] !== undefined ? Number(other["fvc_pct_pred"]) : null,
        fev1FvcRatio: p.fev1_fvc_ratio !== null ? Number(p.fev1_fvc_ratio) : null,
        dlco: p.dlco !== null ? Number(p.dlco) : null,
        sixMwd: other["six_mwd"] !== undefined ? Number(other["six_mwd"]) : null,
        baselineSpo2: other["baseline_spo2"] !== undefined ? Number(other["baseline_spo2"]) : null,
        baselineHr: other["baseline_heart_rate"] !== undefined ? Number(other["baseline_heart_rate"]) : null,
      };
    });

    // Doctor Instructions
    const patInstructions = rawInstructions.filter((ins: any) => ins.patient_id === pId);
    rawDoctorInstructionsList = patInstructions.map((ins: any) => ({
      instructionText: ins.instruction_text,
      createdAt: formatDateDDMMYYYY(ins.created_at),
    }));
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
        heartRate: safeValue((log as any).heart_rate),
        mmrc: safeValue(log.mmrc_today),
        aqi: safeValue(log.aqi_value),
        vasSymptoms: vasStr,
        medicationCompliance: compStr,
        riskScore: safeValue((log as any).computed_risk_score),
        clinicalNotes: safeValue((log as any).clinical_notes),
        diseaseSpecificData: (log.disease_specific_data as Record<string, unknown>) ?? {},
      };
    });
  }

  // 7.5 Build Longitudinal Research Patient Export Set
  const longitudinalPatients: LongitudinalPatientData[] = sortedPatients.map((patient, idx) => {
    return transformPatientToLongitudinal(
      {
        patient,
        diagnosis: diagMap.get(patient.id),
        logs: logsByPatient.get(patient.id) ?? [],
        scores: scoresByPatient.get(patient.id) ?? [],
        alerts: alertsByPatient.get(patient.id) ?? [],
        medications: medsByPatient.get(patient.id) ?? [],
        pfts: pftsByPatient.get(patient.id) ?? [],
        respiratorySupport: respMap.get(patient.id),
        instructions: instructionsByPatient.get(patient.id) ?? [],
        appointments: appointmentsByPatient.get(patient.id) ?? [],
      },
      idx + 1,
      payload.start_date,
      payload.end_date,
    );
  });

  // 8. Compute Standardized File Name (Requirement 18 & 19)
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
    longitudinalPatients,
    ildTrackRecords,
    asthmaTrackRecords,
    copdTrackRecords,
    bronchTrackRecords,
    postIcuTrackRecords,
    singlePatientLogs,
    singlePatientAlerts,
    singlePatientMeds,
    singlePatientPfts,
    singlePatientUhid,
    rawDoctorInstructions: rawDoctorInstructionsList,
    prescribedMedsWithAdherence,
    dynamicSymptomsSeries,
    multiPftsProgression,
    adherenceStats,
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
    // excel default: O2Plus_Disease_Specific_Longitudinal_Research_Export.xlsx
    buffer = await renderExcelRegistry(bundle);
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (payload.start_date && payload.end_date) {
      filename = `O2Plus_Disease_Specific_Longitudinal_Research_Export_${payload.start_date}_to_${payload.end_date}.xlsx`;
    } else {
      filename = `O2Plus_Disease_Specific_Longitudinal_Research_Export.xlsx`;
    }
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
