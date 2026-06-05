"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { PatientAnalyticsView } from "@/components/patient/PatientAnalyticsView";
import styles from "./PatientDetail.module.css";

// Legacy Patient type (used as optional fallback prop)
interface Patient {
  id: string;
  name: string;
  age?: number | string;
  gender?: string;
  condition?: string;
  score?: number;
  spo2?: number;
  mmrc?: number;
  aqi?: number;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PatientDetailProps {
  patient?: Patient;
  patientId?: string;
  initialTab?: string;
  onClose: () => void;
  onEdit?: () => void;
  onExport?: () => void;
}

interface PatientInfo {
  id: string;
  name: string;
  mobile_number: string;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  date_of_birth: string;
  gender: string | null;
}

interface DiagnosisInfo {
  primary_diagnosis: string;
  diagnosed_at: string | null;
  comorbidities: string[] | null;
  comorbidities_other_text: string | null;
  effective_dashboard: string;
}

interface RespSupportInfo {
  ltot_enabled: boolean | null;
  ltot_litres: number | null;
  bipap_enabled: boolean | null;
  bipap_ipap: number | null;
  bipap_epap: number | null;
}

interface DailyLogInfo {
  spo2_rest: number | null;
  mmrc_today: number | null;
  aqi_value: number | null;
  medication_compliance: Record<string, boolean> | null;
  logged_at: string;
}

interface InstructionInfo {
  id: string;
  instruction_text: string;
  created_at: string | null;
}

interface MedicationInfo {
  id: string;
  drug_name: string;
  route: string;
  dose: number | null;
  dose_unit: string | null;
  frequency: string | null;
  start_date: string;
  end_date: string | null;
  serial_number: number | null;
}

interface PftInfo {
  id: string;
  test_date: string;
  fvc: number | null;
  fev1: number | null;
  fev1_fvc_ratio: number | null;
  dlco: number | null;
  other_fields: Record<string, unknown> | null;
}

interface TrendPoint {
  date: string;
  spo2: number | null;
  mmrc: number | null;
  vas: number | null;
}

interface HistoryEvent {
  id: string;
  date: string;
  type: "patient_log" | "doctor_instruction" | "prescription";
  title: string;
  detail: string;
  meta?: string;
}

const TABS = ["Overview", "Analytics", "Treatment Folder", "History"];

// ── Helper: compute age ───────────────────────────────────────────────────────
function computeAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

// ── Helper: format date ───────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Main component ────────────────────────────────────────────────────────────
function formatComorbidities(comorbidities: unknown, otherText: string | null | undefined): string {
  const parseString = (value: string): string[] => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      // Legacy rows may store comma-separated co-morbidities.
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  };

  const list = Array.isArray(comorbidities)
    ? comorbidities.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : typeof comorbidities === "string"
      ? parseString(comorbidities)
      : [];

  return list
    .map((item) => item === "Others" && otherText ? otherText : item)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

export function PatientDetail({
  patient: legacyPatient,
  patientId: propPatientId,
  initialTab = "Overview",
  onClose,
  onEdit,
  onExport,
}: PatientDetailProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Resolve the patient ID — prefer explicit prop, fall back to legacy patient id
  const resolvedId = propPatientId ?? legacyPatient?.id;

  // ── Data state ──────────────────────────────────────────────────────────────
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisInfo | null>(null);
  const [respSupport, setRespSupport] = useState<RespSupportInfo | null>(null);
  const [latestLog, setLatestLog] = useState<DailyLogInfo | null>(null);
  const [instructions, setInstructions] = useState<InstructionInfo[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInstruction, setNewInstruction] = useState("");
  const [savingInstruction, setSavingInstruction] = useState(false);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!resolvedId) { setLoading(false); return; }
    const supabase = createClient();
    setLoading(true);

    const [
      patientRes,
      diagRes,
      rsRes,
      logRes,
      instrRes,
      historyMedRes,
      trendRes,
      historyLogRes,
    ] = await Promise.all([
      supabase.from("patients").select("id,name,mobile_number,address,emergency_contact_name,emergency_contact_phone,date_of_birth,gender").eq("id", resolvedId).single(),
      supabase.from("patient_diagnoses").select("primary_diagnosis,diagnosed_at,comorbidities,comorbidities_other_text,effective_dashboard").eq("patient_id", resolvedId).order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("respiratory_support").select("ltot_enabled,ltot_litres,bipap_enabled,bipap_ipap,bipap_epap").eq("patient_id", resolvedId).single(),
      supabase.from("daily_logs").select("spo2_rest,mmrc_today,aqi_value,medication_compliance,logged_at").eq("patient_id", resolvedId).order("logged_at", { ascending: false }).limit(1).single(),
      supabase.from("doctor_instructions").select("id,instruction_text,created_at").eq("patient_id", resolvedId).order("created_at", { ascending: false }),
      supabase.from("medications").select("id,drug_name,route,dose,dose_unit,frequency,start_date,end_date,serial_number").eq("patient_id", resolvedId).order("start_date", { ascending: false }).order("serial_number", { ascending: true }),
      supabase.from("daily_logs").select("logged_at,spo2_rest,mmrc_today,vas_symptoms").eq("patient_id", resolvedId).order("logged_at", { ascending: false }).limit(30),
      supabase.from("daily_logs").select("id,logged_at,spo2_rest,mmrc_today,aqi_value").eq("patient_id", resolvedId).order("logged_at", { ascending: false }).limit(30),
    ]);

    if (patientRes.data) {
      setPatientInfo(patientRes.data as PatientInfo);
    } else {
      const response = await fetch(`/api/patients?id=${resolvedId}`, { credentials: "include" });
      const body = await response.json().catch(() => null) as {
        formData?: {
          name?: string;
          age?: string;
          gender?: string;
          mobile_number?: string;
          emergency_contact_name?: string;
          emergency_contact_phone?: string;
          primary_diagnosis?: string;
          disease_category?: string;
          comorbidities?: string[];
        };
      } | null;
      const form = body?.formData;
      if (form) {
        const age = Number(form.age);
        const estimatedDob = Number.isFinite(age) && age > 0
          ? `${new Date().getFullYear() - age}-01-01`
          : "";
        setPatientInfo({
          id: resolvedId,
          name: form.name ?? "—",
          mobile_number: form.mobile_number ? `+91${form.mobile_number}` : "",
          address: null,
          emergency_contact_name: form.emergency_contact_name ?? null,
          emergency_contact_phone: form.emergency_contact_phone ?? null,
          date_of_birth: estimatedDob,
          gender: form.gender ?? null,
        });
        if (!diagRes.data) {
          setDiagnosis({
            primary_diagnosis: form.disease_category || form.primary_diagnosis || "—",
            diagnosed_at: null,
            comorbidities: form.comorbidities ?? null,
            comorbidities_other_text: null,
            effective_dashboard: "",
          });
        }
      }
    }
    if (diagRes.data) {
      const d = diagRes.data;
      setDiagnosis({
        primary_diagnosis: d.primary_diagnosis,
        diagnosed_at: d.diagnosed_at,
        comorbidities: Array.isArray(d.comorbidities) ? (d.comorbidities as string[]) : null,
        comorbidities_other_text: d.comorbidities_other_text,
        effective_dashboard: d.effective_dashboard,
      });
    }
    if (rsRes.data) setRespSupport(rsRes.data as RespSupportInfo);
    if (logRes.data) {
      const l = logRes.data;
      setLatestLog({
        spo2_rest: l.spo2_rest,
        mmrc_today: l.mmrc_today,
        aqi_value: l.aqi_value,
        medication_compliance: l.medication_compliance as Record<string, boolean> | null,
        logged_at: l.logged_at,
      });
    }
    if (instrRes.data) setInstructions(instrRes.data as InstructionInfo[]);
    if (trendRes.data) {
      const points: TrendPoint[] = trendRes.data.map((row) => {
        const vas = row.vas_symptoms as Record<string, number> | null;
        const vasVal = vas ? (vas["overall"] ?? Object.values(vas)[0] ?? null) : null;
        return {
          date: new Date(row.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          spo2: row.spo2_rest,
          mmrc: row.mmrc_today,
          vas: vasVal ?? null,
        };
      }).reverse();
      setTrendData(points);
    }

    const instructionEvents: HistoryEvent[] = (instrRes.data ?? []).map((instruction) => ({
      id: `instruction-${instruction.id}`,
      date: instruction.created_at ?? "",
      type: "doctor_instruction",
      title: "Doctor instruction updated",
      detail: instruction.instruction_text,
      meta: instruction.created_at ? fmtDate(instruction.created_at) : undefined,
    }));

    const medsByDate = new Map<string, Array<MedicationInfo>>();
    for (const med of (historyMedRes.data ?? []) as MedicationInfo[]) {
      const key = med.start_date;
      medsByDate.set(key, [...(medsByDate.get(key) ?? []), med]);
    }
    const prescriptionEvents: HistoryEvent[] = Array.from(medsByDate.entries()).map(([date, meds]) => ({
      id: `prescription-${date}`,
      date,
      type: "prescription",
      title: "Treatment folder updated",
      detail: meds
        .map((med) => {
          const dose = med.dose !== null ? ` ${med.dose} ${med.dose_unit ?? ""}` : "";
          const frequency = med.frequency ? `, ${med.frequency}` : "";
          return `${med.drug_name}${dose} (${med.route}${frequency})`;
        })
        .join("; "),
      meta: `${meds.length} medication${meds.length !== 1 ? "s" : ""}`,
    }));

    const patientLogEvents: HistoryEvent[] = (historyLogRes.data ?? []).map((log) => ({
      id: `log-${log.id}`,
      date: log.logged_at,
      type: "patient_log",
      title: "Patient daily log submitted",
      detail: [
        typeof log.spo2_rest === "number" ? `SpO2 ${log.spo2_rest}%` : null,
        typeof log.mmrc_today === "number" ? `mMRC ${log.mmrc_today}` : null,
        typeof log.aqi_value === "number" ? `AQI ${log.aqi_value}` : null,
      ].filter(Boolean).join(" · ") || "Daily health log updated",
      meta: fmtDate(log.logged_at),
    }));

    setHistoryEvents([...instructionEvents, ...prescriptionEvents, ...patientLogEvents]
      .filter((event) => event.date)
      .sort((left, right) => right.date.localeCompare(left.date)));

    setLoading(false);
  }, [resolvedId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // ── Submit instruction ──────────────────────────────────────────────────────
  const submitInstruction = async () => {
    if (!newInstruction.trim() || !resolvedId) return;
    if (countWords(newInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT) return;
    setSavingInstruction(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("doctor_instructions")
      .insert({
        patient_id: resolvedId,
        doctor_id: user?.id ?? null,
        instruction_text: newInstruction.trim(),
      })
      .select("id,instruction_text,created_at")
      .single();
    if (!error && data) {
      setInstructions((prev) => [data as InstructionInfo, ...prev]);
      setNewInstruction("");
    }
    setSavingInstruction(false);
  };

  // ── Derived display values ──────────────────────────────────────────────────
  const displayName = patientInfo?.name ?? legacyPatient?.name ?? "—";
  const displayInitials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const displayAge = patientInfo?.date_of_birth ? computeAge(patientInfo.date_of_birth) : legacyPatient?.age ?? "—";
  const displayGender = patientInfo?.gender ?? (legacyPatient?.gender === "M" ? "Male" : legacyPatient?.gender === "F" ? "Female" : "—");
  const displayCondition = diagnosis?.primary_diagnosis ?? legacyPatient?.condition ?? "—";
  const displayComorbidities = formatComorbidities(
    diagnosis?.comorbidities,
    diagnosis?.comorbidities_other_text,
  );
  const displaySpo2 = latestLog?.spo2_rest ?? legacyPatient?.spo2 ?? null;
  const displayMmrc = latestLog?.mmrc_today ?? legacyPatient?.mmrc ?? null;
  const displayAqi = latestLog?.aqi_value ?? legacyPatient?.aqi ?? null;

  const ltotTag = respSupport?.ltot_enabled && respSupport.ltot_litres
    ? `LTOT ${respSupport.ltot_litres} L/min`
    : null;
  const bipapTag = respSupport?.bipap_enabled
    ? `BiPAP ${respSupport.bipap_ipap ?? ""}/${respSupport.bipap_epap ?? ""}`
    : null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={`Patient detail: ${displayName}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.avatar}>{displayInitials}</div>
          <div className={styles.headerInfo}>
            <p className={styles.patientName}>{displayName}</p>
            <p className={styles.patientSub}>{displayCondition}</p>
            <p className={styles.patientComorbidities}>
              Co-morbidities: {displayComorbidities || "None recorded"}
            </p>
            <p className={styles.patientSub}>Sex: {displayGender}</p>
            <p className={styles.patientSub}>Age: {displayAge}y</p>
            <div className={styles.tags}>
              {ltotTag && <span className={styles.tag}>{ltotTag}</span>}
              {bipapTag && <span className={styles.tag}>{bipapTag}</span>}
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading && (
            <div className={styles.tabPlaceholder}>
              <p>Loading patient data…</p>
            </div>
          )}

          {!loading && activeTab === "Overview" && (
            <OverviewTab
              displaySpo2={displaySpo2}
              displayMmrc={displayMmrc}
              displayAqi={displayAqi}
              latestLog={latestLog}
              instructions={instructions}
              newInstruction={newInstruction}
              savingInstruction={savingInstruction}
              onInstructionChange={setNewInstruction}
              onInstructionSubmit={submitInstruction}
              onClose={onClose}
              onEdit={onEdit}
              onExport={onExport}
            />
          )}

          {!loading && activeTab === "Analytics" && resolvedId && (
            <PatientAnalyticsView patientId={resolvedId} viewer="doctor" patientName={displayName} />
          )}

          {!loading && activeTab === "Treatment Folder" && (
            <TreatmentTab patientId={resolvedId ?? ""} />
          )}

          {!loading && activeTab === "History" && (
            <HistoryTab trendData={trendData} events={historyEvents} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({
  displaySpo2,
  displayMmrc,
  displayAqi,
  latestLog,
  instructions,
  newInstruction,
  savingInstruction,
  onInstructionChange,
  onInstructionSubmit,
  onClose,
  onEdit,
  onExport,
}: {
  displaySpo2: number | null;
  displayMmrc: number | null;
  displayAqi: number | string | null;
  latestLog: DailyLogInfo | null;
  instructions: InstructionInfo[];
  newInstruction: string;
  savingInstruction: boolean;
  onInstructionChange: (v: string) => void;
  onInstructionSubmit: () => void;
  onClose: () => void;
  onEdit?: () => void;
  onExport?: () => void;
}) {
  const compliance = latestLog?.medication_compliance ?? null;
  const complianceEntries = compliance ? Object.entries(compliance) : [];
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const latestInstruction = instructions[0];

  return (
    <>
      {/* Trend boxes */}
      <div className={styles.trendRow}>
        {[
          {
            label: "SpO₂ Rest",
            val: displaySpo2 !== null ? `${displaySpo2}%` : "—",
            change: displaySpo2 !== null && displaySpo2 < 93 ? "Below target" : "Normal range",
            warn: displaySpo2 !== null && displaySpo2 < 93,
          },
          {
            label: "Breathing (mMRC)",
            val: displayMmrc !== null ? String(displayMmrc) : "—",
            change: displayMmrc !== null && displayMmrc >= 3 ? "Severe breathlessness" : "Moderate or less",
            warn: displayMmrc !== null && displayMmrc >= 3,
          },
          {
            label: "Air Quality (AQI)",
            val: displayAqi !== null ? String(displayAqi) : "—",
            change: typeof displayAqi === "number" && displayAqi > 150 ? "Unhealthy" : "Acceptable",
            warn: typeof displayAqi === "number" && displayAqi > 150,
          },
        ].map((t) => (
          <div key={t.label} className={styles.trendBox}>
            <p className={styles.trendLbl}>{t.label}</p>
            <p className={`${styles.trendVal} ${t.warn ? styles.trendWarn : ""}`}>{t.val}</p>
            <p className={styles.trendChange}>{t.change}</p>
          </div>
        ))}
      </div>

      {/* Medication compliance */}
      {complianceEntries.length > 0 && (
        <>
          <p className={styles.medTitle}>Today&apos;s Medication Compliance</p>
          <div className={styles.medList}>
            {complianceEntries.map(([name, taken]) => (
              <div key={name} className={`${styles.medItem} ${taken ? styles.medTaken : styles.medMissed}`}>
                <div className={taken ? styles.medCheckDone : styles.medCheckEmpty}>
                  {taken ? "Taken" : ""}
                </div>
                <span className={taken ? styles.medNameTaken : styles.medName}>{name}</span>
                <span className={taken ? styles.medStatusTaken : styles.medStatus}>
                  {taken ? "TAKEN" : "NOT TAKEN → +1 to score"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Doctor Instructions */}
      <section className={styles.instructionPanel}>
        <div className={styles.instructionHeader}>
          <div>
            <p className={styles.instructionTitle}>Doctor Instructions</p>
            <p className={styles.instructionSub}>Patient-facing note with timestamped history</p>
          </div>
          {instructions.length > 0 && (
            <button
              type="button"
              className={styles.instructionToggle}
              onClick={() => setInstructionsOpen((open) => !open)}
              aria-expanded={instructionsOpen}
            >
              {instructionsOpen ? "Hide" : "View"} previous notes ({instructions.length})
            </button>
          )}
        </div>

        <div className={styles.instructionComposer}>
          <textarea
            className={styles.instructionTextarea}
            placeholder="Write a clear instruction for the patient..."
            value={newInstruction}
            onChange={(e) => onInstructionChange(e.target.value)}
          />
          <p style={{ margin: 0, fontSize: 11, color: countWords(newInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT ? "#c94d49" : "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            {countWords(newInstruction)}/{PATIENT_INSTRUCTION_WORD_LIMIT} words
          </p>
          <button
            type="button"
            className={styles.instructionSubmit}
            onClick={onInstructionSubmit}
            disabled={savingInstruction || !newInstruction.trim() || countWords(newInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT}
          >
            {savingInstruction ? "Saving..." : "Send instruction"}
          </button>
        </div>

        {latestInstruction && !instructionsOpen && (
          <div className={styles.latestInstruction}>
            <span className={styles.latestInstructionLabel}>Latest</span>
            <p>{latestInstruction.instruction_text}</p>
            <time>{fmtDateTime(latestInstruction.created_at)}</time>
          </div>
        )}

        {instructionsOpen && (
          <div className={styles.instructionHistory}>
            {instructions.map((instr) => (
              <article key={instr.id} className={styles.instructionItem}>
                <p>{instr.instruction_text}</p>
                <time>{fmtDateTime(instr.created_at)}</time>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Actions */}
      <div className={styles.actions}>
        <button type="button" className={styles.btnGhost} onClick={() => { onClose(); onExport?.(); }}>
          Export Patient Record
        </button>
        <button type="button" className={styles.btnPrimary} onClick={() => { onClose(); onEdit?.(); }}>
          Edit Patient →
        </button>
      </div>
    </>
  );
}

// ── Trend Graphs Tab ──────────────────────────────────────────────────────────
function TrendTab({ trendData }: { trendData: TrendPoint[] }) {
  if (trendData.length === 0) {
    return (
      <div className={styles.tabPlaceholder}>
        <p>No trend data available yet</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 8 }}>
      {/* SpO₂ */}
      <div>
        <p className={styles.sparkLabel}>SpO₂ over last 30 days (%)</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={[70, 100]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="spo2" stroke="#e24b4a" strokeWidth={2} dot={false} name="SpO₂ %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* mMRC */}
      <div>
        <p className={styles.sparkLabel}>mMRC Breathlessness over last 30 days</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="mmrc" stroke="#f5a623" strokeWidth={2} dot={false} name="mMRC" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* VAS */}
      <div>
        <p className={styles.sparkLabel}>VAS Symptom Score over last 30 days</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="vas" stroke="#126969" strokeWidth={2} dot={false} name="VAS" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HistoryTab({ trendData, events }: { trendData: TrendPoint[]; events: HistoryEvent[] }) {
  return (
    <div style={{ display: "grid", gap: 20, paddingTop: 8 }}>
      <div>
        <p className={styles.medTitle}>Patient and Doctor Updates</p>
        {events.length === 0 ? (
          <div className={styles.tabPlaceholder} style={{ height: 120 }}>
            <p>No updates yet</p>
          </div>
        ) : (
          <div style={{ position: "relative", display: "grid", gap: 10 }}>
            {events.map((event) => {
              const color = event.type === "patient_log" ? "#126969" : event.type === "prescription" ? "#d85a30" : "#496977";
              const label = event.type === "patient_log" ? "Patient" : event.type === "prescription" ? "Treatment" : "Doctor";

              return (
                <div
                  key={event.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "88px 1fr",
                    gap: 12,
                    padding: "11px 12px",
                    border: "1px solid rgba(0,0,0,0.07)",
                    borderRadius: 10,
                    background: "#ffffff",
                  }}
                >
                  <div>
                    <span style={{ display: "inline-flex", padding: "3px 8px", borderRadius: 999, background: `${color}18`, color, fontSize: 10, fontWeight: 700, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                      {label}
                    </span>
                    <p style={{ margin: "6px 0 0", fontSize: 10, color: "#888680", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                      {event.meta ?? fmtDate(event.date)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#132d36", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                      {event.title}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5f6f75", lineHeight: 1.45, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                      {event.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {trendData.length > 0 && (
        <div>
          <p className={styles.medTitle}>Health Trends</p>
          <TrendTab trendData={trendData} />
        </div>
      )}
    </div>
  );
}

// ── Medications Tab ───────────────────────────────────────────────────────────
export function MedicationsTab({ activeMeds, title }: { activeMeds: MedicationInfo[]; title: string }) {
  if (activeMeds.length === 0) {
    return (
      <div className={styles.tabPlaceholder}>
        <p>No medications on record</p>
      </div>
    );
  }

  // Group medications by prescription date (start_date used as prescription date)
  const grouped = activeMeds.reduce<Record<string, MedicationInfo[]>>((acc, med) => {
    const key = med.start_date;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(med);
    return acc;
  }, {});

  // Sort dates descending (most recent first)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ paddingTop: 8 }}>
      <p className={styles.medTitle}>{title} ({activeMeds.length} total)</p>
      {sortedDates.map((date) => {
        const meds = grouped[date]!;
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
              padding: "6px 12px", background: "#f5f3ee", borderRadius: 6,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#0f6e56", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Prescription
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a18" }}>
                {fmtDate(date)}
              </span>
              <span style={{ fontSize: 11, color: "#888680", marginLeft: "auto" }}>
                {meds.length} medication{meds.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                    {["Route", "Drug Name", "Dose", "Frequency", "End Date"].map((h) => (
                      <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#888680", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meds.map((med) => (
                    <tr key={med.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <td style={{ padding: "8px 12px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{med.route}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{med.drug_name}</td>
                      <td style={{ padding: "8px 12px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{med.dose !== null ? `${med.dose} ${med.dose_unit ?? ""}` : "—"}</td>
                      <td style={{ padding: "8px 12px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{med.frequency ?? "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#888680", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{med.end_date ? fmtDate(med.end_date) : "Ongoing"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Treatment Tab ─────────────────────────────────────────────────────────────
interface PrescriptionMed {
  id: string;
  drug_name: string;
  route: string;
  dose: number | null;
  dose_unit: string | null;
  frequency: string | null;
  start_date: string;
  end_date: string | null;
  serial_number: number | null;
}

interface PrescriptionGroup {
  date: string;
  medications: PrescriptionMed[];
}

interface PrescriptionInstruction {
  id: string;
  instruction_text: string;
  created_at: string | null;
}

interface DraftMed {
  _key: number;
  drug_name: string;
  route: string;
  dose: string;
  dose_unit: string;
  frequency: string;
  end_date: string;
  ongoing: boolean;
  status: "continue" | "modified" | "new" | "stopped";
  source_id?: string; // original medication id if copied from previous
}

const ROUTE_OPTS = ["Tablet", "Capsule", "Injection", "Inhaler", "Nebulisation", "Nasal Spray", "Syrup", "Other"];
const UNIT_OPTS = ["mg", "mcg", "ml", "puffs", "units", "g", "other"];
const FREQUENCY_OPTS = ["OD", "BD", "TDS", "Once a week", "Once in 15 days", "Once a month", "Every 6 months"];
const PATIENT_INSTRUCTION_WORD_LIMIT = 50;

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function TreatmentTab({ patientId }: { patientId: string }) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [draftMeds, setDraftMeds] = useState<DraftMed[]>([]);
  const [patientInstruction, setPatientInstruction] = useState("");
  const [latestPrescriptionInstruction, setLatestPrescriptionInstruction] = useState<PrescriptionInstruction | null>(null);
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split("T")[0]!);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/patients/${patientId}/prescriptions`, { credentials: "include" });
    const body = await response.json().catch(() => null) as { prescriptions?: PrescriptionGroup[]; instruction?: PrescriptionInstruction | null } | null;

    if (response.ok && body?.prescriptions) {
      setPrescriptions(body.prescriptions);
      setLatestPrescriptionInstruction(body.instruction ?? null);
      if (body.prescriptions.length > 0) setExpandedDate(body.prescriptions[0]!.date);
    } else {
      const supabase = createClient();
      const res = await supabase
        .from("medications")
        .select("id, drug_name, dose, dose_unit, route, frequency, start_date, end_date, serial_number")
        .eq("patient_id", patientId)
        .order("start_date", { ascending: false })
        .order("serial_number", { ascending: true });
      if (!res.data) {
        setLoading(false);
        return;
      }
      const grouped: Record<string, PrescriptionMed[]> = {};
      for (const med of res.data) {
        const key = med.start_date;
        if (!grouped[key]) grouped[key] = [];
        grouped[key]!.push(med as PrescriptionMed);
      }
      const sorted = Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, medications]) => ({ date, medications }));
      setPrescriptions(sorted);
      if (sorted.length > 0) setExpandedDate(sorted[0]!.date);
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { void fetchPrescriptions(); }, [fetchPrescriptions]);

  // Auto-load latest prescription into editor
  const openNewPrescription = () => {
    const latest = prescriptions[0];
    const today = new Date().toISOString().split("T")[0]!;
    setPrescriptionDate(today);

    if (latest) {
      // Copy all active meds from latest prescription as "continue" by default
      const todayStr = today;
      const activeMeds = latest.medications.filter(m => !m.end_date || m.end_date >= todayStr);
      setDraftMeds(activeMeds.map((m, i) => ({
        _key: Date.now() + i,
        drug_name: m.drug_name,
        route: m.route,
        dose: m.dose !== null ? String(m.dose) : "",
        dose_unit: m.dose_unit ?? "mg",
        frequency: m.frequency ?? "OD",
        end_date: "",
        ongoing: true,
        status: "continue" as const,
        source_id: m.id,
      })));
    } else {
      setDraftMeds([{
        _key: Date.now(),
        drug_name: "",
        route: "Tablet",
        dose: "",
        dose_unit: "mg",
        frequency: "OD",
        end_date: "",
        ongoing: true,
        status: "new",
      }]);
    }
    setShowEditor(true);
    setPatientInstruction(latestPrescriptionInstruction?.instruction_text ?? "");
    setSaveMsg(null);
  };

  const addDrug = () => {
    setDraftMeds(prev => [...prev, {
      _key: Date.now(),
      drug_name: "",
      route: "Tablet",
      dose: "",
      dose_unit: "mg",
      frequency: "OD",
      end_date: "",
      ongoing: true,
      status: "new",
    }]);
  };

  const updateDraft = (key: number, updates: Partial<DraftMed>) => {
    setDraftMeds(prev => prev.map(m => {
      if (m._key !== key) return m;
      const updated = { ...m, ...updates };
      // If doctor changed dose/route on a continued med, mark as modified
      if (m.status === "continue" && (updates.drug_name !== undefined || updates.dose !== undefined || updates.route !== undefined || updates.frequency !== undefined)) {
        updated.status = "modified";
      }
      return updated;
    }));
  };

  const removeDraft = (key: number) => {
    setDraftMeds(prev => prev.map(m =>
      m._key === key ? { ...m, status: "stopped" as const } : m
    ));
  };

  const restoreDraft = (key: number) => {
    setDraftMeds(prev => prev.map(m =>
      m._key === key ? { ...m, status: m.source_id ? "continue" as const : "new" as const } : m
    ));
  };

  const savePrescription = async () => {
    const activeDrafts = draftMeds.filter(m => m.status !== "stopped" && m.drug_name.trim());
    if (!activeDrafts.length) { setSaveMsg("Add at least one medication."); return; }
    const instructionWords = countWords(patientInstruction);
    if (instructionWords > PATIENT_INSTRUCTION_WORD_LIMIT) {
      setSaveMsg("Patient instructions must be 50 words or fewer.");
      return;
    }

    setSaving(true);
    setSaveMsg(null);

    const stoppedIds = draftMeds
      .filter(m => m.status === "stopped" && m.source_id)
      .map(m => m.source_id!);

    const payload = {
      prescription_date: prescriptionDate,
      patient_instruction: patientInstruction.trim() || undefined,
      medications: draftMeds
        .filter(m => m.drug_name.trim())
        .map(m => ({
          drug_name: m.drug_name.trim(),
          route: m.route,
          dose: m.dose !== "" ? parseFloat(m.dose) : null,
          dose_unit: m.dose_unit || null,
          frequency: m.frequency,
          end_date: m.ongoing ? null : (m.end_date || null),
          status: m.status,
        })),
      stopped_medication_ids: stoppedIds,
    };

    try {
      const res = await fetch(`/api/patients/${patientId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const pdfResponse = await fetch(`/api/patients/${patientId}/prescriptions?format=pdf&date=${encodeURIComponent(prescriptionDate)}`, {
          credentials: "include",
        });
        if (pdfResponse.ok) {
          const blob = await pdfResponse.blob();
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = pdfResponse.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `saans-prescription-${prescriptionDate}.pdf`;
          anchor.click();
          URL.revokeObjectURL(url);
          setSaveMsg("Prescription saved and PDF downloaded.");
        } else {
          setSaveMsg("Prescription saved successfully. PDF download failed.");
        }
        setShowEditor(false);
        setPatientInstruction("");
        await fetchPrescriptions();
      } else {
        const body = await res.json() as { error?: string };
        setSaveMsg(body.error ?? "Save failed");
      }
    } catch {
      setSaveMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.tabPlaceholder}><p>Loading treatment history…</p></div>;
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#132d36", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            Treatment History
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            {prescriptions.length} consultation{prescriptions.length !== 1 ? "s" : ""} on record
          </p>
        </div>
        <button
          type="button"
          onClick={openNewPrescription}
          style={{
            padding: "8px 14px", borderRadius: 8, border: "none",
            background: "#126969", color: "white", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          }}
        >
          + New Prescription
        </button>
      </div>

      {saveMsg && !showEditor && (
        <div style={{
          padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 12,
          background: saveMsg.includes("successfully") ? "#e8f5f1" : "#fdecea",
          color: saveMsg.includes("successfully") ? "#0f6e56" : "#c94d49",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        }}>
          {saveMsg}
        </div>
      )}

      {/* ── Prescription Editor ── */}
      {showEditor && (
        <div style={{
          border: "1.5px solid #126969", borderRadius: 12, padding: 16,
          marginBottom: 20, background: "#f7fafb",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#126969", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                New Prescription
              </p>
              {prescriptions.length > 0 && (
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                  Auto-loaded from {fmtDate(prescriptions[0]!.date)} — modify as needed
                </p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 11, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>Date</label>
              <input
                type="date"
                value={prescriptionDate}
                onChange={e => setPrescriptionDate(e.target.value)}
                style={{ padding: "5px 8px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
              />
            </div>
          </div>

          {/* Drug list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 60px 140px 90px 32px", gap: 6, padding: "0 4px" }}>
              {["Drug Name", "Route", "Dose", "Unit", "Frequency", "Status", ""].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#6d8794", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{h}</span>
              ))}
            </div>

            {draftMeds.map(med => {
              const isStopped = med.status === "stopped";
              const statusColor = med.status === "new" ? "#126969" : med.status === "modified" ? "#d85a30" : med.status === "stopped" ? "#c94d49" : "#6d8794";
              const statusLabel = med.status === "new" ? "New" : med.status === "modified" ? "Modified" : med.status === "stopped" ? "Stopped" : "Continue";

              return (
                <div
                  key={med._key}
                  style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 80px 60px 140px 90px 32px",
                    gap: 6, alignItems: "center", padding: "8px",
                    background: isStopped ? "#fdecea" : "white",
                    borderRadius: 8, border: `1px solid ${isStopped ? "#fca5a5" : "rgba(0,0,0,0.07)"}`,
                    opacity: isStopped ? 0.7 : 1,
                  }}
                >
                  <input
                    type="text"
                    value={med.drug_name}
                    disabled={isStopped}
                    placeholder="Drug name"
                    onChange={e => updateDraft(med._key, { drug_name: e.target.value })}
                    style={{
                      padding: "5px 8px", border: "1px solid #d4cfc7", borderRadius: 6,
                      fontSize: 12, fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                      background: isStopped ? "#fdecea" : "white",
                      textDecoration: isStopped ? "line-through" : "none",
                    }}
                  />
                  <select
                    value={med.route}
                    disabled={isStopped}
                    onChange={e => updateDraft(med._key, { route: e.target.value })}
                    style={{ padding: "5px 6px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-dm-sans), system-ui, sans-serif", background: isStopped ? "#fdecea" : "white" }}
                  >
                    {ROUTE_OPTS.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <input
                    type="number"
                    value={med.dose}
                    disabled={isStopped}
                    placeholder="—"
                    onChange={e => updateDraft(med._key, { dose: e.target.value })}
                    style={{ padding: "5px 6px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-dm-sans), system-ui, sans-serif", background: isStopped ? "#fdecea" : "white" }}
                  />
                  <select
                    value={med.dose_unit}
                    disabled={isStopped}
                    onChange={e => updateDraft(med._key, { dose_unit: e.target.value })}
                    style={{ padding: "5px 4px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-dm-sans), system-ui, sans-serif", background: isStopped ? "#fdecea" : "white" }}
                  >
                    {UNIT_OPTS.map(u => <option key={u}>{u}</option>)}
                  </select>
                  <select
                    value={med.frequency}
                    disabled={isStopped}
                    onChange={e => updateDraft(med._key, { frequency: e.target.value })}
                    style={{ padding: "5px 4px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-dm-sans), system-ui, sans-serif", background: isStopped ? "#fdecea" : "white" }}
                  >
                    {FREQUENCY_OPTS.map(frequency => <option key={frequency}>{frequency}</option>)}
                  </select>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {statusLabel}
                  </span>
                  {isStopped ? (
                    <button type="button" onClick={() => restoreDraft(med._key)}
                      style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #d4cfc7", background: "white", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Restore"
                    >↩</button>
                  ) : (
                    <button type="button" onClick={() => removeDraft(med._key)}
                      style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #fca5a5", background: "#fdecea", color: "#c94d49", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Stop this medication"
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            marginBottom: 12,
            padding: 12,
            background: "white",
            border: "1px solid rgba(18,105,105,0.16)",
            borderRadius: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <label
                htmlFor="patient-instruction"
                style={{ fontSize: 11, fontWeight: 700, color: "#126969", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
              >
                Patient Instructions
              </label>
              <span style={{ fontSize: 11, color: countWords(patientInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT ? "#c94d49" : "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                {countWords(patientInstruction)}/{PATIENT_INSTRUCTION_WORD_LIMIT} words
              </span>
            </div>
            <textarea
              id="patient-instruction"
              value={patientInstruction}
              onChange={(event) => setPatientInstruction(event.target.value)}
              rows={3}
              placeholder="Add guidance visible to the patient with this prescription..."
              style={{
                width: "100%",
                resize: "vertical",
                minHeight: 72,
                padding: "8px 10px",
                border: `1px solid ${countWords(patientInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT ? "#c94d49" : "#d4cfc7"}`,
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.5,
                color: "#132d36",
                fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              }}
            />
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              Visible to the patient in their dashboard along with the latest prescription.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" onClick={addDrug}
              style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px dashed #126969", background: "none", color: "#126969", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
            >
              + Add Drug
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => { setShowEditor(false); setPatientInstruction(""); setSaveMsg(null); }}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #d4cfc7", background: "white", color: "#496977", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
            >
              Cancel
            </button>
            <button type="button" onClick={savePrescription} disabled={saving}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: saving ? "#6d8794" : "#126969", color: "white", fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
            >
              {saving ? "Saving…" : "Save Prescription"}
            </button>
          </div>

          {saveMsg && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: saveMsg.includes("successfully") ? "#0f6e56" : "#c94d49", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              {saveMsg}
            </p>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      {prescriptions.length === 0 ? (
        <div className={styles.tabPlaceholder}>
          <p>No prescriptions yet. Click &quot;+ New Prescription&quot; to add the first one.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {prescriptions.map((group, idx) => {
            const isExpanded = expandedDate === group.date;
            const isLatest = idx === 0;
            const today = new Date().toISOString().split("T")[0]!;
            const activeMeds = group.medications.filter(m => !m.end_date || m.end_date >= today);
            const stoppedMeds = group.medications.filter(m => m.end_date && m.end_date < today);

            return (
              <div key={group.date} style={{ border: `1px solid ${isLatest ? "#a7d7c5" : "rgba(0,0,0,0.08)"}`, borderRadius: 10, overflow: "hidden", background: "white" }}>
                  {/* Card header — clickable */}
                  <button
                    type="button"
                    onClick={() => setExpandedDate(isExpanded ? null : group.date)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", background: isLatest ? "#e8f5f1" : "#fafafa",
                      border: "none", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#132d36", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                        {fmtDate(group.date)}
                        {isLatest && <span style={{ marginLeft: 8, fontSize: 10, background: "#126969", color: "white", padding: "1px 7px", borderRadius: 10 }}>Latest</span>}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                        {group.medications.length} drug{group.medications.length !== 1 ? "s" : ""}
                        {activeMeds.length !== group.medications.length && ` · ${activeMeds.length} active`}
                      </p>
                    </div>
                    <span style={{ fontSize: 16, color: "#6d8794", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: "12px 14px" }}>
                      {activeMeds.length > 0 && (
                        <>
                          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#0f6e56", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                            Active Medications
                          </p>
                          {activeMeds.map((med) => (
                            <div key={med.id} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "7px 10px", marginBottom: 4,
                              background: "#f0faf5", borderRadius: 7,
                              border: "1px solid rgba(18,105,105,0.12)",
                            }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#132d36", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                                  {med.drug_name}
                                </span>
                                {med.dose !== null && (
                                  <span style={{ fontSize: 12, color: "#6d8794", marginLeft: 6, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                                    {med.dose} {med.dose_unit ?? ""}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: 11, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                                {med.route}
                              </span>
                              <span style={{ fontSize: 11, color: "#0f6e56", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                                {med.frequency ?? "OD"}
                              </span>
                              <span style={{ fontSize: 10, color: "#0f6e56", background: "#e8f5f1", padding: "2px 7px", borderRadius: 8, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                                {med.end_date ? `Until ${fmtDate(med.end_date)}` : "Ongoing"}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {stoppedMeds.length > 0 && (
                        <>
                          <p style={{ margin: "12px 0 8px", fontSize: 11, fontWeight: 700, color: "#c94d49", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                            Stopped
                          </p>
                          {stoppedMeds.map(med => (
                            <div key={med.id} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "6px 10px", marginBottom: 4,
                              background: "#fdecea", borderRadius: 7, opacity: 0.75,
                            }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#c94d49", textDecoration: "line-through", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                                {med.drug_name}
                              </span>
                              {med.dose !== null && (
                                <span style={{ fontSize: 11, color: "#c94d49", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                                  {med.dose} {med.dose_unit ?? ""}
                                </span>
                              )}
                              <span style={{ marginLeft: "auto", fontSize: 10, color: "#c94d49", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                                Stopped {fmtDate(med.end_date)}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── PFT Records Tab ───────────────────────────────────────────────────────────
export function PftTab({ records }: { records: PftInfo[] }) {
  if (records.length === 0) {
    return (
      <div className={styles.tabPlaceholder}>
        <p>No PFT records on file</p>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <p className={styles.medTitle}>PFT Records ({records.length})</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
              {["Date", "FEV1/FVC%", "FEV1%pred", "FEV1 L", "FVC%pred", "FVC L", "DLCO%", "6MWD", "SpO2 min/max"].map((h) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#888680", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const other = (r.other_fields ?? {}) as Record<string, unknown>;
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", whiteSpace: "nowrap" }}>{fmtDate(r.test_date)}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{r.fev1_fvc_ratio ?? "—"}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{(other.fev1_pct_pred as string) ?? "—"}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{r.fev1 ?? "—"}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{(other.fvc_pct_pred as string) ?? "—"}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{r.fvc ?? "—"}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{r.dlco ?? "—"}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{(other.six_mwd as string) ?? "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#888680", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {(other.min_spo2 as string) ?? "—"} / {(other.max_spo2 as string) ?? "—"}
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


