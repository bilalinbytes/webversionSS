import type {
  PatientHomeData,
  EffectiveDashboardValue,
  DailyLog,
  RedFlagScore,
  PatientDiagnosis,
  PatientBaseline,
  PftRecord,
  Medication,
} from "@o2plus/types";
import { normalizeDashboard, formatDiagnosisDisplay } from "./diagnosis";

const FALLBACKS = {
  spo2Today: 94,
  mmrcToday: 1,
  aqiToday: 85,
  riskScore: 4,
  doctor: "Assigned doctor",
  doctorHospital: "",
};

export interface BuildPatientHomeDataParams {
  effectiveDashboardFallback: EffectiveDashboardValue | null;
  logs: Pick<DailyLog, "logged_at" | "spo2_rest" | "mmrc_today" | "aqi_value" | "vas_symptoms" | "disease_specific_data" | "medication_compliance">[];
  score: Pick<RedFlagScore, "global_score"> | null;
  doctor: { name?: string | null; hospital?: string | null } | null;
  diagnosis: Pick<PatientDiagnosis, "primary_diagnosis" | "effective_dashboard"> | null;
  baseline: Pick<PatientBaseline, "baseline_spo2"> | null;
  latestPft: Pick<PftRecord, "test_date" | "fev1_fvc_ratio" | "fev1" | "fvc" | "dlco"> | null;
  medications: Pick<Medication, "id" | "drug_name" | "dose" | "dose_unit" | "end_date">[];
}

/**
 * Transforms raw database rows into the PatientHomeData UI contract.
 * Pure function. Used by both web and mobile home screen hooks.
 */
export function buildPatientHomeData(params: BuildPatientHomeDataParams): PatientHomeData {
  const { effectiveDashboardFallback, logs: rawLogs, score, doctor, diagnosis, baseline, latestPft, medications } = params;

  const activeDashboard = normalizeDashboard(
    diagnosis?.primary_diagnosis,
    diagnosis?.effective_dashboard ?? effectiveDashboardFallback,
  );

  // filter and reverse logs so index 0 = oldest, index 13 = most recent (sparkline order)
  const logs = rawLogs
    .filter((log) => {
      if (!activeDashboard) return true;
      const diseaseData = log.disease_specific_data as Record<string, unknown> | null;
      return diseaseData?.["effective_dashboard"] === activeDashboard;
    })
    .slice()
    .reverse();

  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayLog = logs
    .filter((log) => {
      const loggedAt = log.logged_at ? new Date(log.logged_at) : null;
      return loggedAt !== null && loggedAt >= todayStart && loggedAt < todayEnd;
    })
    .at(-1) ?? null;

  const spo2Trend = logs.map(l => l.spo2_rest ?? FALLBACKS.spo2Today);
  const mmrcTrend = logs.map(l => l.mmrc_today ?? 0);
  const vasTrend = logs.map(l => {
    const vas = l.vas_symptoms as Record<string, number> | null;
    if (!vas) return 0;
    const vals = Object.values(vas).filter(v => typeof v === "number");
    return vals.length > 0 ? Math.max(...vals) : 0;
  });

  const diseaseSpecificTrend = logs.map(l => {
    const d = l.disease_specific_data as Record<string, unknown>;
    if (activeDashboard === "asthma") {
      return typeof d?.["rescue_inhaler_puffs"] === "number" ? d["rescue_inhaler_puffs"] : 0;
    }
    if (activeDashboard === "copd" || activeDashboard === "post_icu") {
      return typeof d?.["energy_level"] === "number" ? d["energy_level"] : 5;
    }
    if (activeDashboard === "ild") {
      return typeof d?.["kbild_score"] === "number" ? d["kbild_score"] : 0;
    }
    return 0;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compliance = (todayLog?.medication_compliance ?? {}) as Record<string, unknown>;
  const todayMedications = medications
    .filter((med) => {
      if (!med.end_date) return true;
      return new Date(med.end_date) >= today;
    })
    .map((med) => {
      const keys = [
        med.id,
        med.drug_name,
        med.drug_name.toLowerCase(),
        med.drug_name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      ];
      let taken: boolean | null = null;
      for (const k of keys) {
        const v = compliance[k];
        if (v === true) { taken = true; break; }
        if (v === false) { taken = false; break; }
      }
      const dose = med.dose !== null
        ? `${med.dose}${med.dose_unit ? ` ${med.dose_unit}` : ""}`
        : undefined;
      return { id: med.id, name: med.drug_name, dose, taken };
    });

  return {
    loading: false,
    spo2Today: todayLog?.spo2_rest ?? FALLBACKS.spo2Today,
    mmrcToday: todayLog?.mmrc_today ?? FALLBACKS.mmrcToday,
    aqiToday: todayLog?.aqi_value ?? FALLBACKS.aqiToday,
    riskScore: score?.global_score ?? FALLBACKS.riskScore,
    doctor: doctor?.name ?? FALLBACKS.doctor,
    doctorHospital: doctor?.hospital ?? FALLBACKS.doctorHospital,
    spo2Trend: spo2Trend.length > 0 ? spo2Trend : [],
    mmrcTrend: mmrcTrend.length > 0 ? mmrcTrend : [],
    vasTrend: vasTrend.length > 0 ? vasTrend : [],
    diseaseSpecificTrend: diseaseSpecificTrend.length > 0 ? diseaseSpecificTrend : [],
    lastLogDate: latestLog?.logged_at ?? null,
    hasTodayLog: todayLog !== null,
    diagnosis: diagnosis?.primary_diagnosis ? formatDiagnosisDisplay(diagnosis.primary_diagnosis) : null,
    effectiveDashboard: activeDashboard,
    baselineSpo2: baseline?.baseline_spo2 ?? null,
    baselineHeartRate: null,
    latestPft: latestPft
      ? {
          fev1_fvc_ratio: latestPft.fev1_fvc_ratio,
          fev1: latestPft.fev1,
          fvc: latestPft.fvc,
          dlco: latestPft.dlco,
          test_date: latestPft.test_date,
        }
      : null,
    todayMedications,
  };
}
