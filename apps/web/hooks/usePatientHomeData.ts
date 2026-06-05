"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PatientHomeData {
  loading: boolean;
  spo2Today: number;
  mmrcToday: number;
  aqiToday: number;
  riskScore: number;
  doctor: string;
  doctorHospital: string;
  spo2Trend: number[];
  mmrcTrend: number[];
  vasTrend: number[];
  diseaseSpecificTrend: number[];
  lastLogDate: string | null;
  hasTodayLog: boolean;
  diagnosis: string | null;
  effectiveDashboard: "asthma" | "copd" | "bronchiectasis" | "ild" | "post_icu" | null;
  baselineSpo2: number | null;
  baselineHeartRate: number | null;
  latestPft: {
    fev1_fvc_ratio: number | null;
    fev1: number | null;
    fvc: number | null;
    dlco: number | null;
    test_date: string | null;
  } | null;
}

const FALLBACKS = {
  spo2Today: 94,
  mmrcToday: 1,
  aqiToday: 85,
  riskScore: 4,
  doctor: "Assigned doctor",
  doctorHospital: "",
};

function normalizeDashboard(
  primaryDiagnosis: string | null | undefined,
  storedDashboard: string | null | undefined,
): PatientHomeData["effectiveDashboard"] {
  const primary = (primaryDiagnosis ?? "").toLowerCase();
  const stored = (storedDashboard ?? "").toLowerCase();

  if (primary.includes("asthma") && !primary.includes("copd")) return "asthma";
  if (primary.includes("copd")) return "copd";
  if (primary.includes("bronch")) return "bronchiectasis";
  if (primary.includes("ild") || primary.includes("interstitial")) return "ild";
  if (primary.includes("post_icu") || primary.includes("post icu")) return "post_icu";

  if (["asthma", "copd", "bronchiectasis", "ild", "post_icu"].includes(stored)) {
    return stored as PatientHomeData["effectiveDashboard"];
  }
  return null;
}

export function usePatientHomeData(
  patientId: string | null,
  doctorId: string | null,
  effectiveDashboard: string | null,
  refreshKey = 0,
): PatientHomeData {
  const [data, setData] = useState<PatientHomeData>({
    loading: true,
    ...FALLBACKS,
    spo2Trend: [],
    mmrcTrend: [],
    vasTrend: [],
    diseaseSpecificTrend: [],
    lastLogDate: null,
    hasTodayLog: false,
    diagnosis: null,
    effectiveDashboard: null,
    baselineSpo2: null,
    baselineHeartRate: null,
    latestPft: null,
  });

  useEffect(() => {
    if (!patientId) return;

    (async () => {
      const supabase = createClient();
      const doctorQuery = doctorId
        ? fetch("/api/patient-doctor")
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null)
        : Promise.resolve(null);

      const [logsRes, scoreRes, doctorPayload, diagnosisRes, baselineRes, pftRes] = await Promise.all([
        supabase
          .from("daily_logs")
          .select("logged_at, spo2_rest, mmrc_today, aqi_value, vas_symptoms, disease_specific_data")
          .eq("patient_id", patientId)
          .order("logged_at", { ascending: false })
          .limit(14),
        supabase
          .from("red_flag_scores")
          .select("global_score")
          .eq("patient_id", patientId)
          .order("computed_at", { ascending: false })
          .limit(1)
          .single(),
        doctorQuery,
        supabase
          .from("patient_diagnoses")
          .select("primary_diagnosis, effective_dashboard")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("patient_baselines")
          .select("baseline_spo2")
          .eq("patient_id", patientId)
          .maybeSingle(),
        supabase
          .from("pft_records")
          .select("test_date, fev1_fvc_ratio, fev1, fvc, dlco")
          .eq("patient_id", patientId)
          .order("test_date", { ascending: false })
          .limit(1)
          .single(),
      ]);

      const doctor = doctorPayload?.doctor as
        | { name?: string | null; hospital?: string | null }
        | null
        | undefined;
      const activeDashboard = normalizeDashboard(
        diagnosisRes.data?.primary_diagnosis,
        diagnosisRes.data?.effective_dashboard ?? effectiveDashboard,
      );

      // reverse so index 0 = oldest, index 13 = most recent (sparkline order)
      const logs = (logsRes.data ?? [])
        .filter((log) => {
          if (!activeDashboard) return true;
          const diseaseData = log.disease_specific_data as Record<string, unknown> | null;
          return diseaseData?.effective_dashboard === activeDashboard;
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
          return typeof d?.rescue_inhaler_puffs === "number" ? d.rescue_inhaler_puffs : 0;
        }
        if (activeDashboard === "copd" || activeDashboard === "post_icu") {
          return typeof d?.energy_level === "number" ? d.energy_level : 5;
        }
        if (activeDashboard === "ild") {
          return typeof d?.kbild_score === "number" ? d.kbild_score : 0;
        }
        return 0;
      });

      setData({
        loading: false,
        spo2Today: todayLog?.spo2_rest ?? FALLBACKS.spo2Today,
        mmrcToday: todayLog?.mmrc_today ?? FALLBACKS.mmrcToday,
        aqiToday: todayLog?.aqi_value ?? FALLBACKS.aqiToday,
        riskScore: scoreRes.data?.global_score ?? FALLBACKS.riskScore,
        doctor: doctor?.name ?? FALLBACKS.doctor,
        doctorHospital: doctor?.hospital ?? FALLBACKS.doctorHospital,
        spo2Trend: spo2Trend.length > 0 ? spo2Trend : [],
        mmrcTrend: mmrcTrend.length > 0 ? mmrcTrend : [],
        vasTrend: vasTrend.length > 0 ? vasTrend : [],
        diseaseSpecificTrend: diseaseSpecificTrend.length > 0 ? diseaseSpecificTrend : [],
        lastLogDate: latestLog?.logged_at ?? null,
        hasTodayLog: todayLog !== null,
        diagnosis: diagnosisRes.data?.primary_diagnosis ?? null,
        effectiveDashboard: activeDashboard,
        baselineSpo2: baselineRes.data?.baseline_spo2 ?? null,
        baselineHeartRate: null,
        latestPft: pftRes.data
          ? {
              fev1_fvc_ratio: pftRes.data.fev1_fvc_ratio,
              fev1: pftRes.data.fev1,
              fvc: pftRes.data.fvc,
              dlco: pftRes.data.dlco,
              test_date: pftRes.data.test_date,
            }
          : null,
      });
    })();
  }, [patientId, doctorId, effectiveDashboard, refreshKey]);

  return data;
}
