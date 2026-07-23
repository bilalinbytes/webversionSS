"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildPatientHomeData, normalizeDashboard } from "@o2plus/core";
import type { PatientHomeData } from "@o2plus/types";

const FALLBACKS = {
  spo2Today: 94,
  mmrcToday: 1,
  aqiToday: 85,
  riskScore: 4,
  doctor: "Assigned doctor",
  doctorHospital: "",
};

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
    todayMedications: [],
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

      const [logsRes, scoreRes, doctorPayload, diagnosisRes, baselineRes, pftRes, medRes] = await Promise.all([
        supabase
          .from("daily_logs")
          .select("logged_at, spo2_rest, mmrc_today, aqi_value, vas_symptoms, disease_specific_data, medication_compliance")
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
        supabase
          .from("medications")
          .select("id, drug_name, dose, dose_unit, end_date")
          .eq("patient_id", patientId)
          .order("start_date", { ascending: false }),
      ]);

      const doctorData = doctorPayload?.doctor as
        | { name?: string | null; hospital?: string | null }
        | null
        | undefined;

      const result = buildPatientHomeData({
        effectiveDashboardFallback: effectiveDashboard as any,
        logs: logsRes.data ?? [],
        score: scoreRes.data ?? null,
        doctor: doctorData ?? null,
        diagnosis: diagnosisRes.data ?? null,
        baseline: baselineRes.data ?? null,
        latestPft: pftRes.data ?? null,
        medications: medRes.data ?? [],
      });

      setData(result);
    })();
  }, [patientId, doctorId, effectiveDashboard, refreshKey]);

  return data;
}
