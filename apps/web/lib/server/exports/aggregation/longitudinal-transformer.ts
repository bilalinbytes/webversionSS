import type { Database } from "@/lib/database.types";
import {
  toTitleCase,
  formatDateDDMMYYYY,
  computeAgeFromDob,
  normalizeSex,
  formatCleanMobile,
} from "./clinical-metrics";
import { resolveCompleteDiagnosis, formatRespiratorySupport } from "./diagnosis-resolver";
import { calculateRiskCategory } from "./risk-level";
import { formatActiveMedications } from "./medication-adherence";

type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type DiagnosisRow = Database["public"]["Tables"]["patient_diagnoses"]["Row"];
type DailyLogRow = Database["public"]["Tables"]["daily_logs"]["Row"];
type RedFlagScoreRow = Database["public"]["Tables"]["red_flag_scores"]["Row"];
type DiseaseAlertRow = Database["public"]["Tables"]["disease_alerts"]["Row"];
type MedicationRow = Database["public"]["Tables"]["medications"]["Row"];
type PftRow = Database["public"]["Tables"]["pft_records"]["Row"];
type RespSupportRow = Database["public"]["Tables"]["respiratory_support"]["Row"];
type DoctorInstructionRow = Database["public"]["Tables"]["doctor_instructions"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

export interface PatientSourceBundle {
  patient: PatientRow;
  diagnosis?: DiagnosisRow | null;
  logs: DailyLogRow[];
  scores: RedFlagScoreRow[];
  alerts: DiseaseAlertRow[];
  medications: MedicationRow[];
  pfts: PftRow[];
  respiratorySupport?: RespSupportRow | null;
  instructions: DoctorInstructionRow[];
  appointments: AppointmentRow[];
  clinicalNotes?: Array<{ date: string; note: string }>;
}

export interface LongitudinalNumericMetrics {
  first: number | null;
  latest: number | null;
  change: number | null;
  historyString: string;
}

export interface LongitudinalCategoricalMetrics {
  latest: string | null;
  historyString: string;
}

export function formatIsoDate(dateVal: string | null | undefined): string {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal).split("T")[0]!;
    return d.toISOString().split("T")[0]!;
  } catch {
    return String(dateVal).split("T")[0]!;
  }
}

/**
 * Extracts first, latest, change and complete dated history for a numeric metric.
 * Formats history as YYYY-MM-DD=value | YYYY-MM-DD=value
 */
export function aggregateNumericSeries(
  entries: Array<{ date: string; value: number | null | undefined }>,
  unitSuffix = "",
): LongitudinalNumericMetrics {
  const valid = entries
    .filter((e): e is { date: string; value: number } => typeof e.value === "number" && !isNaN(e.value))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (valid.length === 0) {
    return { first: null, latest: null, change: null, historyString: "" };
  }

  const firstVal = valid[0]!.value;
  const latestVal = valid[valid.length - 1]!.value;
  const changeVal = valid.length >= 2 ? latestVal - firstVal : null;

  const historyString = valid
    .map((e) => `${e.date}=${e.value}${unitSuffix}`)
    .join(" | ");

  return {
    first: firstVal,
    latest: latestVal,
    change: changeVal,
    historyString,
  };
}

/**
 * Extracts latest and complete dated history for a categorical / boolean / text metric.
 */
export function aggregateCategoricalSeries(
  entries: Array<{ date: string; value: string | boolean | null | undefined }>,
): LongitudinalCategoricalMetrics {
  const valid = entries
    .filter((e): e is { date: string; value: string | boolean } => e.value !== null && e.value !== undefined && e.value !== "")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (valid.length === 0) {
    return { latest: null, historyString: "" };
  }

  const formatItem = (val: string | boolean): string => {
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val).trim();
  };

  const latestVal = formatItem(valid[valid.length - 1]!.value);
  const historyString = valid
    .map((e) => `${e.date}=${formatItem(e.value)}`)
    .join(" | ");

  return {
    latest: latestVal,
    historyString,
  };
}

export interface LongitudinalPatientData {
  patientId: string;
  uhid: string;
  name: string;
  primaryDiagnosis: string;
  effectiveDashboard: string;
  commonRow: Record<string, unknown>;
  asthmaRow?: Record<string, unknown>;
  copdRow?: Record<string, unknown>;
  ildRow?: Record<string, unknown>;
  bronchRow?: Record<string, unknown>;
  postIcuRow?: Record<string, unknown>;
}

export function transformPatientToLongitudinal(
  bundle: PatientSourceBundle,
  sno: number,
  filterStartDate?: string,
  filterEndDate?: string,
): LongitudinalPatientData {
  const {
    patient,
    diagnosis,
    logs,
    scores,
    alerts,
    medications,
    pfts,
    respiratorySupport,
    instructions,
    appointments,
    clinicalNotes = [],
  } = bundle;

  const patExt = patient as PatientRow & Record<string, unknown>;
  const diagDetails = resolveCompleteDiagnosis(diagnosis ?? undefined);
  const respSupport = formatRespiratorySupport(respiratorySupport ?? undefined);


  const uhid = `P-${patient.id.slice(0, 8).toUpperCase()}`;
  const enrollYear = patient.created_at ? new Date(patient.created_at).getFullYear() : new Date().getFullYear();
  const fileNo = `${String(sno).padStart(3, "0")}/${enrollYear}`;

  // Filter & sort logs chronologically
  let sortedLogs = [...logs].sort((a, b) => (a.logged_at || "").localeCompare(b.logged_at || ""));
  if (filterStartDate) {
    sortedLogs = sortedLogs.filter((l) => formatIsoDate(l.logged_at) >= filterStartDate);
  }
  if (filterEndDate) {
    sortedLogs = sortedLogs.filter((l) => formatIsoDate(l.logged_at) <= filterEndDate);
  }

  // Reporting period calculations
  const allEventDates: string[] = [];
  if (patient.created_at) allEventDates.push(formatIsoDate(patient.created_at));
  sortedLogs.forEach((l) => { if (l.logged_at) allEventDates.push(formatIsoDate(l.logged_at)); });
  pfts.forEach((p) => { if (p.test_date) allEventDates.push(formatIsoDate(p.test_date)); });
  allEventDates.sort();

  const reportingPeriodStart = filterStartDate ?? (allEventDates[0] || formatIsoDate(patient.created_at) || "");
  const reportingPeriodEnd = filterEndDate ?? (allEventDates[allEventDates.length - 1] || formatIsoDate(new Date().toISOString()) || "");

  let daysInPeriod = 1;
  if (reportingPeriodStart && reportingPeriodEnd) {
    const startMs = new Date(reportingPeriodStart).getTime();
    const endMs = new Date(reportingPeriodEnd).getTime();
    if (!isNaN(startMs) && !isNaN(endMs)) {
      daysInPeriod = Math.max(1, Math.ceil(Math.abs(endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  const distinctLogDates = Array.from(new Set(sortedLogs.map((l) => formatIsoDate(l.logged_at)).filter(Boolean))).sort();
  const daysLogged = distinctLogDates.length;
  const loggingAdherencePct = daysInPeriod > 0 ? Math.min(100, Math.round((daysLogged / daysInPeriod) * 100)) : null;
  const logDateHistory = distinctLogDates.join(" | ");

  // ── Longitudinal Dashboard Metrics ─────────────────────────────────────────

  // Resting SpO2
  const restingSpo2Series = aggregateNumericSeries(
    sortedLogs.map((l) => ({ date: formatIsoDate(l.logged_at), value: l.spo2_rest })),
    "%",
  );

  // Exertion SpO2
  const exertionSpo2Series = aggregateNumericSeries(
    sortedLogs.map((l) => ({ date: formatIsoDate(l.logged_at), value: l.spo2_exertion })),
    "%",
  );

  // Heart Rate
  const hrSeries = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const raw = l as Record<string, unknown>;
      const ds = (l.disease_specific_data ?? {}) as Record<string, unknown>;
      const vas = (l.vas_symptoms ?? {}) as Record<string, unknown>;
      const val = typeof raw["heart_rate"] === "number"
        ? raw["heart_rate"]
        : typeof ds["heart_rate"] === "number"
          ? ds["heart_rate"]
          : typeof vas["heart_rate"] === "number"
            ? vas["heart_rate"]
            : null;
      return { date: formatIsoDate(l.logged_at), value: val };
    }),
    "",
  );

  // mMRC
  const mmrcSeries = aggregateNumericSeries(
    sortedLogs.map((l) => ({ date: formatIsoDate(l.logged_at), value: l.mmrc_today })),
    "",
  );

  // Oxygen requirement
  const oxygenHistory = sortedLogs
    .map((l) => {
      const raw = l as Record<string, unknown>;
      const litres = l.oxygen_change_litres ?? raw["oxygen_litres"] ?? raw["baseline_oxygen_flow"];
      if (litres !== null && litres !== undefined && litres !== "") {
        return `${formatIsoDate(l.logged_at)}=${litres} L/min`;
      }
      return null;
    })
    .filter((s): s is string => Boolean(s))
    .join(" | ");

  // AQI
  const aqiSeries = aggregateNumericSeries(
    sortedLogs.map((l) => ({ date: formatIsoDate(l.logged_at), value: l.aqi_value })),
    "",
  );

  // VAS Symptoms History (YYYY-MM-DD=symptom:value/10)
  const vasHistory = sortedLogs
    .map((l) => {
      if (!l.vas_symptoms || typeof l.vas_symptoms !== "object") return null;
      const entries = Object.entries(l.vas_symptoms as Record<string, unknown>)
        .filter(([, val]) => typeof val === "number" || typeof val === "string")
        .map(([k, val]) => `${k.replace(/_/g, " ")}: ${val}/10`);
      if (entries.length === 0) return null;
      return `${formatIsoDate(l.logged_at)}=${entries.join(", ")}`;
    })
    .filter((s): s is string => Boolean(s))
    .join(" | ");

  // Side Effects History
  const sideEffectsHistory = sortedLogs
    .map((l) => {
      const raw = l as Record<string, unknown>;
      const se = raw["side_effects"];
      let text = "";
      if (Array.isArray(se) && se.length > 0) {
        text = se.map((x) => toTitleCase(String(x))).join(", ");
      } else if (typeof se === "string" && se.trim()) {
        text = se.trim();
      }
      if (text) return `${formatIsoDate(l.logged_at)}=${text}`;
      return null;
    })
    .filter((s): s is string => Boolean(s))
    .join(" | ");

  // Medication Adherence History (YYYY-MM-DD=taken/prescribed, %)
  const medAdherenceHistory = sortedLogs
    .map((l) => {
      if (!l.medication_compliance || typeof l.medication_compliance !== "object") return null;
      const entries = Object.entries(l.medication_compliance as Record<string, boolean>);
      if (entries.length === 0) return null;
      const taken = entries.filter(([, v]) => v === true).length;
      const total = entries.length;
      const pct = Math.round((taken / total) * 100);
      return `${formatIsoDate(l.logged_at)}=${taken}/${total} taken (${pct}%)`;
    })
    .filter((s): s is string => Boolean(s))
    .join(" | ");

  // Complete Patient Daily Log History (data-wrapped summary)
  const completeDailyLogHistory = sortedLogs
    .map((l) => {
      const date = formatIsoDate(l.logged_at);
      const parts: string[] = [];
      if (l.spo2_rest !== null && l.spo2_rest !== undefined) parts.push(`SpO2:${l.spo2_rest}%`);
      if (l.spo2_exertion !== null && l.spo2_exertion !== undefined) parts.push(`ExSpO2:${l.spo2_exertion}%`);
      const hr = (l as Record<string, unknown>)["heart_rate"];
      if (hr) parts.push(`HR:${hr}`);
      if (l.mmrc_today !== null && l.mmrc_today !== undefined) parts.push(`mMRC:${l.mmrc_today}`);
      if (l.aqi_value !== null && l.aqi_value !== undefined) parts.push(`AQI:${l.aqi_value}`);

      const ds = (l.disease_specific_data ?? {}) as Record<string, unknown>;
      if (ds["rescue_inhaler_puffs"]) parts.push(`Puffs:${ds["rescue_inhaler_puffs"]}`);
      if (ds["pefr_reading"] ?? ds["pefr_lpm"]) parts.push(`PEFR:${ds["pefr_reading"] ?? ds["pefr_lpm"]}`);
      if (ds["kbild_score"]) parts.push(`KBILD:${ds["kbild_score"]}`);
      if (ds["ease_of_clearance"] ?? ds["ease_of_sputum_clearance"]) parts.push(`Clearance:${ds["ease_of_clearance"] ?? ds["ease_of_sputum_clearance"]}/5`);
      if (ds["energy_level"]) parts.push(`Energy:${ds["energy_level"]}/10`);
      if (ds["chest_heaviness"]) parts.push(`Chest:${ds["chest_heaviness"]}/10`);

      return `[${date}] ${parts.join(", ")}`;
    })
    .join(" | ");

  // ── Doctor Dashboard Metrics ───────────────────────────────────────────────
  const sortedScores = [...scores].sort((a, b) => (b.computed_at || "").localeCompare(a.computed_at || ""));
  const latestScore = sortedScores[0];
  const latestRiskLevel = calculateRiskCategory(latestScore?.global_score ?? null);

  const sortedAlerts = [...alerts].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  const riskAlertHistory = sortedAlerts
    .map((a) => {
      const aExt = a as Record<string, unknown>;
      const status = a.acknowledged_by_doctor ? "Acknowledged" : "Active";
      const reason = a.reason_text || aExt["trigger_reason"] || a.alert_type || "Alert";
      return `${formatIsoDate(a.created_at)}=${status} / ${reason}`;
    })
    .join(" | ");

  const todayIso = new Date().toISOString().split("T")[0]!;
  const activeMedsList = medications.filter((m) => !m.end_date || formatIsoDate(m.end_date) >= todayIso);
  const stoppedMedsList = medications.filter((m) => m.end_date && formatIsoDate(m.end_date) < todayIso);

  const activePrescribedMeds = formatActiveMedications(activeMedsList);

  const medStartChangeHistory = medications
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))
    .map((m) => {
      const dose = `${m.dose || ""}${m.dose_unit || ""}`.trim();
      return `${formatIsoDate(m.start_date)}=${m.drug_name}, ${dose || "Standard"}, ${m.route || "Oral"}, ${m.frequency || "OD"}`;
    })
    .join(" | ");

  const stoppedMedHistory = stoppedMedsList
    .map((m) => {
      const dose = `${m.dose || ""}${m.dose_unit || ""}`.trim();
      return `${formatIsoDate(m.end_date)}=${m.drug_name}${dose ? ` (${dose})` : ""} / Discontinued`;
    })
    .join(" | ");

  // Per-medication adherence
  const perMedAdherence = medications
    .map((m) => {
      const startMs = m.start_date ? new Date(m.start_date).getTime() : 0;
      const endMs = m.end_date ? new Date(m.end_date).getTime() : new Date().getTime();
      const medDays = Math.max(1, Math.ceil(Math.abs(endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
      const daysPrescribed = Math.min(daysInPeriod, medDays);

      let daysTaken = 0;
      sortedLogs.forEach((l) => {
        if (l.medication_compliance && typeof l.medication_compliance === "object") {
          const comp = l.medication_compliance as Record<string, boolean>;
          if (comp[m.id] === true || comp[m.drug_name] === true) {
            daysTaken++;
          }
        }
      });
      const pct = Math.min(100, Math.round((daysTaken / Math.max(1, daysPrescribed)) * 100));
      return `${m.drug_name}: ${daysTaken}/${daysPrescribed} days (${pct}%)`;
    })
    .join("; ");

  const doctorInstructionsHistory = instructions
    .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
    .map((ins) => `${formatIsoDate(ins.created_at)}=${ins.instruction_text}`)
    .join(" | ");

  const clinicalNotesHistory = clinicalNotes
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((n) => `${formatIsoDate(n.date)}=${n.note}`)
    .join(" | ");

  const appointmentHistory = appointments
    .sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || ""))
    .map((apt) => `${formatIsoDate(apt.scheduled_at)}=${apt.status || "Scheduled"}, ${apt.title || "Consultation"}${apt.notes ? ` (${apt.notes})` : ""}`)
    .join(" | ");

  const pftHistory = pfts
    .sort((a, b) => (a.test_date || a.created_at || "").localeCompare(b.test_date || b.created_at || ""))
    .map((p) => {
      const other = (p.other_fields ?? {}) as Record<string, unknown>;
      const parts: string[] = [];
      if (p.fev1 !== null && p.fev1 !== undefined) parts.push(`FEV1: ${p.fev1}L`);
      if (p.fvc !== null && p.fvc !== undefined) parts.push(`FVC: ${p.fvc}L`);
      if (p.fev1_fvc_ratio !== null && p.fev1_fvc_ratio !== undefined) parts.push(`Ratio: ${p.fev1_fvc_ratio}%`);
      if (p.dlco !== null && p.dlco !== undefined) parts.push(`DLCO: ${p.dlco}%`);
      if (other["six_mwd"]) parts.push(`6MWD: ${other["six_mwd"]}m`);
      return `${formatIsoDate(p.test_date ?? p.created_at)}=${parts.join(", ")}`;
    })
    .join(" | ");

  // Baseline clinical values
  const latestPft = pfts.length > 0 ? pfts[pfts.length - 1] : null;
  const pftOther = (latestPft?.other_fields ?? {}) as Record<string, unknown>;

  const commonRow: Record<string, unknown> = {
    "S No.": sno,
    "File No.": fileNo,
    "UHID": uhid,
    "Patient Name": toTitleCase(patient.name),
    "Age": computeAgeFromDob(patient.date_of_birth),
    "Sex": normalizeSex(patient.gender),
    "Occupation": patExt["occupation"] || (pftOther["occupation"] as string) || null,
    "Significant Exposure": patExt["significant_exposure"] || (pftOther["significant_exposure"] as string) || (pftOther["significant_illness_exposure"] as string) || null,
    "Smoking Status": (patient as any).smoking_status || patExt["smoking_status"] || patExt["smoking"] || null,
    "Smoking Index": (patient as any).smoking_index || patExt["smoking_index"] || null,
    "Alcohol Status": (patient as any).alcohol_status || patExt["alcohol_status"] || patExt["alcohol"] || null,
    "Past Medical History": (() => {
      const hist = (patient as any).past_history || patExt["past_history"] || null;
      const yrs = (patient as any).past_history_years_ago || patExt["past_history_years_ago"] || null;
      if (!hist) return null;
      return yrs ? `${hist} (${yrs} yrs ago)` : hist;
    })(),
    "Mobile No.": formatCleanMobile(patient.mobile_number),


    "Date of Enrollment": formatIsoDate(patient.created_at),
    "Primary Diagnosis": diagnosis?.primary_diagnosis || diagDetails.completeDiag || "Respiratory Condition",
    "Disease Subtype": diagDetails.completeDiag || null,
    "Co-morbidities": diagDetails.comorbidities || null,
    "Baseline SpO2 (%)": patExt["baseline_spo2"] ?? pftOther["baseline_spo2"] ?? null,
    "Baseline HR (BPM)": patExt["baseline_heart_rate"] ?? pftOther["baseline_heart_rate"] ?? null,
    "Baseline 6MWD (m)": pftOther["six_mwd"] ?? patExt["six_mwd"] ?? null,
    "Baseline FEV1 (L)": latestPft?.fev1 ?? null,
    "Baseline FVC (L)": latestPft?.fvc ?? null,
    "Baseline FEV1/FVC (%)": latestPft?.fev1_fvc_ratio ?? null,
    "Baseline DLCO (%)": latestPft?.dlco ?? null,
    "Respiratory Support": respSupport || null,

    "Reporting period start": reportingPeriodStart || null,
    "Reporting period end": reportingPeriodEnd || null,
    "Days in period": daysInPeriod,
    "Days logged in app": daysLogged,
    "Logging adherence (%)": loggingAdherencePct,
    "Log date history (YYYY-MM-DD)": logDateHistory || null,

    "Resting SpO2 — first (%)": restingSpo2Series.first,
    "Resting SpO2 — latest (%)": restingSpo2Series.latest,
    "Resting SpO2 — change (%)": restingSpo2Series.change,
    "Resting SpO2 — dated history (YYYY-MM-DD=value)": restingSpo2Series.historyString || null,

    "Exertion SpO2 — first (%)": exertionSpo2Series.first,
    "Exertion SpO2 — latest (%)": exertionSpo2Series.latest,
    "Exertion SpO2 — change (%)": exertionSpo2Series.change,
    "Exertion SpO2 — dated history (YYYY-MM-DD=value)": exertionSpo2Series.historyString || null,

    "Heart rate — first (bpm)": hrSeries.first,
    "Heart rate — latest (bpm)": hrSeries.latest,
    "Heart rate — change (bpm)": hrSeries.change,
    "Heart rate — dated history (YYYY-MM-DD=value)": hrSeries.historyString || null,

    "mMRC — first": mmrcSeries.first,
    "mMRC — latest": mmrcSeries.latest,
    "mMRC — change": mmrcSeries.change,
    "mMRC — dated history (YYYY-MM-DD=value)": mmrcSeries.historyString || null,

    "Oxygen requirement — dated history (YYYY-MM-DD=L/min)": oxygenHistory || null,

    "AQI — first": aqiSeries.first,
    "AQI — latest": aqiSeries.latest,
    "AQI — change": aqiSeries.change,
    "AQI — dated history (YYYY-MM-DD=value)": aqiSeries.historyString || null,

    "VAS symptoms — dated history (YYYY-MM-DD=symptom:value/10)": vasHistory || null,
    "Side effects — dated history (YYYY-MM-DD=effects)": sideEffectsHistory || null,
    "Medication adherence — dated history (YYYY-MM-DD=taken/prescribed, %)": medAdherenceHistory || null,
    "Complete patient daily-log history (date-stamped)": completeDailyLogHistory || null,

    "Risk level — latest": latestRiskLevel,
    "Risk / alert — dated history (YYYY-MM-DD=status / reason)": riskAlertHistory || null,
    "Active prescribed medications": activePrescribedMeds || null,
    "Medication start / change history (YYYY-MM-DD=medicine, dose, route, frequency)": medStartChangeHistory || null,
    "Stopped medication history (YYYY-MM-DD=medicine / reason)": stoppedMedHistory || null,
    "Per-medication adherence history (medicine: days taken / days prescribed, %)": perMedAdherence || null,
    "Doctor instructions — dated history (YYYY-MM-DD=instruction)": doctorInstructionsHistory || null,
    "Clinical notes — dated history (YYYY-MM-DD=note)": clinicalNotesHistory || null,
    "Appointment history (YYYY-MM-DD=status, type, notes)": appointmentHistory || null,
    "PFT history (YYYY-MM-DD=FEV1, FVC, ratio, DLCO, 6MWD)": pftHistory || null,
  };

  // ── Helper to extract disease-specific data map ────────────────────────────
  const getDsMap = (l: DailyLogRow): Record<string, unknown> => {
    const raw = l as Record<string, unknown>;
    const ds = (l.disease_specific_data ?? {}) as Record<string, unknown>;
    return { ...raw, ...ds };
  };

  // ── 1. Asthma Disease Row ──────────────────────────────────────────────────
  const rescuePuffs = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["rescue_inhaler_puffs"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const pefrReading = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["pefr_reading"] ?? d["pefr_lpm"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const nightWaking = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["night_waking"] as boolean };
    }),
  );

  const controllerTaken = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["controller_taken"] as boolean };
    }),
  );

  const pefrBest = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["pefr_personal_best"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val ? Number(val) : null };
    }),
    "",
  );

  const asthmaControlResponses = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const r = d["asthma_control_responses"];
      if (Array.isArray(r) && r.length > 0) {
        return { date: formatIsoDate(l.logged_at), value: r.map((b, i) => `Q${i + 1}:${b ? "Yes" : "No"}`).join(", ") };
      }
      return { date: formatIsoDate(l.logged_at), value: null };
    }),
  );

  const asthmaControlYesCount = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["asthma_control_yes_count"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null ? Number(val) : null };
    }),
    "",
  );

  const asthmaControlStatus = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["asthma_control_status"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val).replace(/_/g, " ")) : null };
    }),
  );

  const asthmaRow: Record<string, unknown> = {
    ...commonRow,
    "Rescue inhaler puffs [mobile] — first (puffs)": rescuePuffs.first,
    "Rescue inhaler puffs [mobile] — latest (puffs)": rescuePuffs.latest,
    "Rescue inhaler puffs [mobile] — change (puffs)": rescuePuffs.change,
    "Rescue inhaler puffs [mobile] — dated history (YYYY-MM-DD=value)": rescuePuffs.historyString || null,

    "PEFR reading [mobile] — first (L/min)": pefrReading.first,
    "PEFR reading [mobile] — latest (L/min)": pefrReading.latest,
    "PEFR reading [mobile] — change (L/min)": pefrReading.change,
    "PEFR reading [mobile] — dated history (YYYY-MM-DD=value)": pefrReading.historyString || null,

    "Night waking due to asthma [mobile] — latest": nightWaking.latest,
    "Night waking due to asthma [mobile] — dated history (YYYY-MM-DD=value)": nightWaking.historyString || null,

    "Controller inhaler taken [mobile] — latest": controllerTaken.latest,
    "Controller inhaler taken [mobile] — dated history (YYYY-MM-DD=value)": controllerTaken.historyString || null,

    "PEFR personal best [schema, when recorded] — first (L/min)": pefrBest.first,
    "PEFR personal best [schema, when recorded] — latest (L/min)": pefrBest.latest,
    "PEFR personal best [schema, when recorded] — change (L/min)": pefrBest.change,
    "PEFR personal best [schema, when recorded] — dated history (YYYY-MM-DD=value)": pefrBest.historyString || null,

    "Asthma control Q1–Q4 responses [schema, when recorded] — latest": asthmaControlResponses.latest,
    "Asthma control Q1–Q4 responses [schema, when recorded] — dated history (YYYY-MM-DD=value)": asthmaControlResponses.historyString || null,

    "Asthma control yes-count [schema, when recorded] — first": asthmaControlYesCount.first,
    "Asthma control yes-count [schema, when recorded] — latest": asthmaControlYesCount.latest,
    "Asthma control yes-count [schema, when recorded] — change": asthmaControlYesCount.change,
    "Asthma control yes-count [schema, when recorded] — dated history (YYYY-MM-DD=value)": asthmaControlYesCount.historyString || null,

    "Asthma control status [schema, when recorded] — latest": asthmaControlStatus.latest,
    "Asthma control status [schema, when recorded] — dated history (YYYY-MM-DD=value)": asthmaControlStatus.historyString || null,
  };

  // ── 2. COPD Disease Row ────────────────────────────────────────────────────
  const copdEnergy = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["energy_level"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const copdChest = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["chest_heaviness"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const copdSputumCol = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["sputum_colour"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val)) : null };
    }),
  );

  const copdSputumVol = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["sputum_volume"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val)) : null };
    }),
  );

  const copdSleep = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["sleep_disturbed"] as boolean };
    }),
  );

  const copdExerciseTolerance = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["exercise_tolerance"] as boolean };
    }),
  );

  const copdWheezing = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["wheezing"] as boolean };
    }),
  );

  const copdStepCount = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = l.step_count_today ?? d["step_count_today"] ?? d["step_count"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val ? Number(val) : null };
    }),
    "",
  );

  const copdExerciseGood = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["exercise_tolerance_good"] as boolean };
    }),
  );

  const copdCoughFreq = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["cough_frequency"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const copdHaemoptysisVol = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["haemoptysis_volume"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val)) : null };
    }),
  );

  const copdRow: Record<string, unknown> = {
    ...commonRow,
    "Energy level [mobile] — first (0–10)": copdEnergy.first,
    "Energy level [mobile] — latest (0–10)": copdEnergy.latest,
    "Energy level [mobile] — change (0–10)": copdEnergy.change,
    "Energy level [mobile] — dated history (YYYY-MM-DD=value)": copdEnergy.historyString || null,

    "Chest heaviness [mobile] — first (0–10)": copdChest.first,
    "Chest heaviness [mobile] — latest (0–10)": copdChest.latest,
    "Chest heaviness [mobile] — change (0–10)": copdChest.change,
    "Chest heaviness [mobile] — dated history (YYYY-MM-DD=value)": copdChest.historyString || null,

    "Sputum colour [mobile] — latest": copdSputumCol.latest,
    "Sputum colour [mobile] — dated history (YYYY-MM-DD=value)": copdSputumCol.historyString || null,

    "Sputum volume [mobile] — latest": copdSputumVol.latest,
    "Sputum volume [mobile] — dated history (YYYY-MM-DD=value)": copdSputumVol.historyString || null,

    "Sleep disturbed [mobile] — latest": copdSleep.latest,
    "Sleep disturbed [mobile] — dated history (YYYY-MM-DD=value)": copdSleep.historyString || null,

    "Decreased exercise tolerance [mobile] — latest": copdExerciseTolerance.latest,
    "Decreased exercise tolerance [mobile] — dated history (YYYY-MM-DD=value)": copdExerciseTolerance.historyString || null,

    "Wheezing [mobile] — latest": copdWheezing.latest,
    "Wheezing [mobile] — dated history (YYYY-MM-DD=value)": copdWheezing.historyString || null,

    "Step count [schema, when recorded] — first (steps)": copdStepCount.first,
    "Step count [schema, when recorded] — latest (steps)": copdStepCount.latest,
    "Step count [schema, when recorded] — change (steps)": copdStepCount.change,
    "Step count [schema, when recorded] — dated history (YYYY-MM-DD=value)": copdStepCount.historyString || null,

    "Exercise tolerance good [schema, when recorded] — latest": copdExerciseGood.latest,
    "Exercise tolerance good [schema, when recorded] — dated history (YYYY-MM-DD=value)": copdExerciseGood.historyString || null,

    "Cough frequency [schema, when recorded] — first (0–4)": copdCoughFreq.first,
    "Cough frequency [schema, when recorded] — latest (0–4)": copdCoughFreq.latest,
    "Cough frequency [schema, when recorded] — change (0–4)": copdCoughFreq.change,
    "Cough frequency [schema, when recorded] — dated history (YYYY-MM-DD=value)": copdCoughFreq.historyString || null,

    "Haemoptysis volume [schema, when recorded] — latest": copdHaemoptysisVol.latest,
    "Haemoptysis volume [schema, when recorded] — dated history (YYYY-MM-DD=value)": copdHaemoptysisVol.historyString || null,
  };

  // ── 3. ILD Disease Row ─────────────────────────────────────────────────────
  const ildKbildScore = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["kbild_score"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const ildAntifibrotic = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["antifibrotic_taken"] as boolean };
    }),
  );

  const ildRash = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["rash"] as boolean };
    }),
  );

  const ildDiarrhoea = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["diarrhoea"] as boolean };
    }),
  );

  const ildKbildResponses = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const r = d["kbild_responses"];
      if (r && typeof r === "object") {
        const pairs = Object.entries(r as Record<string, unknown>).map(([k, v]) => `${k}:${v}`);
        if (pairs.length > 0) return { date: formatIsoDate(l.logged_at), value: pairs.join(", ") };
      }
      return { date: formatIsoDate(l.logged_at), value: null };
    }),
  );

  const ildKbildAnswered = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["kbild_answered_count"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val ? Number(val) : null };
    }),
    "",
  );

  const ildKbildPrev = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["kbild_previous"] ?? d["kbild_previous_score"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val ? Number(val) : null };
    }),
    "",
  );

  const ildRow: Record<string, unknown> = {
    ...commonRow,
    "K-BILD score [mobile] — first (0–100)": ildKbildScore.first,
    "K-BILD score [mobile] — latest (0–100)": ildKbildScore.latest,
    "K-BILD score [mobile] — change (0–100)": ildKbildScore.change,
    "K-BILD score [mobile] — dated history (YYYY-MM-DD=value)": ildKbildScore.historyString || null,

    "Antifibrotic medication taken [mobile] — latest": ildAntifibrotic.latest,
    "Antifibrotic medication taken [mobile] — dated history (YYYY-MM-DD=value)": ildAntifibrotic.historyString || null,

    "Rash [mobile] — latest": ildRash.latest,
    "Rash [mobile] — dated history (YYYY-MM-DD=value)": ildRash.historyString || null,

    "Diarrhoea [mobile] — latest": ildDiarrhoea.latest,
    "Diarrhoea [mobile] — dated history (YYYY-MM-DD=value)": ildDiarrhoea.historyString || null,

    "K-BILD Q1–Q15 responses [schema, when recorded] — latest": ildKbildResponses.latest,
    "K-BILD Q1–Q15 responses [schema, when recorded] — dated history (YYYY-MM-DD=value)": ildKbildResponses.historyString || null,

    "K-BILD answered count [schema, when recorded] — first": ildKbildAnswered.first,
    "K-BILD answered count [schema, when recorded] — latest": ildKbildAnswered.latest,
    "K-BILD answered count [schema, when recorded] — change": ildKbildAnswered.change,
    "K-BILD answered count [schema, when recorded] — dated history (YYYY-MM-DD=value)": ildKbildAnswered.historyString || null,

    "K-BILD previous score [schema, when recorded] — first (0–100)": ildKbildPrev.first,
    "K-BILD previous score [schema, when recorded] — latest (0–100)": ildKbildPrev.latest,
    "K-BILD previous score [schema, when recorded] — change (0–100)": ildKbildPrev.change,
    "K-BILD previous score [schema, when recorded] — dated history (YYYY-MM-DD=value)": ildKbildPrev.historyString || null,
  };

  // ── 4. Bronchiectasis Disease Row ──────────────────────────────────────────
  const bronchClearance = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["ease_of_clearance"] ?? d["ease_of_sputum_clearance"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const bronchSputumCol = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["sputum_colour"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val)) : null };
    }),
  );

  const bronchSputumVol = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["sputum_volume"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val)) : null };
    }),
  );

  const bronchFeverish = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["feverish_or_temp_gt_102"] as boolean };
    }),
  );

  const bronchMalaise = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["malaise"] as boolean };
    }),
  );

  const bronchPedalEdema = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: (l.pedal_edema ?? d["pedal_edema"] ?? d["pedal_oedema"]) as boolean };
    }),
  );

  const bronchWheezing = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["wheezing"] as boolean };
    }),
  );

  const bronchTemperature = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["recorded_temperature_f"] ?? d["temperature_f"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val ? Number(val) : null };
    }),
    "°F",
  );

  const bronchHaemoptysisVol = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["haemoptysis_volume"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val)) : null };
    }),
  );

  const bronchRow: Record<string, unknown> = {
    ...commonRow,
    "Ease of sputum clearance [mobile] — first (1–5)": bronchClearance.first,
    "Ease of sputum clearance [mobile] — latest (1–5)": bronchClearance.latest,
    "Ease of sputum clearance [mobile] — change (1–5)": bronchClearance.change,
    "Ease of sputum clearance [mobile] — dated history (YYYY-MM-DD=value)": bronchClearance.historyString || null,

    "Sputum colour [mobile] — latest": bronchSputumCol.latest,
    "Sputum colour [mobile] — dated history (YYYY-MM-DD=value)": bronchSputumCol.historyString || null,

    "Sputum volume [mobile] — latest": bronchSputumVol.latest,
    "Sputum volume [mobile] — dated history (YYYY-MM-DD=value)": bronchSputumVol.historyString || null,

    "Feverish above 102°F [mobile] — latest": bronchFeverish.latest,
    "Feverish above 102°F [mobile] — dated history (YYYY-MM-DD=value)": bronchFeverish.historyString || null,

    "Malaise / fatigue [mobile] — latest": bronchMalaise.latest,
    "Malaise / fatigue [mobile] — dated history (YYYY-MM-DD=value)": bronchMalaise.historyString || null,

    "Pedal edema [mobile] — latest": bronchPedalEdema.latest,
    "Pedal edema [mobile] — dated history (YYYY-MM-DD=value)": bronchPedalEdema.historyString || null,

    "Wheezing [mobile] — latest": bronchWheezing.latest,
    "Wheezing [mobile] — dated history (YYYY-MM-DD=value)": bronchWheezing.historyString || null,

    "Recorded temperature [schema, when recorded] — first (°F)": bronchTemperature.first,
    "Recorded temperature [schema, when recorded] — latest (°F)": bronchTemperature.latest,
    "Recorded temperature [schema, when recorded] — change (°F)": bronchTemperature.change,
    "Recorded temperature [schema, when recorded] — dated history (YYYY-MM-DD=value)": bronchTemperature.historyString || null,

    "Haemoptysis volume [schema, when recorded] — latest": bronchHaemoptysisVol.latest,
    "Haemoptysis volume [schema, when recorded] — dated history (YYYY-MM-DD=value)": bronchHaemoptysisVol.historyString || null,
  };

  // ── 5. Post ICU Disease Row ────────────────────────────────────────────────
  const postIcuEnergy = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["energy_level"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const postIcuSleep = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["sleep_quality"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const postIcuAnxiety = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["anxiety"] ?? d["anxiety_level"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const postIcuFeverish = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["feverish_or_temp_gt_102"] as boolean };
    }),
  );

  const postIcuConfusion = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["confusion"] as boolean };
    }),
  );

  const postIcuSputumCol = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["sputum_colour"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val)) : null };
    }),
  );

  const postIcuSputumVol = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["sputum_volume"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val)) : null };
    }),
  );

  const postIcuClearance = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["ease_of_clearance"] ?? d["ease_of_sputum_clearance"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val !== undefined && val !== null && val !== "" ? Number(val) : null };
    }),
    "",
  );

  const postIcuTemperature = aggregateNumericSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["recorded_temperature_f"] ?? d["temperature_f"];
      return { date: formatIsoDate(l.logged_at), value: typeof val === "number" ? val : val ? Number(val) : null };
    }),
    "°F",
  );

  const postIcuMalaise = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      return { date: formatIsoDate(l.logged_at), value: d["malaise"] as boolean };
    }),
  );

  const postIcuHaemoptysisVol = aggregateCategoricalSeries(
    sortedLogs.map((l) => {
      const d = getDsMap(l);
      const val = d["haemoptysis_volume"];
      return { date: formatIsoDate(l.logged_at), value: val ? toTitleCase(String(val)) : null };
    }),
  );

  const postIcuRow: Record<string, unknown> = {
    ...commonRow,
    "Energy level [mobile] — first (0–10)": postIcuEnergy.first,
    "Energy level [mobile] — latest (0–10)": postIcuEnergy.latest,
    "Energy level [mobile] — change (0–10)": postIcuEnergy.change,
    "Energy level [mobile] — dated history (YYYY-MM-DD=value)": postIcuEnergy.historyString || null,

    "Sleep quality [mobile] — first (0–10)": postIcuSleep.first,
    "Sleep quality [mobile] — latest (0–10)": postIcuSleep.latest,
    "Sleep quality [mobile] — change (0–10)": postIcuSleep.change,
    "Sleep quality [mobile] — dated history (YYYY-MM-DD=value)": postIcuSleep.historyString || null,

    "Anxiety level [mobile] — first (0–10)": postIcuAnxiety.first,
    "Anxiety level [mobile] — latest (0–10)": postIcuAnxiety.latest,
    "Anxiety level [mobile] — change (0–10)": postIcuAnxiety.change,
    "Anxiety level [mobile] — dated history (YYYY-MM-DD=value)": postIcuAnxiety.historyString || null,

    "Feverish above 102°F [mobile] — latest": postIcuFeverish.latest,
    "Feverish above 102°F [mobile] — dated history (YYYY-MM-DD=value)": postIcuFeverish.historyString || null,

    "Confusion [mobile] — latest": postIcuConfusion.latest,
    "Confusion [mobile] — dated history (YYYY-MM-DD=value)": postIcuConfusion.historyString || null,

    "Sputum colour [schema, when recorded] — latest": postIcuSputumCol.latest,
    "Sputum colour [schema, when recorded] — dated history (YYYY-MM-DD=value)": postIcuSputumCol.historyString || null,

    "Sputum volume [schema, when recorded] — latest": postIcuSputumVol.latest,
    "Sputum volume [schema, when recorded] — dated history (YYYY-MM-DD=value)": postIcuSputumVol.historyString || null,

    "Ease of sputum clearance [schema, when recorded] — first (1–5)": postIcuClearance.first,
    "Ease of sputum clearance [schema, when recorded] — latest (1–5)": postIcuClearance.latest,
    "Ease of sputum clearance [schema, when recorded] — change (1–5)": postIcuClearance.change,
    "Ease of sputum clearance [schema, when recorded] — dated history (YYYY-MM-DD=value)": postIcuClearance.historyString || null,

    "Recorded temperature [schema, when recorded] — first (°F)": postIcuTemperature.first,
    "Recorded temperature [schema, when recorded] — latest (°F)": postIcuTemperature.latest,
    "Recorded temperature [schema, when recorded] — change (°F)": postIcuTemperature.change,
    "Recorded temperature [schema, when recorded] — dated history (YYYY-MM-DD=value)": postIcuTemperature.historyString || null,

    "Malaise [schema, when recorded] — latest": postIcuMalaise.latest,
    "Malaise [schema, when recorded] — dated history (YYYY-MM-DD=value)": postIcuMalaise.historyString || null,

    "Haemoptysis volume [schema, when recorded] — latest": postIcuHaemoptysisVol.latest,
    "Haemoptysis volume [schema, when recorded] — dated history (YYYY-MM-DD=value)": postIcuHaemoptysisVol.historyString || null,
  };

  return {
    patientId: patient.id,
    uhid,
    name: patient.name,
    primaryDiagnosis: diagnosis?.primary_diagnosis || "Respiratory Condition",
    effectiveDashboard: diagnosis?.effective_dashboard || "ild",
    commonRow,
    asthmaRow,
    copdRow,
    ildRow,
    bronchRow,
    postIcuRow,
  };
}
