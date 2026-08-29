"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

type Viewer = "doctor" | "patient";
type DiagnosisKind = "asthma" | "copd" | "ild" | "bronchiectasis" | "post_icu" | "unknown";

interface DailyLogRow {
  logged_at: string;
  spo2_rest: number | null;
  spo2_exertion: number | null;
  mmrc_today: number | null;
  aqi_value: number | null;
  vas_symptoms: Record<string, unknown> | null;
  medication_compliance: Record<string, unknown> | null;
  disease_specific_data: Record<string, unknown> | null;
}

interface DiagnosisRow {
  primary_diagnosis: string | null;
  effective_dashboard: string | null;
}

interface PftRow {
  id: string;
  test_date: string;
  fev1: number | null;
  fvc: number | null;
  fev1_fvc_ratio: number | null;
  dlco: number | null;
  other_fields: Record<string, unknown> | null;
}

interface MedicationRow {
  id: string;
  drug_name: string;
  route: string;
  dose: number | null;
  dose_unit: string | null;
  start_date: string;
  end_date: string | null;
}

interface AnalyticsPoint {
  date: string;
  sortDate: string;
  spo2Rest: number | null;
  spo2Walk: number | null;
  heartRate: number | null;
  mmrc: number | null;
  symptom: number | null;
  aqi: number | null;
  adherence: number | null;
  asthmaControl: number | null;
  asthmaControlLabel: string | null;
  rescuePuffs: number | null;
  pefr: number | null;
  energy: number | null;
  chestHeaviness: number | null;
  sputumVolume: number | null;
  kbild: number | null;
  kbildQ1: number | null;
  kbildQ2: number | null;
  kbildQ3: number | null;
  kbildQ4: number | null;
  kbildQ5: number | null;
  kbildQ6: number | null;
  kbildQ7: number | null;
  kbildQ8: number | null;
  kbildQ9: number | null;
  kbildQ10: number | null;
  kbildQ11: number | null;
  kbildQ12: number | null;
  kbildQ13: number | null;
  kbildQ14: number | null;
  kbildQ15: number | null;
  hemoptysis: number | null;
  sputumClearance: number | null;
  symptoms: Record<string, number>;
  medications: Record<string, number>;
}

const MMRC_SYMPTOM_KEY = "__mmrc_today";
const KNOWN_SYMPTOM_KEYS = [
  "cough",
  "expectoration",
  "breathlessness",
  "chest_pain",
  "chestPain",
  "haemoptysis",
  "fever",
  "cold_symptoms",
  "pedal_edema",
  "stridor",
  "difficulty_lying_down",
  "difficulty_swallowing",
  "excessive_daytime_sleep",
  "covid",
];
const SYMPTOM_LABELS: Record<string, string> = {
  cough: "Cough",
  cough_frequency: "Cough Frequency",
  expectoration: "Expectoration",
  breathlessness: "Breathlessness",
  chest_pain: "Chest Pain",
  chestPain: "Chest Pain",
  chest_heaviness: "Chest Heaviness",
  haemoptysis: "Haemoptysis",
  hemoptysis: "Haemoptysis",
  fever: "Fever",
  cold_symptoms: "Cold Symptoms",
  pedal_edema: "Pedal Edema",
  stridor: "Stridor",
  difficulty_lying_down: "Difficulty Lying Down",
  difficulty_swallowing: "Difficulty Swallowing",
  excessive_daytime_sleep: "Excessive Daytime Sleepiness",
  covid: "Covid Symptoms",
  energy_level: "Energy Level",
  sleep_quality: "Sleep Quality",
  sleep_disturbed: "Sleep Disturbed",
  anxiety: "Anxiety",
  sputum_clearance: "Sputum Clearance",
  ease_of_clearance: "Ease of Clearance",
  ease_of_sputum_clearance: "Ease of Sputum Clearance",
  sputum_volume: "Sputum Volume",
  rescue_inhaler_puffs: "Rescue Puffs",
  pefr_lpm: "PEFR (L/min)",
  pefr_reading: "PEFR (L/min)",
  kbild_score: "K-BILD Score",
  asthma_control_yes_count: "Asthma Control Score",
  asthma_control_level: "Asthma Control Level",
  exercise_tolerance: "Exercise Tolerance",
  exercise_tolerance_good: "Exercise Tolerance",
  feverish_or_temp_gt_102: "Fever > 102°F",
  malaise: "Malaise",
  controller_taken: "Controller Inhaler Taken",
  recorded_temperature_f: "Temperature (°F)",
  temperature_f: "Temperature (°F)",
};

interface PatientAnalyticsViewProps {
  patientId: string;
  viewer?: Viewer;
  patientName?: string;
}

interface AnalyticsApiResponse {
  diagnosis: DiagnosisRow | null;
  logs: DailyLogRow[];
  pft: PftRow[];
  medications: MedicationRow[];
  error?: string;
}

// ─── Healthcare color palette ─────────────────────────────────────────────────
const COLORS = {
  teal:   "#0d9488",   // SpO2 / general teal
  green:  "#059669",   // Adherence / emerald
  blue:   "#2563eb",   // PFT / medical blue
  orange: "#ea580c",   // Rescue puffs
  red:    "#dc2626",   // SpO2 Rest danger
  purple: "#7c3aed",   // Heart rate
  gold:   "#d97706",   // AQI / amber
  indigo: "#4f46e5",   // Symptoms
};

const SYMPTOM_COLOR_MAP: Record<string, { color: string; bg: string; border: string; activeBg: string }> = {
  [MMRC_SYMPTOM_KEY]:       { color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", activeBg: "#dc2626" }, // mMRC (Red)
  breathlessness:           { color: "#e11d48", bg: "#fff1f2", border: "#fecdd3", activeBg: "#e11d48" }, // Rose
  cough:                    { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", activeBg: "#ea580c" }, // Orange
  cough_frequency:          { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", activeBg: "#ea580c" },
  expectoration:            { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", activeBg: "#059669" }, // Emerald
  sputum_volume:            { color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4", activeBg: "#0d9488" }, // Teal
  sputum_clearance:         { color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", activeBg: "#0284c7" }, // Sky
  ease_of_clearance:        { color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", activeBg: "#0284c7" },
  ease_of_sputum_clearance: { color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", activeBg: "#0284c7" },
  chest_pain:               { color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8", activeBg: "#db2777" }, // Pink
  chestPain:                { color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8", activeBg: "#db2777" },
  chest_heaviness:          { color: "#be185d", bg: "#fdf2f8", border: "#fbcfe8", activeBg: "#be185d" },
  haemoptysis:              { color: "#991b1b", bg: "#fef2f2", border: "#f87171", activeBg: "#991b1b" }, // Dark Red
  hemoptysis:               { color: "#991b1b", bg: "#fef2f2", border: "#f87171", activeBg: "#991b1b" },
  fever:                    { color: "#c026d3", bg: "#fdf4ff", border: "#f5d0fe", activeBg: "#c026d3" }, // Fuchsia
  cold_symptoms:            { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", activeBg: "#0891b2" }, // Cyan
  pedal_edema:              { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", activeBg: "#4f46e5" }, // Indigo
  stridor:                  { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", activeBg: "#7c3aed" }, // Purple
  difficulty_lying_down:    { color: "#9333ea", bg: "#faf5ff", border: "#e9d5ff", activeBg: "#9333ea" }, // Violet
  difficulty_swallowing:    { color: "#a855f7", bg: "#faf5ff", border: "#e9d5ff", activeBg: "#a855f7" },
  excessive_daytime_sleep:  { color: "#475569", bg: "#f8fafc", border: "#cbd5e1", activeBg: "#475569" }, // Slate
  sleep_quality:            { color: "#475569", bg: "#f8fafc", border: "#cbd5e1", activeBg: "#475569" },
  sleep_disturbed:          { color: "#475569", bg: "#f8fafc", border: "#cbd5e1", activeBg: "#475569" },
  energy_level:             { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", activeBg: "#16a34a" }, // Green
  anxiety:                  { color: "#d97706", bg: "#fffbeb", border: "#fde68a", activeBg: "#d97706" }, // Amber
  covid:                    { color: "#ef4444", bg: "#fef2f2", border: "#fca5a5", activeBg: "#ef4444" },
};

function getSymptomColor(key: string) {
  return SYMPTOM_COLOR_MAP[key] ?? { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", activeBg: "#4f46e5" };
}

const ASTHMA_CONTROL_LEVELS: Record<string, { value: number; label: string }> = {
  poorly_controlled: { value: 1, label: "Poorly controlled" },
  partly_controlled: { value: 2, label: "Partly controlled" },
  well_controlled: { value: 3, label: "Well controlled" },
};

const POORLY_CONTROLLED = ASTHMA_CONTROL_LEVELS.poorly_controlled!;
const PARTLY_CONTROLLED = ASTHMA_CONTROL_LEVELS.partly_controlled!;
const WELL_CONTROLLED = ASTHMA_CONTROL_LEVELS.well_controlled!;

const PFT_METRICS = [
  { key: "ratio",       label: "FEV1/FVC (%)",       color: "#2563eb" },
  { key: "fev1PctPred", label: "FEV1 (% Predicted)", color: "#0d9488" },
  { key: "fev1",        label: "FEV1 (Liters)",       color: "#0d9488" },
  { key: "fvcPctPred",  label: "FVC (% Predicted)",   color: "#7c3aed" },
  { key: "fvc",         label: "FVC (Liters)",         color: "#7c3aed" },
  { key: "dlco",        label: "DLCO (% Predicted)",   color: "#4f46e5" },
  { key: "sixMwd",      label: "6MWD (m)",             color: "#059669" },
  { key: "minSpo2",     label: "Min SpO2",             color: "#dc2626" },
  { key: "maxSpo2",     label: "Max SpO2",             color: "#2563eb" },
] as const;

type PftMetricKey = typeof PFT_METRICS[number]["key"];
type PftPoint = { date: string; sortDate: string } & Record<PftMetricKey, number | null>;

const KBILD_METRICS = [
  { key: "kbild", label: "K-BILD Total Score" },
  ...Array.from({ length: 15 }, (_, index) => ({
    key: `kbildQ${index + 1}` as keyof AnalyticsPoint,
    label: `K-BILD Question ${index + 1}`,
  })),
] as const;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function numberFromAny(data: Record<string, unknown> | null, keys: string[]): number | null {
  if (!data) return null;
  for (const key of keys) {
    const value = numberFrom(data[key]);
    if (value !== null) return value;
  }
  return null;
}

function normalizeDiagnosis(primary?: string | null, dashboard?: string | null): DiagnosisKind {
  const p = (primary ?? "").toLowerCase();
  if (p.includes("bronchiolitis")) return "asthma"; // Bronchiolitis Obliterans → asthma
  if (p.includes("bronchitis")) return "asthma"; // Bronchitis → asthma
  if (p.includes("overlap") || p.includes("aco")) return "copd"; // ACO → copd
  if (p.includes("asthma") && p.includes("copd")) return "copd"; // asthma+copd text → copd

  const db = (dashboard ?? "").toLowerCase().trim();
  if (db === "asthma") return "asthma";
  if (db === "copd") return "copd";
  if (db === "ild") return "ild";
  if (db === "bronchiectasis") return "bronchiectasis";
  if (db === "post_icu") return "post_icu";

  // Fall back to parsing primary_diagnosis text
  if ((p.startsWith("oad /") || p.startsWith("oad/")) && p.includes("asthma")) return "asthma";
  if (p.includes("asthma")) return "asthma";
  if (p.includes("copd")) return "copd";
  if (p.includes("ild") || p.includes("interstitial")) return "ild";
  if (p.includes("bronchiectasis")) return "bronchiectasis";
  if (p.includes("post_icu") || p.includes("post icu")) return "post_icu";
  return "unknown";
}

function diagnosisLabel(kind: DiagnosisKind): string {
  switch (kind) {
    case "asthma": return "Asthma";
    case "copd": return "COPD";
    case "ild": return "ILD";
    case "bronchiectasis": return "Bronchiectasis";
    case "post_icu": return "Post ICU";
    default: return "Disease-Specific";
  }
}

function extractSymptom(vas: Record<string, unknown> | null, mmrc: number | null): number | null {
  if (vas) {
    const values = Object.entries(vas)
      .filter(([key]) => !key.toLowerCase().includes("side"))
      .map(([, value]) => numberFrom(value))
      .filter((value): value is number => value !== null);
    if (values.length > 0) return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  return mmrc;
}

function extractSymptoms(vas: Record<string, unknown> | null): Record<string, number> {
  if (!vas) return {};
  return Object.fromEntries(
    Object.entries(vas)
      .filter(([key]) => !key.toLowerCase().includes("side"))
      .map(([key, value]) => [key, numberFrom(value)] as const)
      .filter((entry): entry is [string, number] => entry[1] !== null),
  );
}

function extractDiseaseSymptoms(data: Record<string, unknown> | null): Record<string, number> {
  if (!data) return {};
  const numericKeys = [
    // Common
    "cough_frequency",
    "chest_heaviness",
    "energy_level",
    "sleep_quality",
    "anxiety",
    // Bronchiectasis / sputum
    "ease_of_clearance",
    "ease_of_sputum_clearance",
    "recorded_temperature_f",
    "temperature_f",
    // Asthma
    "rescue_inhaler_puffs",
    "pefr_lpm",
    "pefr_reading",
    "asthma_control_yes_count",
    // ILD
    "kbild_score",
  ];
  const values: Record<string, number> = {};

  // Numeric fields
  numericKeys.forEach((key) => {
    const value = numberFrom(data[key]);
    if (value !== null) values[key] = value;
  });

  // Boolean → 0/1 fields
  const boolKeys: Array<[string, string]> = [
    ["haemoptysis", "haemoptysis"],
    ["haemoptysis", "hemoptysis"],
    ["exercise_tolerance", "exercise_tolerance"],
    ["exercise_tolerance_good", "exercise_tolerance_good"],
    ["sleep_disturbed", "sleep_disturbed"],
    ["feverish_or_temp_gt_102", "feverish_or_temp_gt_102"],
    ["malaise", "malaise"],
    ["controller_taken", "controller_taken"],
  ];
  for (const [outKey, inKey] of boolKeys) {
    const v = data[inKey];
    if (v === true) values[outKey] = 1;
    else if (v === false) values[outKey] = 0;
  }

  // Asthma control status → numeric level
  if (!values["asthma_control_yes_count"]) {
    const control = asthmaControlLevel(data);
    if (control !== null) values["asthma_control_level"] = control.value;
  }

  // K-BILD per-question responses
  const kbildResponses = data.kbild_responses;
  if (kbildResponses && typeof kbildResponses === "object" && !Array.isArray(kbildResponses)) {
    Object.entries(kbildResponses as Record<string, unknown>).forEach(([key, value]) => {
      const numeric = numberFrom(value);
      if (numeric !== null) values[`kbild_q${key}`] = numeric;
    });
  }

  // Sputum volume categorical → numeric for trending
  const sputumVolMap: Record<string, number> = {
    none: 0,
    less_than_usual: 2,
    scanty: 2,
    usual: 5,
    more_than_usual: 7,
    large_amount: 10,
    much_more_than_usual: 10,
  };
  const sv = typeof data["sputum_volume"] === "string" ? sputumVolMap[data["sputum_volume"] as string] : undefined;
  if (sv !== undefined) values["sputum_volume"] = sv;

  return values;
}

function formatMetricName(value: string): string {
  if (value === MMRC_SYMPTOM_KEY) return "mMRC Grade";
  if (SYMPTOM_LABELS[value]) return SYMPTOM_LABELS[value];
  if (/^kbild_q\d+$/i.test(value)) return value.replace(/^kbild_q/i, "K-BILD Question ");
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeMedicationKey(value: string): string {
  return value.trim().toLowerCase();
}

function medicationDisplayName(med: MedicationRow): string {
  const dose = med.dose !== null ? ` ${med.dose} ${med.dose_unit ?? ""}`.trimEnd() : "";
  return `${med.drug_name}${dose}`.trim();
}

function compactMedicationKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(value.trim());
}

function adherencePercent(compliance: Record<string, unknown> | null): number | null {
  if (!compliance) return null;
  const values = Object.values(compliance).filter((value) => typeof value === "boolean");
  if (values.length === 0) return null;
  const taken = values.filter(Boolean).length;
  return Math.round((taken / values.length) * 100);
}

function asthmaControlLevel(data: Record<string, unknown> | null): { value: number; label: string } | null {
  const status = typeof data?.asthma_control_status === "string"
    ? ASTHMA_CONTROL_LEVELS[data.asthma_control_status.toLowerCase()]
    : null;
  if (status) return status;

  const responses = data?.asthma_control_responses;
  if (Array.isArray(responses)) {
    const yesCount = responses.filter(Boolean).length;
    if (yesCount === 0) return WELL_CONTROLLED;
    if (yesCount <= 2) return PARTLY_CONTROLLED;
    return POORLY_CONTROLLED;
  }

  const yesCount = numberFromAny(data, ["asthma_control_yes_count"]);
  if (yesCount !== null) {
    if (yesCount === 0) return WELL_CONTROLLED;
    if (yesCount <= 2) return PARTLY_CONTROLLED;
    return POORLY_CONTROLLED;
  }

  return null;
}

function categoricalNumber(data: Record<string, unknown> | null, keys: string[]): number | null {
  const direct = numberFromAny(data, keys);
  if (direct !== null) return direct;
  if (!data) return null;
  for (const key of keys) {
    const value = data[key];
    if (typeof value !== "string") continue;
    const normalized = value.toLowerCase();
    if (normalized.includes("easy") || normalized.includes("scanty") || normalized.includes("small")) return 8;
    if (normalized.includes("moderate")) return 5;
    if (normalized.includes("difficult") || normalized.includes("large")) return 2;
  }
  return null;
}

function hasData<T extends object>(rows: T[], keys: Array<keyof T>): boolean {
  return rows.some((row) => keys.some((key) => row[key] !== null && row[key] !== undefined));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ChartBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{
      border: "1px solid rgba(19,45,54,0.09)",
      borderRadius: 12,
      background: "#ffffff",
      padding: "18px 18px 14px",
      minHeight: 310,
      boxShadow: "0 1px 3px rgba(19,45,54,0.06), 0 4px 16px rgba(19,45,54,0.04)",
      transition: "box-shadow 200ms ease",
      overflow: "hidden",
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(19,45,54,0.1), 0 12px 32px rgba(19,45,54,0.08)"; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(19,45,54,0.06), 0 4px 16px rgba(19,45,54,0.04)"; }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>{title}</p>
      {subtitle && <p style={{ margin: "3px 0 14px", fontSize: 11, lineHeight: 1.5, color: "#64748b" }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 12 }} />}
      {children}
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div style={{
      height: 230,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      color: "#94a3b8",
      fontSize: 12,
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      borderRadius: 8,
      border: "1px dashed #e2e8f0",
    }}>
      <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5l4.5-4.5 4 4 4-5.5 4 4" />
      </svg>
      {label}
    </div>
  );
}

function MedicationAdherenceTable({ logs, meds }: { logs: DailyLogRow[]; meds: MedicationRow[] }) {
  const rows = [...logs]
    .filter((log) => log.medication_compliance && Object.keys(log.medication_compliance).length > 0)
    .sort((left, right) => left.logged_at.localeCompare(right.logged_at));
  const dates = rows.map((log) => ({
    key: log.logged_at,
    label: fmtDate(log.logged_at),
  }));
  const medicationKeys = Array.from(new Set(
    rows.flatMap((log) => Object.keys(log.medication_compliance ?? {})),
  )).sort((left, right) => left.localeCompare(right));
  const medicationLabels = new Map<string, string>();
  meds.forEach((med) => {
    const label = medicationDisplayName(med);
    const aliases = [
      med.id,
      normalizeMedicationKey(med.id),
      compactMedicationKey(med.id),
      med.drug_name,
      normalizeMedicationKey(med.drug_name),
      compactMedicationKey(med.drug_name),
      label,
      normalizeMedicationKey(label),
      compactMedicationKey(label),
    ];
    aliases.forEach((alias) => medicationLabels.set(alias, label));
  });

  let archivedIndex = 0;
  const medicationRows = Array.from(
    medicationKeys.reduce((acc, key) => {
      const normalizedKey = normalizeMedicationKey(key);
      const compactKey = compactMedicationKey(key);
      const label =
        medicationLabels.get(key) ??
        medicationLabels.get(normalizedKey) ??
        medicationLabels.get(compactKey) ??
        (isUuidLike(key) ? `Medication ${++archivedIndex}` : key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
      const row = acc.get(label) ?? { label, keys: new Set<string>() };
      row.keys.add(key);
      acc.set(label, row);
      return acc;
    }, new Map<string, { label: string; keys: Set<string> }>()),
  ).map(([, row]) => ({ label: row.label, keys: Array.from(row.keys) }));

  if (rows.length === 0 || medicationRows.length === 0) {
    return (
      <div style={{ minHeight: 140, display: "grid", placeItems: "center", color: "#888680", fontSize: 13, background: "#fbfaf7", borderRadius: 8, textAlign: "center", padding: "24px 16px" }}>
        <div>
          <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#132d36" }}>No medication adherence data yet</p>
          <p style={{ margin: 0, fontSize: 12 }}>Adherence data is recorded when patients mark medications as taken or not taken during daily logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Summary grid — compact, multi-column */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 8,
      }}>
        {medicationRows.map((medication) => {
          const allValues = rows.flatMap((log) =>
            medication.keys
              .map((key) => log.medication_compliance?.[key])
              .filter((v): v is boolean => v === true || v === false)
          );
          const taken = allValues.filter(Boolean).length;
          const total = allValues.length;
          const pct = total > 0 ? Math.round((taken / total) * 100) : null;
          const color = pct === null ? "#888680" : pct >= 80 ? "#0f6e56" : pct >= 50 ? "#b7791f" : "#c94d49";
          const bg   = pct === null ? "#f8f7f5" : pct >= 80 ? "rgba(15,110,86,0.06)" : pct >= 50 ? "rgba(183,121,31,0.06)" : "rgba(201,77,73,0.06)";
          return (
            <div key={medication.label} style={{
              padding: "7px 10px",
              border: `1px solid ${pct !== null && pct >= 80 ? "rgba(15,110,86,0.2)" : pct !== null && pct >= 50 ? "rgba(183,121,31,0.2)" : "rgba(201,77,73,0.15)"}`,
              borderRadius: 7,
              background: bg,
            }}>
              <p style={{ margin: 0, fontSize: 9.5, color: "#6d8794", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {medication.label}
              </p>
              <p style={{ margin: "3px 0 1px", fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>
                {pct !== null ? `${pct}%` : "—"}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: "#888680" }}>
                {total > 0 ? `${taken}/${total} days` : "No data"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Detail table — compact */}
      <div style={{ overflowX: "auto", border: "1px solid rgba(19,45,54,0.08)", borderRadius: 7, maxWidth: "100%" }}>
        <table style={{ width: "100%", minWidth: Math.max(380, 150 + dates.length * 54), borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed" }}>
          <thead>
            <tr style={{ background: "#f5f3ee" }}>
              <th style={{ position: "sticky", left: 0, zIndex: 1, width: 150, background: "#f5f3ee", textAlign: "left", padding: "6px 10px", color: "#132d36", fontWeight: 800, fontSize: 11 }}>
                Medication
              </th>
              {dates.map((date) => (
                <th key={date.key} style={{ width: 54, textAlign: "center", padding: "6px 3px", color: "#6d8794", fontWeight: 700, whiteSpace: "nowrap", fontSize: 9.5 }}>
                  {date.label}
                </th>
              ))}
              <th style={{ width: 44, textAlign: "center", padding: "6px 6px", color: "#132d36", fontWeight: 800, background: "#f5f3ee", fontSize: 11 }}>
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {medicationRows.map((medication) => {
              const allValues = rows.flatMap((log) =>
                medication.keys
                  .map((key) => log.medication_compliance?.[key])
                  .filter((v): v is boolean => v === true || v === false)
              );
              const taken = allValues.filter(Boolean).length;
              const total = allValues.length;
              const pct = total > 0 ? Math.round((taken / total) * 100) : null;
              const pctColor = pct === null ? "#888680" : pct >= 80 ? "#0f6e56" : pct >= 50 ? "#b7791f" : "#c94d49";

              return (
                <tr key={medication.label} style={{ borderTop: "1px solid rgba(19,45,54,0.07)" }}>
                  <td style={{ position: "sticky", left: 0, background: "#fff", padding: "6px 10px", color: "#132d36", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}
                    title={medication.label}>
                    {medication.label}
                  </td>
                  {rows.map((log) => {
                    const values = medication.keys
                      .map((key) => log.medication_compliance?.[key])
                      .filter((v): v is boolean => v === true || v === false);
                    const value = values.includes(true) ? true : values.includes(false) ? false : null;
                    return (
                      <td key={`${medication.label}-${log.logged_at}`} style={{ textAlign: "center", padding: "4px 3px" }}>
                        <span
                          aria-label={value === true ? "Taken" : value === false ? "Not taken" : "No entry"}
                          title={value === true ? "Taken" : value === false ? "Not taken" : "No entry"}
                          style={{
                            display: "inline-flex",
                            width: 24,
                            height: 20,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 4,
                            background: value === true ? "rgba(15,110,86,0.12)" : value === false ? "rgba(201,77,73,0.1)" : "#f2f0eb",
                            color: value === true ? "#0f6e56" : value === false ? "#c94d49" : "#c4c0b8",
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        >
                          {value === true ? "✓" : value === false ? "✕" : "–"}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "center", padding: "6px 6px", fontWeight: 800, color: pctColor, fontSize: 11 }}>
                    {pct !== null ? `${pct}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(15,23,42,0.1)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 4px 24px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.08)",
      fontSize: 12,
      minWidth: 140,
    }}>
      <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#0f172a", fontSize: 11, letterSpacing: "0.02em" }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: entry.color, flexShrink: 0, boxShadow: `0 0 6px ${entry.color}60` }} />
          <span style={{ color: "#64748b", flex: 1 }}>{entry.name}</span>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function MetricLineChart({
  data,
  lines,
  yDomain,
  yTicks,
  yTickFormatter,
  tooltipFormatter,
}: {
  data: AnalyticsPoint[];
  lines: Array<{ key: keyof AnalyticsPoint; name: string; color: string }>;
  yDomain?: [number, number];
  yTicks?: number[];
  yTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: unknown, name: unknown) => [string, string];
}) {
  if (!hasData(data, lines.map((line) => line.key))) {
    return <EmptyChart label="No historical readings yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        {/* SVG gradient defs for each line */}
        <defs>
          {lines.map((line) => (
            <linearGradient key={`grad-${String(line.key)}`} id={`grad-${String(line.key)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={line.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={line.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid
          strokeDasharray="4 4"
          stroke="rgba(148,163,184,0.2)"
          vertical={false}
          horizontalCoordinatesGenerator={() => []}
        />
        <CartesianGrid
          strokeDasharray="0"
          stroke="rgba(148,163,184,0.12)"
          horizontal={false}
        />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 10.5, fill: "#94a3b8", fontFamily: "system-ui, sans-serif" }}
          tickMargin={10}
          minTickGap={20}
          axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
          tickLine={false}
        />
        <YAxis
          domain={yDomain}
          ticks={yTicks}
          tickFormatter={yTickFormatter}
          tick={{ fontSize: 10.5, fill: "#94a3b8", fontFamily: "system-ui, sans-serif" }}
          width={yTickFormatter ? 108 : 34}
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip
          content={<CustomTooltip />}
          formatter={tooltipFormatter}
          cursor={{ stroke: "rgba(148,163,184,0.3)", strokeWidth: 1, strokeDasharray: "4 2" }}
        />

        <Legend
          verticalAlign="top"
          align="right"
          wrapperStyle={{ fontSize: 11, paddingBottom: 10, fontFamily: "system-ui, sans-serif", color: "#475569" }}
          iconType="circle"
          iconSize={8}
        />

        {lines.map((line) => (
          <Line
            key={String(line.key)}
            type="monotoneX"
            dataKey={line.key as string}
            stroke={line.color}
            strokeWidth={3}
            dot={{ r: 2.5, fill: line.color, strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: line.color,
              stroke: "#ffffff",
              strokeWidth: 2.5,
              style: { filter: `drop-shadow(0 0 6px ${line.color}80)` },
            }}
            name={line.name}
            connectNulls
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PatientAnalyticsView({ patientId, viewer = "patient", patientName }: PatientAnalyticsViewProps) {
  const [logs, setLogs] = useState<DailyLogRow[]>([]);
  const [pft, setPft] = useState<PftRow[]>([]);
  const [meds, setMeds] = useState<MedicationRow[]>([]);
  const [diagnosis, setDiagnosis] = useState<DiagnosisRow | null>(null);
  const [selectedPftMetric, setSelectedPftMetric] = useState<PftMetricKey>("ratio");
  const [selectedKbildMetric, setSelectedKbildMetric] = useState<keyof AnalyticsPoint>("kbild");
  const [selectedSymptom, setSelectedSymptom] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"single" | "all" | null>(null);
  const loadKey = `${patientId}::${viewer}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const [requestPatientId, requestViewer] = loadKey.split("::") as [string, Viewer];

      if (requestViewer === "doctor") {
        const response = await fetch(`/api/patients/${requestPatientId}/analytics`, { credentials: "include" });
        const body = await response.json().catch(() => null) as AnalyticsApiResponse | null;

        if (cancelled) return;
        if (!response.ok || !body) {
          setError(body?.error ?? "Unable to load analytics.");
        } else {
          setDiagnosis(body.diagnosis);
          setLogs(body.logs ?? []);
          setPft(body.pft ?? []);
          setMeds(body.medications ?? []);
        }
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const [diagRes, logRes, pftRes, medRes] = await Promise.all([
        supabase
          .from("patient_diagnoses")
          .select("primary_diagnosis,effective_dashboard")
          .eq("patient_id", requestPatientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("daily_logs")
          .select("logged_at,spo2_rest,spo2_exertion,mmrc_today,aqi_value,vas_symptoms,medication_compliance,disease_specific_data")
          .eq("patient_id", requestPatientId)
          .order("logged_at", { ascending: false })
          .limit(180),
        supabase
          .from("pft_records")
          .select("id,test_date,fev1,fvc,fev1_fvc_ratio,dlco,other_fields")
          .eq("patient_id", requestPatientId)
          .order("test_date", { ascending: false }),
        supabase
          .from("medications")
          .select("id,drug_name,route,dose,dose_unit,start_date,end_date")
          .eq("patient_id", requestPatientId)
          .order("start_date", { ascending: false }),
      ]);

      if (cancelled) return;
      if (diagRes.error || logRes.error || pftRes.error || medRes.error) {
        setError(diagRes.error?.message ?? logRes.error?.message ?? pftRes.error?.message ?? medRes.error?.message ?? "Unable to load analytics.");
      } else {
        setDiagnosis((diagRes.data as DiagnosisRow | null) ?? null);
        setLogs((logRes.data ?? []) as DailyLogRow[]);
        setPft((pftRes.data ?? []) as PftRow[]);
        setMeds((medRes.data ?? []) as MedicationRow[]);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const diseaseKind = normalizeDiagnosis(diagnosis?.primary_diagnosis, diagnosis?.effective_dashboard);

  const dailySeries = useMemo<AnalyticsPoint[]>(() => {
    return logs
      .map((log) => {
        const disease = log.disease_specific_data;
        const asthmaControl = asthmaControlLevel(disease);
        const kbildResponses = (disease?.kbild_responses ?? {}) as Record<string, unknown>;
        const vasSymptoms = extractSymptoms(log.vas_symptoms);
        const diseaseSymptoms = extractDiseaseSymptoms(disease);
        // Merge disease symptoms but exclude non-symptom metrics
        const NON_SYMPTOM_KEYS = new Set([
          "kbild_score", "pefr_lpm", "pefr_reading", "rescue_inhaler_puffs",
          "asthma_control_yes_count", "controller_taken",
          "exercise_tolerance", "exercise_tolerance_good",
        ]);
        const filteredDiseaseSymptoms = Object.fromEntries(
          Object.entries(diseaseSymptoms).filter(([k]) => !NON_SYMPTOM_KEYS.has(k))
        );
        const symptoms = { ...vasSymptoms, ...filteredDiseaseSymptoms };
        const medications: Record<string, number> = {};
        for (const [name, taken] of Object.entries(log.medication_compliance ?? {})) {
          if (taken === true || taken === false) medications[normalizeMedicationKey(name)] = taken ? 100 : 0;
        }
        return {
          date: fmtDate(log.logged_at),
          sortDate: log.logged_at,
          spo2Rest: log.spo2_rest,
          spo2Walk: log.spo2_exertion,
          heartRate: numberFromAny(disease, ["heart_rate", "heartRate", "pulse_rate", "pulse"]),
          mmrc: log.mmrc_today,
          symptom: extractSymptom(log.vas_symptoms, log.mmrc_today),
          aqi: log.aqi_value,
          adherence: adherencePercent(log.medication_compliance),
          asthmaControl: asthmaControl?.value ?? null,
          asthmaControlLabel: asthmaControl?.label ?? null,
          rescuePuffs: numberFromAny(disease, ["rescue_inhaler_puffs", "rescue_puff_usage", "rescue_puffs"]),
          pefr: numberFromAny(disease, ["pefr_lpm", "pefr_reading", "pefr"]),
          energy: numberFromAny(disease, ["energy_level", "energy"]),
          chestHeaviness: numberFromAny(log.vas_symptoms, ["chest_heaviness", "chestHeaviness"]) ?? numberFromAny(disease, ["chest_heaviness", "chestHeaviness"]),
          sputumVolume: (() => {
            const sv = typeof disease?.sputum_volume === "string"
              ? { none: 0, less_than_usual: 2, scanty: 2, usual: 5, more_than_usual: 7, large_amount: 10, much_more_than_usual: 10 }[disease.sputum_volume as string] ?? null
              : numberFromAny(disease, ["sputum_volume"]);
            return sv;
          })(),
          kbild: numberFromAny(disease, ["kbild_score", "kbild"]),
          kbildQ1: numberFrom(kbildResponses["1"]),
          kbildQ2: numberFrom(kbildResponses["2"]),
          kbildQ3: numberFrom(kbildResponses["3"]),
          kbildQ4: numberFrom(kbildResponses["4"]),
          kbildQ5: numberFrom(kbildResponses["5"]),
          kbildQ6: numberFrom(kbildResponses["6"]),
          kbildQ7: numberFrom(kbildResponses["7"]),
          kbildQ8: numberFrom(kbildResponses["8"]),
          kbildQ9: numberFrom(kbildResponses["9"]),
          kbildQ10: numberFrom(kbildResponses["10"]),
          kbildQ11: numberFrom(kbildResponses["11"]),
          kbildQ12: numberFrom(kbildResponses["12"]),
          kbildQ13: numberFrom(kbildResponses["13"]),
          kbildQ14: numberFrom(kbildResponses["14"]),
          kbildQ15: numberFrom(kbildResponses["15"]),
          hemoptysis: numberFromAny(log.vas_symptoms, ["hemoptysis"]) ?? numberFromAny(disease, ["hemoptysis", "hemoptysis_ml"]),
          sputumClearance: categoricalNumber(disease, ["ease_of_sputum_clearance", "sputum_clearance", "sputum_clearance_ease", "sputum_volume"]),
          symptoms,
          medications,
        };
      })
      .reverse();
  }, [logs]);

  const pftSeries = useMemo<PftPoint[]>(() => {
    return pft
      .map((row) => {
        const other = row.other_fields ?? {};
        return {
          date: fmtDate(row.test_date),
          sortDate: row.test_date,
          ratio: row.fev1_fvc_ratio,
          fev1PctPred: numberFrom(other.fev1_pct_pred),
          fev1: row.fev1,
          fvcPctPred: numberFrom(other.fvc_pct_pred),
          fvc: row.fvc,
          dlco: row.dlco,
          sixMwd: numberFrom(other.six_mwd),
          minSpo2: numberFrom(other.min_spo2),
          maxSpo2: numberFrom(other.max_spo2),
        };
      })
      .reverse();
  }, [pft]);

  const selectedPftMetricConfig = PFT_METRICS.find((metric) => metric.key === selectedPftMetric) ?? PFT_METRICS[0];

  const reportedSymptomStats = useMemo(() => {
    const stats: Record<string, { daysReported: number; totalDays: number; avgSeverity: number }> = {};

    // Check mMRC
    const mmrcRows = dailySeries.filter((r) => r.mmrc !== null);
    if (mmrcRows.length > 0) {
      const positiveMmrc = mmrcRows.filter((r) => (r.mmrc ?? 0) > 0);
      const totalScore = mmrcRows.reduce((acc, r) => acc + (r.mmrc ?? 0), 0);
      stats[MMRC_SYMPTOM_KEY] = {
        daysReported: positiveMmrc.length,
        totalDays: mmrcRows.length,
        avgSeverity: Number((totalScore / mmrcRows.length).toFixed(1)),
      };
    }

    // Check all symptoms in dailySeries
    for (const row of dailySeries) {
      for (const [k, v] of Object.entries(row.symptoms)) {
        if (v !== null && v !== undefined) {
          if (!stats[k]) {
            stats[k] = { daysReported: 0, totalDays: 0, avgSeverity: 0 };
          }
          stats[k]!.totalDays += 1;
          if (v > 0) {
            stats[k]!.daysReported += 1;
          }
        }
      }
    }

    // Calculate averages
    for (const [k, stat] of Object.entries(stats)) {
      if (k === MMRC_SYMPTOM_KEY) continue;
      const values = dailySeries.map((r) => r.symptoms[k]).filter((v): v is number => typeof v === "number");
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        stat.avgSeverity = Number((sum / values.length).toFixed(1));
      }
    }

    return stats;
  }, [dailySeries]);

  const { reportedSymptomKeys, otherSymptomKeys, symptomKeys } = useMemo(() => {
    const reported = Object.keys(reportedSymptomStats).sort((a, b) => {
      const aReported = reportedSymptomStats[a]?.daysReported ?? 0;
      const bReported = reportedSymptomStats[b]?.daysReported ?? 0;
      return bReported - aReported;
    });

    const allKnown = Array.from(new Set([...KNOWN_SYMPTOM_KEYS, MMRC_SYMPTOM_KEY]));
    const others = allKnown.filter((k) => !reported.includes(k)).sort();

    return {
      reportedSymptomKeys: reported,
      otherSymptomKeys: others,
      symptomKeys: [...reported, ...others],
    };
  }, [reportedSymptomStats]);

  const selectedSymptomIsMmrc = selectedSymptom === MMRC_SYMPTOM_KEY;
  const selectedSymptomSeries = useMemo(
    () => dailySeries.map((row) => ({
      date: row.date,
      sortDate: row.sortDate,
      value: selectedSymptomIsMmrc ? row.mmrc : selectedSymptom ? row.symptoms[selectedSymptom] ?? null : null,
    })),
    [dailySeries, selectedSymptom, selectedSymptomIsMmrc],
  );
  const selectedSymptomDomain: [number, number] = selectedSymptomIsMmrc ? [0, 4] : [0, 10];
  const activeSymptomColor = getSymptomColor(selectedSymptom || MMRC_SYMPTOM_KEY);

  useEffect(() => {
    if (symptomKeys.length === 0) {
      setSelectedSymptom("");
      return;
    }
    if (!selectedSymptom || !symptomKeys.includes(selectedSymptom)) {
      setSelectedSymptom(reportedSymptomKeys[0] ?? symptomKeys[0] ?? "");
    }
  }, [selectedSymptom, symptomKeys, reportedSymptomKeys]);

  async function handleExport(type: "single" | "all") {
    setExporting(type);
    setError(null);
    try {
      const body = type === "single"
        ? { export_type: "single_patient", patient_id: patientId }
        : { export_type: "combined" };
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string; details?: string } | null;
        throw new Error(payload?.details ?? payload?.error ?? "Export failed.");
      }
      const blob = await response.blob();
      const header = response.headers.get("Content-Disposition");
      const filename = header?.match(/filename="(.+)"/)?.[1] ?? `saans-${type}-patient-export.pdf`;
      downloadBlob(blob, filename);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: "#6d8794" }}>Loading patient analytics... · विश्लेषण लोड हो रहा है...</div>;
  }

  if (error && logs.length === 0 && pft.length === 0) {
    return <div style={{ padding: 24, color: "#c94d49" }}>{error}</div>;
  }

  const postIcuDiseaseCharts = (
    <>
      <ChartBlock title="Hemoptysis" subtitle="Blood in sputum or hemoptysis score">
        <MetricLineChart data={dailySeries} yDomain={[0, 10]} lines={[{ key: "hemoptysis", name: "Hemoptysis", color: COLORS.red }]} />
      </ChartBlock>
      <ChartBlock title="Ease of Sputum Clearance" subtitle="Higher score means easier clearance">
        <MetricLineChart data={dailySeries} yDomain={[0, 10]} lines={[{ key: "sputumClearance", name: "Sputum Clearance", color: COLORS.blue }]} />
      </ChartBlock>
    </>
  );

  const diseaseCharts = {
    asthma: (
      <>
        <ChartBlock title="Asthma Control · अस्थमा नियंत्रण" subtitle="Daily asthma control category · दैनिक अस्थमा नियंत्रण श्रेणी">
          <MetricLineChart
            data={dailySeries}
            yDomain={[1, 3]}
            yTicks={[1, 2, 3]}
            yTickFormatter={(value) => (
              value === 1 ? "Poorly controlled" : value === 2 ? "Partly controlled" : value === 3 ? "Well controlled" : ""
            )}
            tooltipFormatter={(value) => {
              const numericValue = typeof value === "number" ? value : Number(value);
              const label = numericValue === 1 ? "Poorly controlled" : numericValue === 2 ? "Partly controlled" : numericValue === 3 ? "Well controlled" : "--";
              return [label, "Asthma Control"];
            }}
            lines={[{ key: "asthmaControl", name: "Asthma Control", color: COLORS.green }]}
          />
        </ChartBlock>
        <ChartBlock title="Rescue Puff Usage · रेस्क्यू पफ उपयोग" subtitle="Reliever / rescue inhaler puffs per day · प्रतिदिन रेस्क्यू इनहेलर पफ">
          <MetricLineChart data={dailySeries} lines={[{ key: "rescuePuffs", name: "Rescue Puffs", color: COLORS.orange }]} />
        </ChartBlock>
        <ChartBlock title="Peak Flow / PEFR · पीक फ्लो" subtitle="Peak expiratory flow rate in L/min · पीक फ्लो रेट (L/min)">
          <MetricLineChart
            data={dailySeries}
            lines={[{ key: "pefr", name: "PEFR (L/min)", color: COLORS.purple }]}
          />
        </ChartBlock>
      </>
    ),
    copd: (
      <>
        <ChartBlock title="Energy Levels · ऊर्जा स्तर" subtitle="Patient-reported energy score (0–10) · मरीज द्वारा बताया ऊर्जा स्कोर">
          <MetricLineChart data={dailySeries} yDomain={[0, 10]} lines={[{ key: "energy", name: "Energy", color: COLORS.green }]} />
        </ChartBlock>
        <ChartBlock title="Chest Heaviness · छाती में भारीपन" subtitle="VAS chest heaviness trend (0–10) · छाती भारीपन का ट्रेंड">
          <MetricLineChart data={dailySeries} yDomain={[0, 10]} lines={[{ key: "chestHeaviness", name: "Chest Heaviness", color: COLORS.red }]} />
        </ChartBlock>
        <ChartBlock title="Sputum Volume · बलगम की मात्रा" subtitle="Patient-reported sputum volume · मरीज द्वारा बताई बलगम मात्रा">
          <MetricLineChart data={dailySeries} yDomain={[0, 10]} lines={[{ key: "sputumVolume", name: "Sputum Volume", color: COLORS.gold }]} />
        </ChartBlock>
      </>
    ),
    ild: (
      <>
        <ChartBlock title="K-BILD Score · के-बिल्ड स्कोर" subtitle="King's Brief Interstitial Lung Disease Health Status (0–100) · स्वास्थ्य स्थिति स्कोर">
          <MetricLineChart data={dailySeries} yDomain={[0, 100]} lines={[{ key: "kbild", name: "K-BILD Score", color: COLORS.teal }]} />
        </ChartBlock>
        <ChartBlock title="K-BILD Domain Trends · के-बिल्ड डोमेन ट्रेंड" subtitle="Domain score breakdowns across key questionnaire responses · प्रमुख डोमेन स्कोर">
          <MetricLineChart
            data={dailySeries}
            yDomain={[0, 7]}
            lines={[
              { key: "kbildQ1", name: "Breathlessness (Q1)", color: COLORS.red },
              { key: "kbildQ2", name: "Chest tightness (Q2)", color: COLORS.orange },
              { key: "kbildQ6", name: "Cough (Q6)", color: COLORS.purple },
            ]}
          />
        </ChartBlock>
      </>
    ),
    bronchiectasis: postIcuDiseaseCharts,
    post_icu: postIcuDiseaseCharts,
    unknown: null,
  } satisfies Record<DiagnosisKind, React.ReactNode>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "0 0 32px" }}>
      {viewer === "doctor" && (
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#132d36" }}>Patient Export Dossier</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6d8794" }}>Download structured PDF reports for clinical review</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => handleExport("single")}
              disabled={exporting !== null}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, border: "1.5px solid #2563eb",
                background: "#ffffff", color: "#2563eb", fontSize: 12, fontWeight: 700,
                cursor: exporting ? "not-allowed" : "pointer",
              }}
            >
              {exporting === "single" ? "Exporting..." : "Export Patient PDF"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("all")}
              disabled={exporting !== null}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, border: "none",
                background: "#2563eb", color: "#ffffff", fontSize: 12, fontWeight: 700,
                cursor: exporting ? "not-allowed" : "pointer",
              }}
            >
              {exporting === "all" ? "Exporting..." : "Combined Cohort PDF"}
            </button>
          </div>
        </section>
      )}

      {/* PFT Trends Section */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Pulmonary Function Tests · फेफड़े के कार्य परीक्षण
          </p>
          <div style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            maxWidth: "100%",
            paddingBottom: 4,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}>
            {PFT_METRICS.map((metric) => (
              <button
                key={metric.key}
                type="button"
                onClick={() => setSelectedPftMetric(metric.key)}
                style={{
                  padding: "5px 12px", borderRadius: 999, border: "1px solid",
                  borderColor: selectedPftMetric === metric.key ? metric.color : "#cbd5e1",
                  background: selectedPftMetric === metric.key ? metric.color : "#ffffff",
                  color: selectedPftMetric === metric.key ? "#ffffff" : "#475569",
                  fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  transition: "all 120ms ease",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        <ChartBlock
          title={`PFT Trend: ${selectedPftMetricConfig.label}`}
          subtitle="Longitudinal spirometry & diffusion capacity over test dates"
        >
          {pftSeries.length === 0 || !pftSeries.some((row) => row[selectedPftMetric] !== null) ? (
            <EmptyChart label="No PFT records found for this metric." />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={pftSeries} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="grad-pft" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selectedPftMetricConfig.color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={selectedPftMetricConfig.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: "#94a3b8" }} tickMargin={10} minTickGap={20} axisLine={{ stroke: "rgba(148,163,184,0.25)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10.5, fill: "#94a3b8" }} width={34} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(148,163,184,0.3)", strokeWidth: 1, strokeDasharray: "4 2" }} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 10, color: "#475569" }} iconType="circle" iconSize={8} />
                <Line
                  type="monotoneX"
                  dataKey={selectedPftMetric}
                  stroke={selectedPftMetricConfig.color}
                  strokeWidth={2.8}
                  dot={{ r: 3.5, fill: selectedPftMetricConfig.color, strokeWidth: 1.5, stroke: "#ffffff" }}
                  activeDot={{ r: 6.5, fill: selectedPftMetricConfig.color, stroke: "#ffffff", strokeWidth: 2 }}
                  name={selectedPftMetricConfig.label}
                  connectNulls
                  isAnimationActive
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartBlock>
      </section>

      {/* Daily Longitudinal Trends Section */}
      <section>
        <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Daily Longitudinal Vitals &amp; Symptoms · दैनिक लक्षण एवं वाइटल्स
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <ChartBlock title="SpO2 Trends · ऑक्सीजन ट्रेंड" subtitle="Resting and after-walking oxygen saturation · आराम और चलने के बाद ऑक्सीजन">
            <MetricLineChart
              data={dailySeries}
              yDomain={[70, 100]}
              lines={[
                { key: "spo2Rest", name: "Resting SpO2", color: COLORS.blue },
                { key: "spo2Walk", name: "After Walking SpO2", color: COLORS.teal },
              ]}
            />
          </ChartBlock>

          <ChartBlock title="Heart Rate Trends · हृदय गति ट्रेंड" subtitle="Pulse or heart rate readings when logged · दर्ज की गई नाड़ी/हार्ट रेट">
            <MetricLineChart data={dailySeries} lines={[{ key: "heartRate", name: "Heart Rate", color: COLORS.purple }]} />
          </ChartBlock>

          {/* Color-Coded Symptoms Trends Chart Block */}
          <ChartBlock
            title="Symptoms Trends · लक्षण ट्रेंड"
            subtitle="Select from patient-reported symptoms (color-coded for easy identification) · लक्षण चुनें"
          >
            {symptomKeys.length === 0 ? (
              <EmptyChart label="No symptom scores recorded yet." />
            ) : (
              <>
                {/* 1. Patient Reported Symptoms Pill Selector */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>
                      Patient Reported Symptoms ({reportedSymptomKeys.length})
                    </span>
                    {otherSymptomKeys.length > 0 && (
                      <select
                        value={otherSymptomKeys.includes(selectedSymptom) ? selectedSymptom : ""}
                        onChange={(e) => {
                          if (e.target.value) setSelectedSymptom(e.target.value);
                        }}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#475569",
                          cursor: "pointer",
                        }}
                      >
                        <option value="">+ Other Symptoms ({otherSymptomKeys.length})</option>
                        {otherSymptomKeys.map((k) => (
                          <option key={k} value={k}>{formatMetricName(k)}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {reportedSymptomKeys.map((key) => {
                      const sc = getSymptomColor(key);
                      const isSelected = selectedSymptom === key;
                      const stat = reportedSymptomStats[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedSymptom(key)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 11px",
                            borderRadius: 999,
                            border: `1.5px solid ${isSelected ? sc.color : sc.border}`,
                            background: isSelected ? sc.activeBg : sc.bg,
                            color: isSelected ? "#ffffff" : sc.color,
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: isSelected ? `0 2px 8px ${sc.color}40` : "none",
                            transition: "all 120ms ease",
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: isSelected ? "#ffffff" : sc.color,
                              flexShrink: 0,
                            }}
                          />
                          <span>{formatMetricName(key)}</span>
                          {stat && stat.daysReported > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "1px 5px",
                                borderRadius: 999,
                                background: isSelected ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)",
                                color: isSelected ? "#ffffff" : sc.color,
                              }}
                            >
                              {stat.daysReported}d
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Active Symptom Stat Highlight Banner */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: activeSymptomColor.bg,
                    border: `1px solid ${activeSymptomColor.border}`,
                    marginBottom: 10,
                    fontSize: 11.5,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: activeSymptomColor.color }} />
                    <span style={{ fontWeight: 800, color: activeSymptomColor.color }}>
                      {formatMetricName(selectedSymptom)}
                    </span>
                    {selectedSymptomIsMmrc && (
                      <span style={{ fontSize: 10, color: activeSymptomColor.color, opacity: 0.8 }}>(0–4 Grade)</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: activeSymptomColor.color, fontWeight: 700 }}>
                      Reported: {selectedSymptomSeries.filter((r) => (r.value ?? 0) > 0).length} days
                    </span>
                    <span style={{ color: "#059669", fontWeight: 700 }}>
                      Absent (0): {selectedSymptomSeries.filter((r) => r.value === 0).length} days
                    </span>
                  </div>
                </div>

                {/* 3. Dynamic Chart with Matching Symptom Color */}
                {selectedSymptomSeries.every((row) => row.value === null) ? (
                  <EmptyChart label="No values recorded for this symptom yet." />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={selectedSymptomSeries} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                      <defs>
                        <linearGradient id={`grad-sym-${selectedSymptom}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeSymptomColor.color} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={activeSymptomColor.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.2)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: "#94a3b8" }} tickMargin={10} minTickGap={20} axisLine={{ stroke: "rgba(148,163,184,0.25)" }} tickLine={false} />
                      <YAxis domain={selectedSymptomDomain} ticks={selectedSymptomIsMmrc ? [0, 1, 2, 3, 4] : [0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10.5, fill: "#94a3b8" }} width={34} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(148,163,184,0.3)", strokeWidth: 1, strokeDasharray: "4 2" }} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 10, color: "#475569" }} iconType="circle" iconSize={8} />
                      <Line
                        type="monotoneX"
                        dataKey="value"
                        name={formatMetricName(selectedSymptom)}
                        stroke={activeSymptomColor.color}
                        strokeWidth={2.8}
                        dot={({ cx, cy, payload }: any) => {
                          if (cx == null || cy == null || payload?.value == null) return null;
                          const isPresent = Number(payload.value) > 0;
                          return (
                            <circle
                              key={`dot-${cx}-${cy}`}
                              cx={cx}
                              cy={cy}
                              r={isPresent ? 5.5 : 3.5}
                              fill={isPresent ? activeSymptomColor.color : "#10b981"}
                              stroke="#ffffff"
                              strokeWidth={1.8}
                            />
                          );
                        }}
                        activeDot={{ r: 7.5, fill: activeSymptomColor.color, stroke: "#ffffff", strokeWidth: 2 }}
                        connectNulls
                        isAnimationActive
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </ChartBlock>

          <ChartBlock title="Medication Adherence · दवा अनुपालन" subtitle="Overall adherence % per day, and per-medication taken/not taken detail below. · प्रतिदिन दवा लेने का प्रतिशत">
            <MetricLineChart
              data={dailySeries}
              yDomain={[0, 100]}
              yTicks={[0, 25, 50, 75, 100]}
              yTickFormatter={(v) => `${v}%`}
              tooltipFormatter={(v) => [`${typeof v === "number" ? v : Number(v)}%`, "Adherence"]}
              lines={[{ key: "adherence", name: "Adherence %", color: COLORS.green }]}
            />
            <div style={{ marginTop: 14 }}>
              <MedicationAdherenceTable logs={logs} meds={meds} />
            </div>
          </ChartBlock>

          <ChartBlock title="AQI Trends · वायु गुणवत्ता ट्रेंड" subtitle="Air quality exposure on logged days · लॉग वाले दिनों की वायु गुणवत्ता">
            <MetricLineChart data={dailySeries} lines={[{ key: "aqi", name: "AQI", color: COLORS.gold }]} />
          </ChartBlock>
        </div>
      </section>

      <section>
        <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Disease-Specific Analytics · रोग-विशिष्ट विश्लेषण: {diagnosisLabel(diseaseKind)}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {diseaseCharts[diseaseKind] ?? (
            <ChartBlock title="Disease-Specific Analytics · रोग-विशिष्ट विश्लेषण" subtitle="Diagnosis-specific graphs appear after disease-specific logs are available. · रोग-विशिष्ट लॉग के बाद चार्ट दिखेंगे।">
              <EmptyChart label="No disease-specific chart for this diagnosis yet. · अभी इस निदान का चार्ट नहीं है।" />
            </ChartBlock>
          )}
        </div>
      </section>

      {/* Historical Data Table with Color-Coded Symptoms */}
      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Historical Clinical Logs</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>Detailed chronological log records with color-coded symptom tags</p>
          </div>
          <span style={{ fontSize: 11, color: "#0284c7", fontWeight: 700, background: "#f0f9ff", border: "1px solid #bae6fd", padding: "4px 10px", borderRadius: 999 }}>
            {dailySeries.length} Logged Entries
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                {["Date", "SpO2 Rest", "SpO2 Walk", "Heart Rate", "mMRC", "Reported Symptoms", "AQI", "Adherence"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "10px 12px", color: "#475569", fontWeight: 700, fontSize: 11.5 }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...dailySeries].reverse().map((row) => {
                const reportedSymptoms = Object.entries(row.symptoms).filter(([_, val]) => typeof val === "number" && val > 0);
                return (
                  <tr key={row.sortDate} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>{row.date}</td>
                    <td style={{ padding: "10px 12px", color: row.spo2Rest && row.spo2Rest < 90 ? "#dc2626" : "#0f172a", fontWeight: 600 }}>
                      {row.spo2Rest ? `${row.spo2Rest}%` : "--"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{row.spo2Walk ? `${row.spo2Walk}%` : "--"}</td>
                    <td style={{ padding: "10px 12px" }}>{row.heartRate ? `${row.heartRate} bpm` : "--"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {row.mmrc !== null ? (
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: row.mmrc >= 3 ? "#fee2e2" : "#f1f5f9",
                            color: row.mmrc >= 3 ? "#b91c1c" : "#334155",
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          Grade {row.mmrc}
                        </span>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {reportedSymptoms.length === 0 ? (
                        <span style={{ color: "#10b981", fontSize: 11, fontWeight: 600 }}>Normal / None</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {reportedSymptoms.map(([symKey, symVal]) => {
                            const sc = getSymptomColor(symKey);
                            return (
                              <span
                                key={symKey}
                                style={{
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                  background: sc.bg,
                                  border: `1px solid ${sc.border}`,
                                  color: sc.color,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                }}
                              >
                                {formatMetricName(symKey)}: {symVal}/10
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{row.aqi ?? "--"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {row.adherence !== null ? (
                        <span style={{ color: row.adherence >= 80 ? "#059669" : row.adherence >= 50 ? "#d97706" : "#dc2626", fontWeight: 700 }}>
                          {row.adherence}%
                        </span>
                      ) : (
                        "--"
                      )}
                    </td>
                  </tr>
                );
              })}
              {dailySeries.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 16, color: "#888680", textAlign: "center" }}>No logged analytics history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
