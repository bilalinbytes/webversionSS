"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Activity, Search, Bell, Download, Users, Trash2, FolderOpen, ShieldCheck, Sparkles } from "lucide-react";
import { PatientDetail } from "./PatientDetail";
import { ImportPatientModal } from "./ImportPatientModal";
import { createClient } from "@/lib/supabase/client";
import { getDoctorPatients, acknowledgePatientAlerts as acknowledgePatientAlertsApi } from "@o2plus/api-client/doctor";
import styles from "./DashboardView.module.css";

// -- Types aligned to Supabase schema ------------------------------------------
export type RiskLevel = "critical" | "high" | "moderate" | "stable" | "none";

export interface SupabasePatient {
  id: string;
  name: string;
  date_of_birth: string | null;
  mobile_number: string | null;
  created_at: string | null;
  patient_diagnoses: {
    primary_diagnosis: string;
    effective_dashboard: string | null;
    comorbidities: unknown;
    comorbidities_other_text: string | null;
  }[] | null;
  red_flag_scores: {
    global_score: number;
    risk_level: string | null;
    indicator_color: string | null;
    computed_at: string | null;
  }[] | null;
  disease_alerts: {
    alert_type: string;
    reason_text: string | null;
    created_at: string | null;
    acknowledged_by_doctor: boolean | null;
    is_suppressed: boolean | null;
  }[] | null;
}

// Map score - internal risk level
function scoreToRisk(score: number): RiskLevel {
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "moderate";
  return "stable";
}

function formatComorbidities(comorbidities: unknown, otherText: string | null | undefined) {
  const parseString = (value: string): string[] => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      // Some legacy rows store comma-separated text instead of JSON.
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  };

  const list = Array.isArray(comorbidities)
    ? comorbidities.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : typeof comorbidities === "string"
      ? parseString(comorbidities)
      : comorbidities && typeof comorbidities === "object"
        ? Object.values(comorbidities).filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];

  const normalized = list
    .map((item) => item === "Others" && otherText ? otherText : item)
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized.join(", ") : "";
}

function formatDashboardLabel(value: string | null | undefined): string {
  switch (value) {
    case "asthma":
      return "Asthma";
    case "copd":
      return "COPD";
    case "ild":
      return "ILD";
    case "bronchiectasis":
      return "Bronchiectasis";
    case "post_icu":
      return "Post ICU";
    default:
      return "";
  }
}

function formatDiagnosisLine(patient: SupabasePatient): string {
  const diagnosisRow = patient.patient_diagnoses?.[0];
  const rawDiagnosis = diagnosisRow?.primary_diagnosis?.trim() ?? "";
  if (!rawDiagnosis) return "No diagnosis recorded";

  const lower = rawDiagnosis.toLowerCase();
  if (lower.includes("bronchiolitis")) {
    return "OAD / Bronchiolitis Obliterans";
  }
  if (lower.includes("overlap") || lower.includes("aco") || (lower.includes("asthma") && lower.includes("copd"))) {
    return "OAD / Asthma COPD overlap";
  }

  return rawDiagnosis;
}

function formatComorbidityLine(patient: SupabasePatient): string {
  const diagnosisRow = patient.patient_diagnoses?.[0];
  const comorbidities = formatComorbidities(
    diagnosisRow?.comorbidities,
    diagnosisRow?.comorbidities_other_text,
  );

  return comorbidities ? `Co-morbidities: ${comorbidities}` : "Co-morbidities: None recorded";
}

function countOpenAlerts(patient: SupabasePatient): number {
  return (patient.disease_alerts ?? []).filter(
    (alert) =>
      !alert.is_suppressed &&
      !alert.acknowledged_by_doctor &&
      (alert.alert_type === "RED" || alert.alert_type === "YELLOW"),
  ).length;
}

function countOpenAlertsForPatients(patients: SupabasePatient[]): number {
  return patients.reduce((total, patient) => total + countOpenAlerts(patient), 0);
}

function openAlerts(patient: SupabasePatient) {
  return (patient.disease_alerts ?? [])
    .filter(
      (alert) =>
        !alert.is_suppressed &&
        !alert.acknowledged_by_doctor &&
        (alert.alert_type === "RED" || alert.alert_type === "YELLOW"),
    )
    .sort((left, right) => new Date(right.created_at ?? "").getTime() - new Date(left.created_at ?? "").getTime());
}

function latestOpenAlert(patient: SupabasePatient) {
  return openAlerts(patient)[0] ?? null;
}

// Animated counter
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    prevRef.current = to;
    const duration = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <span className={className}>{display}</span>;
}

// Bell with shake animation
function ShakingBell({ count }: { count: number }) {
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 600);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <div className={`${styles.bellWrap} ${shaking ? styles.bellShake : ""}`}>
      <Bell size={15} strokeWidth={1.5} />
      <span className={styles.bellBadge}>{count}</span>
    </div>
  );
}

// -- Delete Confirm Dialog -----------------------------------------------------
function DeleteConfirmDialog({
  patient,
  onConfirm,
  onCancel,
  deleting,
}: {
  patient: SupabasePatient;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(19,45,54,0.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        style={{
          background: "#fff", borderRadius: 16, padding: "28px 28px 24px",
          width: "100%", maxWidth: 400,
          boxShadow: "0 20px 60px rgba(19,45,54,0.18)",
          animation: "cardIn 0.2s ease both",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "#fdecea", display: "flex", alignItems: "center",
          justifyContent: "center", marginBottom: 16,
        }}>
          <Trash2 size={22} color="#c94d49" strokeWidth={1.8} />
        </div>

        <h2 id="delete-dialog-title" style={{
          margin: "0 0 8px", fontSize: "1.05rem", fontWeight: 700,
          color: "#132d36", fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
        }}>
          Delete patient?
        </h2>
        <p style={{
          margin: "0 0 6px", fontSize: "0.875rem", color: "#496977",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif", lineHeight: 1.5,
        }}>
          You are about to permanently delete{" "}
          <strong style={{ color: "#132d36" }}>{patient.name}</strong>.
        </p>
        <p style={{
          margin: "0 0 24px", fontSize: "0.8rem", color: "#c94d49",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          background: "#fdecea", padding: "8px 12px", borderRadius: 8,
        }}>
          This will remove all their logs, scores, medications and records. This action cannot be undone.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid rgba(19,45,54,0.14)",
              background: "none", color: "#496977", fontSize: "0.875rem", fontWeight: 500,
              cursor: "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
              background: deleting ? "#e8a0a0" : "#c94d49", color: "white",
              fontSize: "0.875rem", fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              transition: "background 160ms ease",
            }}
          >
            {deleting ? "Deleting-" : "Yes, delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Patient Table Row ---------------------------------------------------------
function PatientTableRow({
  patient,
  onClick,
  onAnalyticsClick,
  onFolderClick,
  animIndex,
  onDeleteClick,
}: {
  patient: SupabasePatient;
  onClick: () => void;
  onAnalyticsClick: (e: React.MouseEvent) => void;
  onFolderClick: (e: React.MouseEvent) => void;
  animIndex: number;
  onDeleteClick: (e: React.MouseEvent) => void;
}) {
  const latestScore = patient.red_flag_scores?.[0];
  const score = latestScore?.global_score ?? null;
  const risk: RiskLevel = score !== null ? scoreToRisk(score) : "none";
  const diagnosisLine = formatDiagnosisLine(patient);
  const comorbidityLine = formatComorbidityLine(patient);
  const latestAlert = latestOpenAlert(patient) ?? (patient.disease_alerts ?? [])
    .filter((alert) => !alert.is_suppressed)
    .sort((left, right) => new Date(right.created_at ?? "").getTime() - new Date(left.created_at ?? "").getTime())[0];
  const initials = patient.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const lastLog = latestScore?.computed_at
    ? new Date(latestScore.computed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "No data";

  const rowBorderClass = {
    critical: styles.rowBorderCritical,
    high:     styles.rowBorderHigh,
    moderate: styles.rowBorderModerate,
    stable:   styles.rowBorderStable,
    none:     styles.rowBorderNone,
  }[risk];

  const riskLabel: Record<RiskLevel, string> = {
    critical: "CRITICAL",
    high:     "HIGH",
    moderate: "MODERATE",
    stable:   "STABLE",
    none:     "NO DATA",
  };

  const avatarClass = {
    critical: styles.avatarCritical,
    high:     styles.avatarHigh,
    moderate: styles.avatarModerate,
    stable:   styles.avatarStable,
    none:     styles.avatarNone,
  }[risk];

  return (
    <div
      className={`${styles.patientRow} ${rowBorderClass}`}
      style={{ animationDelay: `${animIndex * 25}ms` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* 1. Patient Info */}
      <div className={styles.colPatient}>
        <div className={`${styles.patientAvatar} ${avatarClass}`}>{initials}</div>
        <div className={styles.patientDetails}>
          <p className={styles.patientName}>{patient.name}</p>
          <span className={styles.patientId}>
            {patient.mobile_number ? `+91 ${patient.mobile_number}` : `ID: ${patient.id.slice(0, 8)}`}
          </span>
        </div>
      </div>

      {/* 2. Diagnosis & Comorbidities */}
      <div className={styles.colDiag}>
        <span className={styles.diagBadge} title={diagnosisLine}>{diagnosisLine}</span>
        <span className={styles.comorbidText} title={comorbidityLine}>{comorbidityLine}</span>
      </div>

      {/* 3. Risk Level */}
      <div className={styles.colRisk}>
        <span className={`${styles.riskBadge} ${styles[`riskBadge_${risk}`]}`}>
          {riskLabel[risk]}
        </span>
        {score !== null && (
          <span className={styles.scoreCircle}>({score})</span>
        )}
      </div>

      {/* 4. Last Check-In */}
      <div className={styles.colLast}>
        {lastLog}
      </div>

      {/* 5. Active Alerts */}
      <div className={styles.colAlert}>
        {latestAlert?.reason_text ? (
          <span className={styles.alertReasonText} title={latestAlert.reason_text}>
            <span className="animate-pulse-live" style={{ display: "inline-block", width: 8, height: 8, background: "#dc2626", marginRight: 6, borderRadius: "50%" }}></span>
            {latestAlert.reason_text}
          </span>
        ) : (
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>-</span>
        )}
      </div>

      {/* 6. Action Triggers */}
      <div className={styles.colActions}>
        <button
          type="button"
          aria-label={`Delete ${patient.name}`}
          className={styles.btnActionDelete}
          onClick={onDeleteClick}
          title="Delete patient"
        >
          <Trash2 size={13} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={styles.btnActionIcon}
          onClick={onAnalyticsClick}
          title="Analytics"
          aria-label={`View analytics for ${patient.name}`}
        >
          <Activity size={13} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={styles.btnActionIcon}
          aria-label={`Open treatment folder for ${patient.name}`}
          title="Treatment folder"
          onClick={onFolderClick}
        >
          <FolderOpen size={13} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={styles.btnRowView}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          View →
        </button>
      </div>
    </div>
  );
}

// -- Skeleton Row -------------------------------------------------------------
function SkeletonRow() {
  return (
    <div className={`${styles.skeletonRow} animate-shimmer`}>
      <div className={styles.skeletonAvatar} />
      <div className={`${styles.skBlock} ${styles.shimmer}`} style={{ width: "80%" }} />
      <div className={`${styles.skBlock} ${styles.shimmer}`} style={{ width: "70%" }} />
      <div className={`${styles.skBlock} ${styles.shimmer}`} style={{ width: "60%" }} />
      <div className={`${styles.skBlock} ${styles.shimmer}`} style={{ width: "50%" }} />
      <div className={`${styles.skBlock} ${styles.shimmer}`} style={{ width: "40%" }} />
      <div className={`${styles.skBlock} ${styles.shimmer}`} style={{ width: "90%" }} />
    </div>
  );
}

// -- Empty state ---------------------------------------------------------------
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Users size={32} strokeWidth={1.25} />
      </div>
      <p className={styles.emptyTitle}>No patients yet</p>
      <p className={styles.emptySubtitle}>
        Add your first patient to start monitoring their respiratory health.
      </p>
      <button type="button" className={styles.emptyBtn} onClick={onAdd}>
        + Add Patient
      </button>
    </div>
  );
}

function FilteredEmptyState({ onReset, search, filter }: { onReset: () => void; search: string; filter: string }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Search size={28} strokeWidth={1.5} />
      </div>
      <p className={styles.emptyTitle}>No matching patients found</p>
      <p className={styles.emptySubtitle}>
        {search ? `No patients match "${search}"` : `No patients found in "${filter}" category`}. Try adjusting your search query or filters.
      </p>
      <button type="button" className={styles.emptyBtn} onClick={onReset}>
        Reset Filters &amp; Search
      </button>
    </div>
  );
}

// -- Error state ---------------------------------------------------------------
function ErrorState({ message }: { message: string }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>Unable to load patients</p>
      <p className={styles.emptySubtitle}>{message}</p>
    </div>
  );
}

// -- Main ----------------------------------------------------------------------
interface DashboardViewProps {
  onViewChange: (view: "dashboard" | "create" | "export") => void;
  onEditPatient?: (patientId: string) => void;
}

type DiagnosisFilter = "All" | "ILD" | "COPD" | "Asthma" | "Bronchiectasis" | "Post ICU";
const FILTERS: DiagnosisFilter[] = ["All", "ILD", "COPD", "Asthma", "Bronchiectasis", "Post ICU"];
type PatientSort = "alert_desc" | "alert_asc" | "name_asc";

function patientScore(patient: SupabasePatient): number {
  return patient.red_flag_scores?.[0]?.global_score ?? -1;
}

export function DashboardView({ onViewChange, onEditPatient }: DashboardViewProps) {
  const [patients, setPatients] = useState<SupabasePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DiagnosisFilter>("All");
  const [sortBy, setSortBy] = useState<PatientSort>("alert_desc");
  const [filterKey, setFilterKey] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<SupabasePatient | null>(null);
  const [selectedInitialTab, setSelectedInitialTab] = useState("Overview");
  const [showImport, setShowImport] = useState(false);
  const [doctorId, setDoctorId] = useState<string>("");
  // SRS -1.3 / -2.1 - real unacknowledged alert count from disease_alerts
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SupabasePatient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  const loadPatients = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setDoctorId(user.id);

    const response = await getDoctorPatients({ supabase: null as any });
    const body = response.data 
      ? { patients: response.data as SupabasePatient[] } 
      : { error: response.error };

    if (!response.success) {
      setFetchError(body.error ?? "Unable to load patients");
    } else {
      setFetchError(null);
      // Sort red_flag_scores descending per patient (take most recent)
      const sorted = (body.patients ?? []).map((p) => ({
        ...p,
        red_flag_scores: p.red_flag_scores
          ? [...p.red_flag_scores].sort(
              (a, b) => new Date(b.computed_at ?? "").getTime() - new Date(a.computed_at ?? "").getTime()
            )
          : null,
        disease_alerts: p.disease_alerts
          ? [...p.disease_alerts].sort(
              (a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime()
            )
          : null,
      }));
      setPatients(sorted);
      setUnacknowledgedAlerts(countOpenAlertsForPatients(sorted));
    }

    setLoading(false);
  }, []);

  // Fetch real patients from Supabase and keep alerts fresh while the doctor is on the page.
  useEffect(() => {
    void loadPatients(true);
    const patientPoll = setInterval(() => {
      void loadPatients(false);
    }, 30000);
    return () => clearInterval(patientPoll);
  }, [loadPatients]);

  // Stats computed from real data
  const total = patients.length;
  const critical = patients.filter((p) => {
    const s = p.red_flag_scores?.[0]?.global_score ?? 0;
    return s >= 9;
  }).length;
  const high = patients.filter((p) => {
    const s = p.red_flag_scores?.[0]?.global_score ?? 0;
    return s >= 7 && s < 9;
  }).length;
  const moderate = patients.filter((p) => {
    const s = p.red_flag_scores?.[0]?.global_score ?? 0;
    return s >= 4 && s < 7;
  }).length;
  const stable = patients.filter((p) => {
    const s = p.red_flag_scores?.[0]?.global_score ?? 0;
    return s < 4;
  }).length;

  const criticalPatients = patients.filter((p) => {
    const alert = latestOpenAlert(p);
    const s = p.red_flag_scores?.[0]?.global_score ?? 0;
    return alert?.alert_type === "RED" || s >= 9;
  });

  const highPatients = patients.filter((p) => {
    if (criticalPatients.some((criticalPatient) => criticalPatient.id === p.id)) return false;
    const alert = latestOpenAlert(p);
    const s = p.red_flag_scores?.[0]?.global_score ?? 0;
    return alert?.alert_type === "YELLOW" || (s >= 7 && s < 9);
  });

  const filteredPatients = patients.filter((p) => {
    // SRS -2.5 - search by name OR patient ID
    const searchTerm = search.trim().toLowerCase();
    const searchDigits = search.replace(/\D/g, "");
    const patientPhone = (p.mobile_number ?? "").replace(/\D/g, "");
    const matchSearch =
      searchTerm === "" ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.id.toLowerCase().includes(searchTerm) ||
      (searchDigits.length > 0 && patientPhone.includes(searchDigits));
    const diagnosisRow = p.patient_diagnoses?.[0];
    const diagLabel = diagnosisRow?.primary_diagnosis ?? "";
    const effectiveDashboard = (diagnosisRow?.effective_dashboard ?? "").toLowerCase();
    const matchFilter =
      filter === "All" ||
      (filter === "Post ICU"       && (effectiveDashboard === "post_icu"      || diagLabel.toLowerCase().includes("post icu"))) ||
      (filter === "Asthma"         && effectiveDashboard === "asthma") ||
      (filter === "COPD"           && effectiveDashboard === "copd") ||
      (filter === "ILD"            && effectiveDashboard === "ild") ||
      (filter === "Bronchiectasis" && effectiveDashboard === "bronchiectasis");
    return matchSearch && matchFilter;
  }).sort((left, right) => {
    if (sortBy === "name_asc") return left.name.localeCompare(right.name);
    const leftScore = patientScore(left);
    const rightScore = patientScore(right);
    const scoreDelta = sortBy === "alert_asc" ? leftScore - rightScore : rightScore - leftScore;
    if (scoreDelta !== 0) return scoreDelta;
    return left.name.localeCompare(right.name);
  });

  const diseaseCounts = useMemo(() => {
    const counts: Record<string, number> = { All: patients.length };
    for (const p of patients) {
      const diagnosisRow = p.patient_diagnoses?.[0];
      const eff = (diagnosisRow?.effective_dashboard ?? "").toLowerCase();
      const diag = (diagnosisRow?.primary_diagnosis ?? "").toLowerCase();
      if (eff === "asthma") counts["Asthma"] = (counts["Asthma"] || 0) + 1;
      else if (eff === "copd") counts["COPD"] = (counts["COPD"] || 0) + 1;
      else if (eff === "ild") counts["ILD"] = (counts["ILD"] || 0) + 1;
      else if (eff === "bronchiectasis") counts["Bronchiectasis"] = (counts["Bronchiectasis"] || 0) + 1;
      else if (eff === "post_icu" || diag.includes("post icu") || diag.includes("post-icu")) counts["Post ICU"] = (counts["Post ICU"] || 0) + 1;
    }
    return counts;
  }, [patients]);

  const handleFilterChange = useCallback((f: DiagnosisFilter) => {
    setFilter(f);
    setFilterKey((k) => k + 1);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/patients?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setPatients((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const acknowledgePatientAlerts = useCallback(async (patient: SupabasePatient) => {
    const openCount = countOpenAlerts(patient);
    if (openCount === 0) return;

    setUnacknowledgedAlerts((count) => Math.max(0, count - openCount));
    setPatients((current) =>
      current.map((entry) =>
        entry.id === patient.id
          ? {
              ...entry,
              disease_alerts: entry.disease_alerts?.map((alert) =>
                !alert.is_suppressed &&
                !alert.acknowledged_by_doctor &&
                (alert.alert_type === "RED" || alert.alert_type === "YELLOW")
                  ? { ...alert, acknowledged_by_doctor: true }
                  : alert,
              ) ?? null,
            }
          : entry,
      ),
    );
    window.dispatchEvent(new CustomEvent("saans:alerts-acknowledged", { detail: { count: openCount } }));

    try {
      const response = await acknowledgePatientAlertsApi({ supabase: null as any }, patient.id);
      if (!response.success) return;
    } catch {
      // Non-fatal: opening the patient should not fail if acknowledgement fails.
    }
  }, []);

  // C2: Synchronize URL with selected patient
  const openPatient = useCallback((patient: SupabasePatient, tab: string = "Overview") => {
    setSelectedInitialTab(tab);
    setSelectedPatient(patient);
    void acknowledgePatientAlerts(patient);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("patientId", patient.id);
      if (tab && tab !== "Overview") {
        url.searchParams.set("tab", tab);
      } else {
        url.searchParams.delete("tab");
      }
      window.history.pushState({ patientModal: true, patientId: patient.id }, "", url.pathname + url.search);
    }
  }, [acknowledgePatientAlerts]);

  const closePatient = useCallback(() => {
    setSelectedPatient(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("patientId");
      url.searchParams.delete("tab");
      window.history.pushState(null, "", url.pathname + (url.search ? url.search : ""));
    }
  }, []);

  // Listen to popstate for browser Back / Forward
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const pId = params.get("patientId");
        const tab = params.get("tab") || "Overview";
        if (pId) {
          const match = patients.find(p => p.id === pId);
          if (match) {
            setSelectedPatient(match);
            setSelectedInitialTab(tab);
          } else {
            setSelectedPatient({
              id: pId,
              name: "Patient Record",
              date_of_birth: null,
              mobile_number: null,
              created_at: null,
              patient_diagnoses: null,
              red_flag_scores: null,
              disease_alerts: null,
            });
            setSelectedInitialTab(tab);
          }
        } else {
          setSelectedPatient(null);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [patients]);

  // Check URL on initial mount or when patients list loads
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pId = params.get("patientId");
      const tab = params.get("tab") || "Overview";
      if (pId && !selectedPatient) {
        const match = patients.find(p => p.id === pId);
        if (match) {
          setSelectedPatient(match);
          setSelectedInitialTab(tab);
        } else if (!loading) {
          setSelectedPatient({
            id: pId,
            name: "Patient Record",
            date_of_birth: null,
            mobile_number: null,
            created_at: null,
            patient_diagnoses: null,
            red_flag_scores: null,
            disease_alerts: null,
          });
          setSelectedInitialTab(tab);
        }
      }
    }
  }, [patients, loading, selectedPatient]);

  // Today's date - computed client-side only to avoid SSR hydration mismatch
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  return (
    <div className={styles.view}>
      {/* -- Top bar -- */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.commandTitle}>Clinical Decision Center</div>
          <div className={styles.commandSub}>{today}</div>
        </div>
        <div className={styles.topBarStats}>
          <div className={styles.topStat}>
            <AnimatedNumber value={total} className={styles.topStatVal} />
            <span className={styles.topStatLbl}>Patients</span>
          </div>
          <div className={`${styles.topStat} ${styles.topStatRed}`}>
            <AnimatedNumber value={critical} className={styles.topStatVal} />
            <span className={styles.topStatLbl}>Critical</span>
          </div>
          <div className={styles.topStat}>
            <AnimatedNumber value={high} className={styles.topStatVal} />
            <span className={styles.topStatLbl}>High risk</span>
          </div>
          <div className={styles.topStat} style={{ cursor: "pointer" }} onClick={() => setShowAlertsPanel(true)}>
            <ShakingBell count={unacknowledgedAlerts} />
            <span className={styles.topStatLbl}>Alerts</span>
          </div>
        </div>
        <div className={styles.topBarActions}>
          <button type="button" className={styles.btnGhost} onClick={() => onViewChange("export")}>
            Export
          </button>
          <button type="button" className={styles.btnImport} onClick={() => setShowImport(true)}>
            <Download size={13} strokeWidth={2} />
            Import
          </button>
          <button type="button" className={styles.btnPrimary} onClick={() => onViewChange("create")}>
            + Add Patient
          </button>
        </div>
      </div>

      {/* -- Cohort Care Pathway 3D Hub (non-loading, patients exist only) -- */}
      {!loading && total > 0 && (
        <div className={styles.pathwayCohortHub}>
          {/* Left: Artwork badge & motto */}
          <div className={styles.pathwayCohortLeft}>
            <div className={styles.pathwayCohortIconBadge}>
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div className={styles.pathwayCohortTitleWrap}>
              <p className={styles.pathwayCohortTitle}>
                Respiratory Care Pathway — Cohort Overview
              </p>
              <p className={styles.pathwayCohortSub}>
                नियमित निगरानी आपको एक कदम आगे रखती है। · Regular monitoring helps you stay ahead.
              </p>
            </div>
          </div>

          {/* Vertical divider */}
          <div className={styles.pathwayCohortDivider} />

          {/* 3D Step Metrics Grid */}
          <div className={styles.pathwayCohortGrid}>
            {/* Step 1 pillar */}
            <div className={styles.pathwayStepPillar}>
              <div className={`${styles.pathwayStepIcon} ${styles.pathwayStepIcon1}`}>
                <Activity size={15} strokeWidth={2.5} />
              </div>
              <div className={styles.pathwayStepInfo}>
                <span className={`${styles.pathwayStepPillarNum} ${styles.pathwayStepNum1}`}>
                  Step 1 · Daily Check-in
                </span>
                <span className={styles.pathwayStepPillarVal}>
                  {total}
                  <span className={styles.pathwayStepPillarSub}>enrolled</span>
                </span>
              </div>
            </div>

            {/* Step 2 pillar */}
            <div className={styles.pathwayStepPillar}>
              <div className={`${styles.pathwayStepIcon} ${styles.pathwayStepIcon2}`}>
                <ShieldCheck size={15} strokeWidth={2.5} />
              </div>
              <div className={styles.pathwayStepInfo}>
                <span className={`${styles.pathwayStepPillarNum} ${styles.pathwayStepNum2}`}>
                  Step 2 · Treatment Tracking
                </span>
                <span className={styles.pathwayStepPillarVal}>
                  {total - critical - high}
                  <span className={styles.pathwayStepPillarSub}>low–mod</span>
                </span>
              </div>
            </div>

            {/* Step 3 pillar */}
            <div className={styles.pathwayStepPillar}>
              <div className={`${styles.pathwayStepIcon} ${styles.pathwayStepIcon3}`}>
                <Sparkles size={15} strokeWidth={2.5} />
              </div>
              <div className={styles.pathwayStepInfo}>
                <span className={`${styles.pathwayStepPillarNum} ${styles.pathwayStepNum3}`}>
                  Step 3 · Active Monitoring
                </span>
                <span className={styles.pathwayStepPillarVal}>
                  {stable + moderate}
                  <span className={styles.pathwayStepPillarSub}>stable–mod</span>
                </span>
              </div>
            </div>

            {/* Alerts pill */}
            {(critical + high) > 0 && (
              <div className={styles.pathwayAlertPill}>
                <span className={styles.pathwayAlertDot} />
                <span>{critical + high} Needs Review</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- Body -- */}
      <div className={styles.splitLayout}>
        {/* LEFT - Alert Zone */}
        <aside className={styles.actionZone}>
          {criticalPatients.length > 0 && (
            <div className={styles.alertPanel}>
              <div className={styles.alertPanelHeader}>
                <span className={styles.alertPulse} />
                <span className={styles.alertPanelTitle}>
                  {criticalPatients.length} Critical Patient{criticalPatients.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className={styles.criticalList}>
                {criticalPatients.map((p) => {
                  const initials = p.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                  const alert = latestOpenAlert(p);
                  const alertText = alert?.reason_text ?? p.patient_diagnoses?.[0]?.primary_diagnosis ?? "Needs review";
                  const score = p.red_flag_scores?.[0]?.global_score ?? "-";
                  return (
                    <div key={p.id} className={styles.criticalBlock}>
                      <div className={styles.criticalBlockTop}>
                        <div className={styles.criticalAvatar}>{initials}</div>
                        <div className={styles.criticalInfo}>
                          <p className={styles.criticalName}>
                            {p.name.split(" ")[0]}
                            <span className={styles.criticalBadge}>{alert?.alert_type ?? "CRITICAL"}</span>
                          </p>
                          <p className={styles.criticalAlert}>{alertText}</p>
                        </div>
                        <div className={styles.criticalScore}>{score}</div>
                      </div>
                      <div className={styles.criticalBlockActions}>
                        <button
                          type="button"
                          className={styles.criticalBtnView}
                          onClick={() => openPatient(p, "Treatment Folder")}
                        >
                          Emergency Rx
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {highPatients.length > 0 && (
            <div className={styles.watchPanel}>
              <p className={styles.watchPanelTitle}>Watch Closely</p>
              <div className={styles.watchList}>
                {highPatients.map((p) => {
                  const initials = p.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                  const alert = latestOpenAlert(p);
                  const score = p.red_flag_scores?.[0]?.global_score ?? "-";
                  const alertText = alert?.reason_text ?? p.patient_diagnoses?.[0]?.primary_diagnosis ?? "";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={styles.watchRow}
                      onClick={() => openPatient(p, "Treatment Folder")}
                    >
                      <div className={styles.watchAvatar}>{initials}</div>
                      <div className={styles.watchInfo}>
                        <p className={styles.watchName}>{p.name.split(" ")[0]}</p>
                        <p className={styles.watchAlert}>{alert?.alert_type ? `${alert.alert_type}: ${alertText}` : alertText}</p>
                      </div>
                      <span className={styles.watchScore}>{score}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.quickStats}>
            <div className={styles.qs}>
              <AnimatedNumber value={moderate} className={styles.qsVal} />
              <span className={styles.qsLbl}>Moderate</span>
            </div>
            <div className={styles.qsDivider} />
            <div className={styles.qs}>
              <AnimatedNumber value={stable} className={`${styles.qsVal} ${styles.qsGreen}`} />
              <span className={styles.qsLbl}>Stable</span>
            </div>
          </div>
        </aside>

        {/* RIGHT - Patient Grid */}
        <div className={styles.monitorZone}>
          <div className={styles.filterBar}>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} strokeWidth={2} />
              <input
                className={styles.searchInput}
                placeholder="Search by name, ID, or mobile number..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFilterKey((k) => k + 1); }}
              />
            </div>
            <div className={styles.segmentedGroup} role="tablist" aria-label="Filter patients by respiratory disease">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  className={`${styles.segmentedTab} ${filter === f ? styles.segmentedTabActive : ""}`}
                  onClick={() => handleFilterChange(f)}
                >
                  <span>{f}</span>
                  <span className={styles.segmentedCount}>{diseaseCounts[f] ?? 0}</span>
                </button>
              ))}
            </div>
            <label className={styles.sortWrap}>
              <span>Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as PatientSort);
                  setFilterKey((key) => key + 1);
                }}
                className={styles.sortSelect}
              >
                <option value="alert_desc">High alert to low</option>
                <option value="alert_asc">Low alert to high</option>
                <option value="name_asc">Name A-Z</option>
              </select>
            </label>
          </div>

          <div style={{ padding: "0 4px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#64748b", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            <span>Showing <strong>{filteredPatients.length}</strong> of <strong>{patients.length}</strong> patients</span>
            {(search || filter !== "All") && (
              <button
                type="button"
                onClick={() => { setSearch(""); setFilter("All"); setFilterKey((k) => k + 1); }}
                style={{ background: "none", border: "none", color: "var(--med-blue-600)", fontWeight: 600, fontSize: 12, cursor: "pointer", padding: 0 }}
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className={styles.tableContainer} key={filterKey}>
              <div className={styles.tableHeaderRow}>
                <span>Patient &amp; ID</span>
                <span>Diagnosis &amp; Comorbidities</span>
                <span>Risk Level</span>
                <span>Last Check-In</span>
                <span>Active Alerts</span>
                <span style={{ textAlign: "right" }}>Actions</span>
              </div>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : fetchError ? (
            <ErrorState message={fetchError} />
          ) : filteredPatients.length === 0 ? (
            patients.length === 0 ? (
              <EmptyState onAdd={() => onViewChange("create")} />
            ) : (
              <FilteredEmptyState
                search={search}
                filter={filter}
                onReset={() => { setSearch(""); setFilter("All"); setFilterKey((k) => k + 1); }}
              />
            )
          ) : (
            <div className={styles.tableContainer} key={filterKey}>
              <div className={styles.tableHeaderRow}>
                <span>Patient &amp; ID</span>
                <span>Diagnosis &amp; Comorbidities</span>
                <span>Risk Level</span>
                <span>Last Check-In</span>
                <span>Active Alerts</span>
                <span style={{ textAlign: "right" }}>Actions</span>
              </div>
              {filteredPatients.map((p, i) => (
                <PatientTableRow
                  key={p.id}
                  patient={p}
                  animIndex={i}
                  onClick={() => openPatient(p)}
                  onAnalyticsClick={(e) => { e.stopPropagation(); openPatient(p, "Analytics"); }}
                  onFolderClick={(e) => { e.stopPropagation(); openPatient(p, "Treatment Folder"); }}
                  onDeleteClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patient detail panel - real data via patientId */}
      {selectedPatient && (
        <PatientDetail
          patientId={selectedPatient.id}
          initialTab={selectedInitialTab}
          onClose={closePatient}
          onEdit={() => {
            const patientId = selectedPatient.id;
            closePatient();
            onEditPatient?.(patientId);
          }}
          onExport={() => { closePatient(); onViewChange("export"); }}
        />
      )}

      {showImport && (
        <ImportPatientModal
          doctorId={doctorId}
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); window.location.reload(); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          patient={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {showAlertsPanel && (
        <div
          onClick={() => setShowAlertsPanel(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
            zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 380, maxHeight: "80vh", overflowY: "auto",
              background: "#fff", borderRadius: "0 0 12px 12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              padding: "16px 0",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0ece6" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#132d36" }}>
                Alerts ({unacknowledgedAlerts})
              </span>
              <button
                onClick={() => setShowAlertsPanel(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 18, lineHeight: 1 }}
              >-</button>
            </div>
            {patients
              .filter((p) => countOpenAlerts(p) > 0)
              .flatMap((p) =>
                openAlerts(p).map((alert, i) => ({
                  patient: p,
                  alert,
                  key: `${p.id}-${i}`,
                }))
              )
              .sort((a, b) => new Date(b.alert.created_at ?? "").getTime() - new Date(a.alert.created_at ?? "").getTime())
              .map(({ patient: p, alert, key }) => (
                <div
                  key={key}
                  onClick={() => { setShowAlertsPanel(false); setSelectedPatient(p); setSelectedInitialTab("Overview"); }}
                  style={{
                    padding: "12px 16px", borderBottom: "1px solid #f5f0eb", cursor: "pointer",
                    background: alert.alert_type === "RED" ? "rgba(220,38,38,0.04)" : "rgba(234,179,8,0.04)",
                    transition: "background 140ms",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = alert.alert_type === "RED" ? "rgba(220,38,38,0.10)" : "rgba(234,179,8,0.10)")}
                  onMouseLeave={e => (e.currentTarget.style.background = alert.alert_type === "RED" ? "rgba(220,38,38,0.04)" : "rgba(234,179,8,0.04)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                      background: alert.alert_type === "RED" ? "#dc2626" : "#f59e0b",
                      color: "#fff", letterSpacing: "0.05em",
                    }}>
                      {alert.alert_type}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#132d36" }}>{p.name}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                    {alert.reason_text ?? "Alert triggered"}
                  </p>
                  {alert.created_at && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
                      {new Date(alert.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              ))
            }
            {unacknowledgedAlerts === 0 && (
              <p style={{ padding: "24px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                No active alerts
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
