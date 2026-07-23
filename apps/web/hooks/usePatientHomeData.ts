"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getPatientDailyLogs,
  getPatientRedFlagScore,
  getPatientDiagnosis,
  getPatientBaseline,
  getLatestPftRecord,
  getPatientMedications,
} from "@o2plus/api-client/patient";
import { buildPatientHomeData } from "@o2plus/core";
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

      const apiConfig = { supabase };

      const [logsRes, scoreRes, doctorPayload, diagnosisRes, baselineRes, pftRes, medRes] = await Promise.all([
        getPatientDailyLogs(apiConfig, patientId, 14),
        getPatientRedFlagScore(apiConfig, patientId),
        doctorQuery,
        getPatientDiagnosis(apiConfig, patientId),
        getPatientBaseline(apiConfig, patientId),
        getLatestPftRecord(apiConfig, patientId),
        getPatientMedications(apiConfig, patientId),
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
