"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Search, Bell, Download, Users, Trash2, FolderOpen } from "lucide-react";
import { PatientDetail } from "./PatientDetail";
import { ImportPatientModal } from "./ImportPatientModal";
import { createClient } from "@/lib/supabase/client";
import styles from "./DashboardView.module.css";

// ── Types aligned to Supabase schema ──────────────────────────────────────────
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

// Map score → internal risk level
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

function diagnosisAlreadyNamesDashboard(diagnosis: string, dashboard: string): boolean {
  const normalizedDiagnosis = diagnosis.toLowerCase();
  const normalizedDashboard = dashboard.toLowerCase();
  if (!dashboard) return true;
  if (normalizedDashboard === "post icu") {
    return normalizedDiagnosis.includes("post icu") || normalizedDiagnosis.includes("post-icu");
  }
  return normalizedDiagnosis.includes(normalizedDashboard);
}

function formatDiagnosisLine(patient: SupabasePatient): string {
  const diagnosisRow = patient.patient_diagnoses?.[0];
  const diagnosis = diagnosisRow?.primary_diagnosis?.trim() ?? "";
  const dashboard = formatDashboardLabel(diagnosisRow?.effective_dashboard);
  const dashboardPart = diagnosis && diagnosisAlreadyNamesDashboard(diagnosis, dashboard) ? "" : dashboard;
  const parts = [diagnosis, dashboardPart]
    .filter((part): part is string => part.trim().length > 0);

  return parts.length > 0 ? parts.join(" / ") : "No diagnosis recorded";
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

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────
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
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Patient card ──────────────────────────────────────────────────────────────
function PatientCard({
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
  const [pressed, setPressed] = useState(false);

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

  const riskBorderClass = {
    critical: styles.cardBorderCritical,
    high:     styles.cardBorderHigh,
    moderate: styles.cardBorderModerate,
    stable:   styles.cardBorderStable,
    none:     styles.cardBorderNone,
  }[risk];

  // SRS §2.2 — labels must be RED/ORANGE/YELLOW/GREEN
  const riskLabel: Record<RiskLevel, string> = {
    critical: "RED",
    high:     "ORANGE",
    moderate: "YELLOW",
    stable:   "GREEN",
    none:     "No data",
  };

  const avatarClass = {
    critical: styles.avatarCritical,
    high:     styles.avatarHigh,
    moderate: styles.avatarModerate,
    stable:   styles.avatarStable,
    none:     styles.avatarNone,
  }[risk];

  const scoreClass = {
    critical: styles.scoreCritical,
    high:     styles.scoreHigh,
    moderate: styles.scoreModerate,
    stable:   styles.scoreStable,
    none:     styles.scoreNone,
  }[risk];

  return (
    <article
      className={`${styles.patientCard} ${riskBorderClass} ${pressed ? styles.cardPressed : ""}`}
      style={{ animationDelay: `${animIndex * 50}ms` }}
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className={styles.cardTop}>
        <div className={`${styles.cardAvatar} ${avatarClass}`}>{initials}</div>
        <div className={styles.cardMeta}>
          <div className={styles.cardName}>{patient.name}</div>
        </div>
        {score !== null ? (
          <div className={`${styles.cardScore} ${scoreClass}`}>{score}</div>
        ) : (
          <div className={`${styles.cardScore} ${styles.scoreNone}`}>—</div>
        )}
      </div>

      <div className={styles.cardRiskRow}>
        <span className={`${styles.riskBadge} ${styles[`riskBadge_${risk}`]} ${risk === "critical" ? styles.riskBadgeBlink : ""}`}>
          {riskLabel[risk]}
        </span>
        <span className={styles.cardRiskMeta} title={diagnosisLine}>{diagnosisLine}</span>
      </div>
      <div className={styles.cardComorbidityRow} title={comorbidityLine}>
        {comorbidityLine}
      </div>
      {latestAlert?.reason_text && (
        <p className={styles.cardAlertReason}>{latestAlert.reason_text}</p>
      )}

      <div className={styles.cardFooter}>
        <span className={styles.cardLastLog}>Last: {lastLog}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            aria-label={`Delete ${patient.name}`}
            onClick={onDeleteClick}
            style={{
              padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(201,77,73,0.25)",
              background: "rgba(201,77,73,0.06)", color: "#c94d49", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 160ms ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,77,73,0.14)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(201,77,73,0.06)")}
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={styles.cardAnalyticsBtn}
            onClick={onAnalyticsClick}
          >
            <Activity size={12} strokeWidth={2} />
            Analytics
          </button>
          <button
            type="button"
            className={styles.cardFolderBtn}
            aria-label={`Open treatment folder for ${patient.name}`}
            title="Treatment folder"
            onClick={onFolderClick}
          >
            <FolderOpen size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={styles.cardViewBtn}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            View
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skRow}>
        <div className={`${styles.skCircle} ${styles.shimmer}`} />
        <div className={styles.skLines}>
          <div className={`${styles.skLine} ${styles.skLineLong} ${styles.shimmer}`} />
          <div className={`${styles.skLine} ${styles.skLineShort} ${styles.shimmer}`} />
        </div>
      </div>
      <div className={`${styles.skBlock} ${styles.shimmer}`} />
      <div className={`${styles.skLine} ${styles.skLineMed} ${styles.shimmer}`} />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
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

// ── Error state ───────────────────────────────────────────────────────────────
function ErrorState({ message }: { message: string }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>Unable to load patients</p>
      <p className={styles.emptySubtitle}>{message}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
  // SRS §1.3 / §2.1 — real unacknowledged alert count from disease_alerts
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SupabasePatient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fixingLogins, setFixingLogins] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);

  const handleFixLogins = useCallback(async () => {
    setFixingLogins(true);
    setFixResult(null);
    try {
      const res = await fetch("/api/patients/provision-auth-bulk", { method: "POST" });
      const body = await res.json() as {
        ok?: boolean;
        created?: number;
        fixed?: number;
        relinked?: number;
        already_existed?: number;
        skipped?: number;
        errors?: number;
        error_details?: { id: string; phone: string; error?: string }[];
        error?: string;
      };
      if (res.ok) {
        const parts: string[] = [];
        if ((body.created ?? 0) > 0) parts.push(`${body.created} patient(s) can now log in`);
        if ((body.fixed ?? 0) > 0) parts.push(`${body.fixed} patient(s) login fixed`);
        if ((body.relinked ?? 0) > 0) parts.push(`${body.relinked} re-linked`);
        if ((body.already_existed ?? 0) > 0) parts.push(`${body.already_existed} already had access`);
        if ((body.skipped ?? 0) > 0) parts.push(`${body.skipped} skipped (invalid phone)`);
        if ((body.errors ?? 0) > 0) {
          const detail = body.error_details?.map(e => `${e.phone}: ${e.error}`).join("; ") ?? "";
          parts.push(`${body.errors} failed${detail ? ` — ${detail}` : ""}`);
        }
        setFixResult(parts.length > 0 ? parts.join(" · ") : "Nothing to fix — all patients already have login access.");
      } else {
        setFixResult(`Failed: ${body.error ?? "unknown error"}`);
      }
    } catch {
      setFixResult("Network error — please try again.");
    } finally {
      setFixingLogins(false);
    }
  }, []);

  const loadPatients = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setDoctorId(user.id);

    const response = await fetch("/api/doctor/patients", { credentials: "include" });
    const body = await response.json() as { patients?: SupabasePatient[]; error?: string };

    if (!response.ok) {
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
    // SRS §2.5 — search by name OR patient ID
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
    const effectiveDashboard = diagnosisRow?.effective_dashboard ?? "";
    const matchFilter =
      filter === "All" ||
      (filter === "Post ICU" && (diagLabel.toLowerCase().includes("post icu") || effectiveDashboard === "post_icu")) ||
      diagLabel.toLowerCase().includes(filter.toLowerCase());
    return matchSearch && matchFilter;
  }).sort((left, right) => {
    if (sortBy === "name_asc") return left.name.localeCompare(right.name);
    const leftScore = patientScore(left);
    const rightScore = patientScore(right);
    const scoreDelta = sortBy === "alert_asc" ? leftScore - rightScore : rightScore - leftScore;
    if (scoreDelta !== 0) return scoreDelta;
    return left.name.localeCompare(right.name);
  });

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
      const response = await fetch("/api/doctor/alerts/acknowledge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id }),
      });
      if (!response.ok) return;
    } catch {
      // Non-fatal: opening the patient should not fail if acknowledgement fails.
    }
  }, []);

  const openPatient = useCallback((patient: SupabasePatient, tab: string = "Overview") => {
    setSelectedInitialTab(tab);
    setSelectedPatient(patient);
    void acknowledgePatientAlerts(patient);
  }, [acknowledgePatientAlerts]);

  // Today's date — computed client-side only to avoid SSR hydration mismatch
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
      {/* ── Top bar ── */}
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
          <div className={styles.topStat}>
            <ShakingBell count={unacknowledgedAlerts} />
            <span className={styles.topStatLbl}>Alerts</span>
          </div>
        </div>
        <div className={styles.topBarActions}>
          <button type="button" className={styles.btnGhost} onClick={() => onViewChange("export")}>
            Export
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={handleFixLogins}
            disabled={fixingLogins}
            title="Activate login access for all patients who can't log in yet"
            style={{ color: fixingLogins ? "#888" : "#126969", borderColor: "rgba(18,105,105,0.3)" }}
          >
            {fixingLogins ? "Fixing…" : "Fix Patient Logins"}
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

      {/* Fix logins result toast */}
      {fixResult && (
        <div style={{
          margin: "0 24px",
          padding: "10px 16px",
          borderRadius: 8,
          background: fixResult.startsWith("Failed") || fixResult.startsWith("Network") ? "#fdecea" : "#e8f5f1",
          border: `1px solid ${fixResult.startsWith("Failed") || fixResult.startsWith("Network") ? "#fca5a5" : "#a7d7c5"}`,
          fontSize: 13,
          color: fixResult.startsWith("Failed") || fixResult.startsWith("Network") ? "#c94d49" : "#0f6e56",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}>
          <span>{fixResult}</span>
          <button
            type="button"
            onClick={() => setFixResult(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, lineHeight: 1, color: "inherit", padding: 0 }}
          >×</button>
        </div>
      )}

      {/* ── Body ── */}
      <div className={styles.splitLayout}>
        {/* LEFT — Alert Zone */}
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
                  const score = p.red_flag_scores?.[0]?.global_score ?? "—";
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
                  const score = p.red_flag_scores?.[0]?.global_score ?? "—";
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

        {/* RIGHT — Patient Grid */}
        <div className={styles.monitorZone}>
          <div className={styles.filterBar}>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} strokeWidth={2} />
              <input
                className={styles.searchInput}
                placeholder="Search patient…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFilterKey((k) => k + 1); }}
              />
            </div>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`${styles.chip} ${filter === f ? styles.chipActive : ""}`}
                onClick={() => handleFilterChange(f)}
              >
                {f}
              </button>
            ))}
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

          {loading ? (
            <div className={styles.monitorGrid} key={filterKey}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : fetchError ? (
            <ErrorState message={fetchError} />
          ) : filteredPatients.length === 0 ? (
            <EmptyState onAdd={() => onViewChange("create")} />
          ) : (
            <div className={styles.monitorGrid} key={filterKey}>
              {filteredPatients.map((p, i) => (
                <PatientCard
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

      {/* Patient detail panel — real data via patientId */}
      {selectedPatient && (
        <PatientDetail
          patientId={selectedPatient.id}
          initialTab={selectedInitialTab}
          onClose={() => setSelectedPatient(null)}
          onEdit={() => {
            const patientId = selectedPatient.id;
            setSelectedPatient(null);
            onEditPatient?.(patientId);
          }}
          onExport={() => { setSelectedPatient(null); onViewChange("export"); }}
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
    </div>
  );
}
