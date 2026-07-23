"use client";

import { useEffect, useState } from "react";
import { getPatientPreviousDayLog } from "@o2plus/api-client/patient";

export interface PreviousDayLogData {
  loading: boolean;
  mmrc: number | null;
  spo2Rest: number | null;
  vasSymptoms: Record<string, number> | null;
  logDate: string | null;
}

interface HistoryLog {
  logged_at: string;
  mmrc_today: number | null;
  spo2_rest: number | null;
  vas_symptoms: Record<string, number> | null;
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function logDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return localDateKey(new Date(value));
}

/**
 * Fetches the most recent daily log before today for a patient.
 * Used to show previous-day comparison in the log form.
 */
export function usePreviousDayLog(patientId: string | null): PreviousDayLogData {
  const [data, setData] = useState<PreviousDayLogData>({
    loading: true,
    mmrc: null,
    spo2Rest: null,
    vasSymptoms: null,
    logDate: null,
  });

  useEffect(() => {
    if (!patientId) {
      setData({ loading: false, mmrc: null, spo2Rest: null, vasSymptoms: null, logDate: null });
      return;
    }

    setData((current) => ({ ...current, loading: true }));
    const today = localDateKey();

    (async () => {
      const logs = await getPatientPreviousDayLog({ supabase: null as any }, patientId);

      const log = (logs ?? [])
        .filter((entry: any) => logDateKey(entry.logged_at) < today)
        .sort((a: any, b: any) => b.logged_at.localeCompare(a.logged_at))[0];

      if (!log) {
        setData({ loading: false, mmrc: null, spo2Rest: null, vasSymptoms: null, logDate: null });
        return;
      }

      setData({
        loading: false,
        mmrc: log.mmrc_today ?? null,
        spo2Rest: log.spo2_rest ?? null,
        vasSymptoms: log.vas_symptoms ?? null,
        logDate: log.logged_at,
      });
    })();
  }, [patientId]);

  return data;
}
