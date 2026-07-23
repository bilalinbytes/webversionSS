/**
 * UI-layer shared types — shapes that are consumed by both web hooks and
 * mobile hooks. Platform-specific code (web hooks, mobile hooks) import these
 * so both platforms share a single contract for what the patient home data
 * looks like.
 *
 * These are intentionally NOT tied to any React primitives — pure data shapes.
 */
import type { EffectiveDashboardValue } from "./constants";

// ── Patient session profile (used by PatientContext on both platforms) ────────

/**
 * The patient's session profile — available after login on both web and mobile.
 * Populated by the auth context on each platform.
 */
export interface PatientProfile {
  id: string;
  name: string;
  initials: string;
  phone: string | null;
  doctor_id: string | null;
  effective_dashboard: EffectiveDashboardValue | null;
  wants_appointments: boolean | null;
}

// ── Patient home screen data contract ────────────────────────────────────────

/**
 * The full data shape for the patient home screen.
 * Both web (usePatientHomeData hook) and mobile (same hook, different platform)
 * return this exact shape — guaranteed by @o2plus/core's buildPatientHomeData().
 */
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
  effectiveDashboard: EffectiveDashboardValue | null;
  baselineSpo2: number | null;
  baselineHeartRate: number | null;
  latestPft: {
    fev1_fvc_ratio: number | null;
    fev1: number | null;
    fvc: number | null;
    dlco: number | null;
    test_date: string | null;
  } | null;
  todayMedications: Array<{
    id: string;
    name: string;
    dose?: string;
    taken: boolean | null;
  }>;
}
