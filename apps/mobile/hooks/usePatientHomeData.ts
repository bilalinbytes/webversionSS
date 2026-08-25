import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
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
  spo2Today: 0,
  mmrcToday: 0,
  aqiToday: 0,
  riskScore: 0,
  doctor: "Your Doctor",
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
      let doctorData = null;
      if (doctorId) {
        try {
          const { data: docData } = await supabase
            .from('doctors')
            .select('name, hospital')
            .eq('id', doctorId)
            .single();
          if (docData) {
            doctorData = docData;
          }
        } catch (e) {
          console.log('Error fetching doctor:', e);
        }
      }

      const apiConfig = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };

      const [logsRes, scoreRes, diagnosisRes, baselineRes, pftRes, medRes] = await Promise.all([
        getPatientDailyLogs(apiConfig, patientId, 14),
        getPatientRedFlagScore(apiConfig, patientId),
        getPatientDiagnosis(apiConfig, patientId),
        getPatientBaseline(apiConfig, patientId),
        getLatestPftRecord(apiConfig, patientId),
        getPatientMedications(apiConfig, patientId),
      ]);

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
