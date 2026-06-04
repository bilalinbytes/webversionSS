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
  symptom: number | null;
  aqi: number | null;
  adherence: number | null;
  asthmaControl: number | null;
  rescuePuffs: number | null;
  energy: number | null;
  chestHeaviness: number | null;
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
}

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

const COLORS = {
  teal: "#126969",
  green: "#0f6e56",
  blue: "#3867b7",
  orange: "#d85a30",
  red: "#c94d49",
  purple: "#6f4eb2",
  gold: "#8a6f2a",
};

const PFT_METRICS = [
  { key: "ratio", label: "FEV1/FVC (%)", color: COLORS.blue },
  { key: "fev1PctPred", label: "FEV1 (% Predicted)", color: COLORS.teal },
  { key: "fev1", label: "FEV1 (Liters)", color: COLORS.teal },
  { key: "fvcPctPred", label: "FVC (% Predicted)", color: COLORS.orange },
  { key: "fvc", label: "FVC (Liters)", color: COLORS.orange },
  { key: "dlco", label: "DLCO (% Predicted)", color: COLORS.purple },
  { key: "sixMwd", label: "6MWD (m)", color: COLORS.green },
  { key: "minSpo2", label: "Min SpO2", color: COLORS.red },
  { key: "maxSpo2", label: "Max SpO2", color: COLORS.blue },
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
  const value = `${dashboard ?? ""} ${primary ?? ""}`.toLowerCase();
  if (value.includes("bronch")) return "bronchiectasis";
  if (value.includes("asthma") && !value.includes("copd")) return "asthma";
  if (value.includes("copd")) return "copd";
  if (value.includes("ild") || value.includes("interstitial")) return "ild";
  if (value.includes("post_icu") || value.includes("post icu")) return "post_icu";
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

function formatMetricName(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function adherencePercent(compliance: Record<string, unknown> | null): number | null {
  if (!compliance) return null;
  const values = Object.values(compliance).filter((value) => typeof value === "boolean");
  if (values.length === 0) return null;
  const taken = values.filter(Boolean).length;
  return Math.round((taken / values.length) * 100);
}

function asthmaControlScore(data: Record<string, unknown> | null): number | null {
  const direct = numberFromAny(data, ["asthma_control", "asthma_control_score", "act_score"]);
  if (direct !== null) return direct;
  const responses = data?.asthma_control_responses;
  if (Array.isArray(responses)) {
    return responses.filter(Boolean).length;
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
    <section style={{ border: "1px solid #e2ded6", borderRadius: 8, background: "#fff", padding: 16, minHeight: 310, boxShadow: "0 8px 22px rgba(19, 45, 54, 0.05)" }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#132d36" }}>{title}</p>
      {subtitle && <p style={{ margin: "4px 0 12px", fontSize: 12, lineHeight: 1.45, color: "#66615a" }}>{subtitle}</p>}
      {children}
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div style={{ height: 230, display: "grid", placeItems: "center", color: "#888680", fontSize: 13, background: "#fbfaf7", borderRadius: 8 }}>
      {label}
    </div>
  );
}

function MetricLineChart({
  data,
  lines,
  yDomain,
}: {
  data: AnalyticsPoint[];
  lines: Array<{ key: keyof AnalyticsPoint; name: string; color: string }>;
  yDomain?: [number, number];
}) {
  if (!hasData(data, lines.map((line) => line.key))) {
    return <EmptyChart label="No historical readings yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 12, right: 18, bottom: 6, left: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6f6a62" }} tickMargin={8} minTickGap={14} />
        <YAxis domain={yDomain} tick={{ fontSize: 11, fill: "#6f6a62" }} width={38} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2ded6", fontSize: 12 }} />
        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
        {lines.map((line) => (
          <Line
            key={String(line.key)}
            type="monotone"
            dataKey={line.key as string}
            stroke={line.color}
            strokeWidth={2.6}
            dot={{ r: 3, strokeWidth: 1.5 }}
            activeDot={{ r: 5 }}
            name={line.name}
            connectNulls
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
        const kbildResponses = (disease?.kbild_responses ?? {}) as Record<string, unknown>;
        const symptoms = extractSymptoms(log.vas_symptoms);
        return {
          date: fmtDate(log.logged_at),
          sortDate: log.logged_at,
          spo2Rest: log.spo2_rest,
          spo2Walk: log.spo2_exertion,
          heartRate: numberFromAny(disease, ["heart_rate", "heartRate", "pulse_rate", "pulse"]),
          symptom: extractSymptom(log.vas_symptoms, log.mmrc_today),
          aqi: log.aqi_value,
          adherence: adherencePercent(log.medication_compliance),
          asthmaControl: asthmaControlScore(disease),
          rescuePuffs: numberFromAny(disease, ["rescue_inhaler_puffs", "rescue_puff_usage", "rescue_puffs"]),
          energy: numberFromAny(disease, ["energy_level", "energy"]),
          chestHeaviness: numberFromAny(log.vas_symptoms, ["chest_heaviness", "chestHeaviness"]) ?? numberFromAny(disease, ["chest_heaviness", "chestHeaviness"]),
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
  const symptomKeys = useMemo(
    () => Array.from(new Set(dailySeries.flatMap((row) => Object.keys(row.symptoms)))).sort(),
    [dailySeries],
  );
  const selectedSymptomSeries = useMemo(
    () => dailySeries.map((row) => ({
      date: row.date,
      sortDate: row.sortDate,
      value: selectedSymptom ? row.symptoms[selectedSymptom] ?? null : null,
    })),
    [dailySeries, selectedSymptom],
  );

  useEffect(() => {
    if (symptomKeys.length === 0) {
      setSelectedSymptom("");
      return;
    }
    if (!selectedSymptom || !symptomKeys.includes(selectedSymptom)) {
      setSelectedSymptom(symptomKeys[0] ?? "");
    }
  }, [selectedSymptom, symptomKeys]);

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
        <ChartBlock title="Asthma Control · अस्थमा नियंत्रण" subtitle="Daily asthma control response score · दैनिक अस्थमा नियंत्रण स्कोर">
          <MetricLineChart data={dailySeries} yDomain={[0, 4]} lines={[{ key: "asthmaControl", name: "Asthma Control", color: COLORS.green }]} />
        </ChartBlock>
        <ChartBlock title="Rescue Puff Usage · रेस्क्यू पफ उपयोग" subtitle="Reliever or rescue inhaler puffs per day · प्रतिदिन रेस्क्यू इनहेलर पफ">
          <MetricLineChart data={dailySeries} lines={[{ key: "rescuePuffs", name: "Rescue Puffs", color: COLORS.orange }]} />
        </ChartBlock>
      </>
    ),
    copd: (
      <>
        <ChartBlock title="Energy Levels · ऊर्जा स्तर" subtitle="Patient-reported energy score · मरीज द्वारा बताया ऊर्जा स्कोर">
          <MetricLineChart data={dailySeries} yDomain={[0, 10]} lines={[{ key: "energy", name: "Energy", color: COLORS.green }]} />
        </ChartBlock>
        <ChartBlock title="Chest Heaviness · छाती में भारीपन" subtitle="VAS chest heaviness trend · छाती भारीपन का ट्रेंड">
          <MetricLineChart data={dailySeries} yDomain={[0, 10]} lines={[{ key: "chestHeaviness", name: "Chest Heaviness", color: COLORS.red }]} />
        </ChartBlock>
      </>
    ),
    ild: (
      <ChartBlock title="KBILD Trends · K-BILD ट्रेंड" subtitle="Total score and individual question scores · कुल और प्रश्न अनुसार स्कोर">
        <select
          value={String(selectedKbildMetric)}
          onChange={(event) => setSelectedKbildMetric(event.target.value as keyof AnalyticsPoint)}
          style={{ width: "100%", marginBottom: 10, border: "1px solid #d8d2c8", borderRadius: 8, padding: "8px 10px", fontSize: 12, background: "#fff" }}
        >
          {KBILD_METRICS.map((metric) => (
            <option key={String(metric.key)} value={String(metric.key)}>{metric.label}</option>
          ))}
        </select>
        <MetricLineChart
          data={dailySeries}
          yDomain={selectedKbildMetric === "kbild" ? [0, 100] : [1, 7]}
          lines={[{ key: selectedKbildMetric, name: KBILD_METRICS.find((metric) => metric.key === selectedKbildMetric)?.label ?? "K-BILD", color: COLORS.purple }]}
        />
      </ChartBlock>
    ),
    bronchiectasis: (
      <>
        <ChartBlock title="Hemoptysis · खून की खांसी" subtitle="Blood in sputum or hemoptysis score · बलगम/खांसी में खून का स्कोर">
          <MetricLineChart data={dailySeries} yDomain={[0, 10]} lines={[{ key: "hemoptysis", name: "Hemoptysis", color: COLORS.red }]} />
        </ChartBlock>
        <ChartBlock title="Ease of Sputum Clearance · बलगम निकालने में आसानी" subtitle="Higher score means easier clearance · अधिक स्कोर का मतलब अधिक आसानी">
          <MetricLineChart data={dailySeries} yDomain={[0, 10]} lines={[{ key: "sputumClearance", name: "Sputum Clearance", color: COLORS.blue }]} />
        </ChartBlock>
      </>
    ),
    post_icu: postIcuDiseaseCharts,
    unknown: null,
  } satisfies Record<DiagnosisKind, React.ReactNode>;

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: "#132d36" }}>
            Patient Analytics · मरीज विश्लेषण{patientName ? `: ${patientName}` : ""}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6d8794" }}>
            Patient-wise respiratory monitoring with common and disease-specific historical charts. · सामान्य और रोग-विशिष्ट पुराने चार्ट।
          </p>
        </div>
        {viewer === "doctor" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void handleExport("single")}
              disabled={exporting !== null}
              style={{ border: "1px solid #126969", background: "#fff", color: "#126969", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              {exporting === "single" ? "Exporting..." : "Export Single Patient"}
            </button>
            <button
              type="button"
              onClick={() => void handleExport("all")}
              disabled={exporting !== null}
              style={{ border: 0, background: "#126969", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              {exporting === "all" ? "Exporting..." : "Export All Patients"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ border: "1px solid #f0b5b2", borderRadius: 8, background: "#fff6f5", color: "#c94d49", padding: "10px 12px", fontSize: 12 }}>
          {error}
        </div>
      )}

      <section>
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#132d36" }}>Common Analytics · सामान्य विश्लेषण</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          <ChartBlock title="PFT Trends · PFT ट्रेंड" subtitle="Choose any PFT field captured during registration · रजिस्ट्रेशन में भरा PFT फील्ड चुनें">
            {pftSeries.length === 0 ? (
              <EmptyChart label="No PFT records yet. · अभी PFT रिकॉर्ड नहीं है।" />
            ) : (
              <>
                <select
                  value={selectedPftMetric}
                  onChange={(event) => setSelectedPftMetric(event.target.value as PftMetricKey)}
                  style={{ width: "100%", marginBottom: 10, border: "1px solid #d8d2c8", borderRadius: 8, padding: "8px 10px", fontSize: 12, background: "#fff" }}
                >
                  {PFT_METRICS.map((metric) => (
                    <option key={metric.key} value={metric.key}>{metric.label}</option>
                  ))}
                </select>
                {!pftSeries.some((row) => row[selectedPftMetric] !== null) ? (
                  <EmptyChart label="No values recorded for this PFT field yet. · इस PFT फील्ड का रिकॉर्ड नहीं है।" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={pftSeries} margin={{ top: 12, right: 18, bottom: 6, left: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6f6a62" }} tickMargin={8} minTickGap={14} />
                      <YAxis tick={{ fontSize: 11, fill: "#6f6a62" }} width={38} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2ded6", fontSize: 12 }} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                      <Line type="monotone" dataKey={selectedPftMetric} stroke={selectedPftMetricConfig.color} strokeWidth={2.6} dot={{ r: 3, strokeWidth: 1.5 }} activeDot={{ r: 5 }} name={selectedPftMetricConfig.label} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </ChartBlock>

          <ChartBlock title="SpO2 Trends · ऑक्सीजन ट्रेंड" subtitle="Resting and after-walking oxygen saturation · आराम और चलने के बाद ऑक्सीजन">
            <MetricLineChart
              data={dailySeries}
              yDomain={[70, 100]}
              lines={[
                { key: "spo2Rest", name: "Resting SpO2", color: COLORS.red },
                { key: "spo2Walk", name: "After Walking SpO2", color: COLORS.blue },
              ]}
            />
          </ChartBlock>

          <ChartBlock title="Heart Rate Trends · हृदय गति ट्रेंड" subtitle="Pulse or heart rate readings when logged · दर्ज की गई नाड़ी/हार्ट रेट">
            <MetricLineChart data={dailySeries} lines={[{ key: "heartRate", name: "Heart Rate", color: COLORS.purple }]} />
          </ChartBlock>

          <ChartBlock title="Symptoms Trends · लक्षण ट्रेंड" subtitle="VAS and mMRC symptom score only, side effects excluded · केवल लक्षण स्कोर, साइड इफेक्ट नहीं">
            {symptomKeys.length === 0 ? (
              <EmptyChart label="No symptom scores recorded yet." />
            ) : (
              <>
                <select
                  value={selectedSymptom}
                  onChange={(event) => setSelectedSymptom(event.target.value)}
                  style={{ width: "100%", marginBottom: 10, border: "1px solid #d8d2c8", borderRadius: 8, padding: "8px 10px", fontSize: 12, background: "#fff" }}
                >
                  {symptomKeys.map((symptom) => (
                    <option key={symptom} value={symptom}>{formatMetricName(symptom)}</option>
                  ))}
                </select>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={selectedSymptomSeries} margin={{ top: 12, right: 18, bottom: 6, left: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6f6a62" }} tickMargin={8} minTickGap={14} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#6f6a62" }} width={38} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2ded6", fontSize: 12 }} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                    <Line type="monotone" dataKey="value" stroke={COLORS.orange} strokeWidth={2.6} dot={{ r: 3, strokeWidth: 1.5 }} activeDot={{ r: 5 }} name={formatMetricName(selectedSymptom)} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </ChartBlock>

          <ChartBlock title="Medication Adherence Trends · दवा पालन ट्रेंड" subtitle="Daily percentage of marked medicines taken · रोज ली गई दवाओं का प्रतिशत">
            <MetricLineChart data={dailySeries} yDomain={[0, 100]} lines={[{ key: "adherence", name: "Adherence %", color: COLORS.green }]} />
          </ChartBlock>

          <ChartBlock title="AQI Trends · वायु गुणवत्ता ट्रेंड" subtitle="Air quality exposure on logged days · लॉग वाले दिनों की वायु गुणवत्ता">
            <MetricLineChart data={dailySeries} lines={[{ key: "aqi", name: "AQI", color: COLORS.gold }]} />
          </ChartBlock>
        </div>
      </section>

      <section>
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#132d36" }}>
          Disease-Specific Analytics · रोग-विशिष्ट विश्लेषण: {diagnosisLabel(diseaseKind)}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {diseaseCharts[diseaseKind] ?? (
            <ChartBlock title="Disease-Specific Analytics · रोग-विशिष्ट विश्लेषण" subtitle="Diagnosis-specific graphs appear after disease-specific logs are available. · रोग-विशिष्ट लॉग के बाद चार्ट दिखेंगे।">
              <EmptyChart label="No disease-specific chart for this diagnosis yet. · अभी इस निदान का चार्ट नहीं है।" />
            </ChartBlock>
          )}
        </div>
      </section>

      <section style={{ border: "1px solid #e7e1d8", borderRadius: 8, background: "#fff", padding: 14 }}>
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#132d36" }}>Historical Data</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Date", "SpO2 Rest", "SpO2 Walk", "Heart Rate", "Symptoms", "AQI", "Adherence"].map((header) => (
                  <th key={header} style={{ textAlign: "left", padding: "8px 10px", color: "#77736b" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...dailySeries].reverse().map((row) => (
                <tr key={row.sortDate} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: "8px 10px" }}>{row.date}</td>
                  <td style={{ padding: "8px 10px" }}>{row.spo2Rest ?? "--"}</td>
                  <td style={{ padding: "8px 10px" }}>{row.spo2Walk ?? "--"}</td>
                  <td style={{ padding: "8px 10px" }}>{row.heartRate ?? "--"}</td>
                  <td style={{ padding: "8px 10px" }}>{row.symptom ?? "--"}</td>
                  <td style={{ padding: "8px 10px" }}>{row.aqi ?? "--"}</td>
                  <td style={{ padding: "8px 10px" }}>{row.adherence !== null ? `${row.adherence}%` : "--"}</td>
                </tr>
              ))}
              {dailySeries.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: "#888680", textAlign: "center" }}>No logged analytics history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ border: "1px solid #e7e1d8", borderRadius: 8, background: "#fff", padding: 14 }}>
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#132d36" }}>Medication Tracking</p>
        {meds.length === 0 ? (
          <p style={{ color: "#888680", fontSize: 13 }}>No medications on record.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {meds.map((med) => (
              <div key={med.id} style={{ border: "1px solid rgba(0,0,0,0.07)", borderRadius: 8, padding: 10 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#132d36" }}>{med.drug_name}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6d8794" }}>
                  {med.route} {med.dose !== null ? `- ${med.dose} ${med.dose_unit ?? ""}` : ""}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: med.end_date ? "#c94d49" : "#0f6e56" }}>
                  {med.end_date ? `Ended ${fmtDate(med.end_date)}` : `Active since ${fmtDate(med.start_date)}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
