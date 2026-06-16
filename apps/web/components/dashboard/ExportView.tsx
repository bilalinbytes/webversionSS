"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart2, Check, Table2, FileEdit, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./ExportView.module.css";

type ExportType = "Disease-Specific" | "Combined" | "Date-Wise" | "Weekly Snapshot" | "Monthly Summary" | "Single Patient";
type ExportFormat = "pdf" | "excel" | "csv";

const EXPORT_TYPES: { id: ExportType; apiKey: string; sub: string }[] = [
  { id: "Disease-Specific", apiKey: "disease_specific", sub: "Filter by diagnosis type" },
  { id: "Combined",        apiKey: "combined",          sub: "All diseases merged" },
  { id: "Date-Wise",       apiKey: "date_wise",         sub: "Select date range" },
  { id: "Weekly Snapshot", apiKey: "weekly",            sub: "7-day trend summary" },
  { id: "Monthly Summary", apiKey: "monthly",           sub: "30d + compliance rate" },
  { id: "Single Patient",  apiKey: "single_patient",    sub: "Full patient record" },
];

interface LivePatient {
  id: string;
  name: string;
  primary_diagnosis: string | null;
  risk: "critical" | "high" | "moderate" | "stable" | "none";
  score: number | null;
}

interface RecentExport {
  id: string;
  export_type: string;
  created_at: string | null;
  presigned_url: string | null;
}

interface ExportViewProps {
  onBack: () => void;
}

interface DoctorPatientRow {
  id: string;
  name: string;
  patient_diagnoses: { primary_diagnosis: string | null }[] | null;
  red_flag_scores: { global_score: number | null; computed_at: string | null }[] | null;
}

const DIAG_COLORS: Record<string, string> = {
  ild: "#1d9e75",
  copd: "#378add",
  asthma: "#639922",
  bronchiectasis: "#ef9f27",
  post_infection: "#a259e6",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function DateSelectInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);

  // Sync internal state → parent string value
  const emit = (y: number, m: number, d: number) => {
    const clamped = Math.min(d, daysInMonth(m, y));
    onChange(`${y}-${String(m).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`);
    setDay(clamped);
  };

  // Parse parent value into internal state on mount / external change
  useEffect(() => {
    if (!value) return;
    const [y, m, d] = value.split("-").map(Number);
    if (y) setYear(y);
    if (m) setMonth(m);
    if (d) setDay(d);
  }, [value]);

  const maxDay = daysInMonth(month, year);

  return (
    <div className={styles.dateSelects}>
      <select
        className={styles.dateSelect}
        value={day}
        onChange={(e) => { const d = Number(e.target.value); setDay(d); emit(year, month, d); }}
      >
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{String(d).padStart(2, "0")}</option>
        ))}
      </select>
      <select
        className={styles.dateSelect}
        value={month}
        onChange={(e) => { const m = Number(e.target.value); setMonth(m); emit(year, m, day); }}
      >
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>
      <select
        className={styles.dateSelect}
        value={year}
        onChange={(e) => { const y = Number(e.target.value); setYear(y); emit(y, month, day); }}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

function scoreToRisk(score: number | null): LivePatient["risk"] {
  if (score === null) return "none";
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "moderate";
  return "stable";
}

export function ExportView({ onBack }: ExportViewProps) {
  const [exportType, setExportType] = useState<ExportType>("Combined");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [patients, setPatients] = useState<LivePatient[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // ── New: Professional Excel export state ──────────────────────────────────
  const [xlsxExporting, setXlsxExporting] = useState<"all" | "selected" | null>(null);
  const [xlsxError, setXlsxError] = useState<string | null>(null);

  const handleXlsxExport = async (mode: "all" | "selected") => {
    setXlsxExporting(mode);
    setXlsxError(null);
    try {
      const body: { patient_ids?: string[] } = {};
      if (mode === "selected") {
        body.patient_ids = Array.from(selected);
      }
      const res = await fetch("/api/exports/excel", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      a.download = match?.[1] ?? "o2plus-patients.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setXlsxError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setXlsxExporting(null);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoadingPatients(false); return; }

      // Fetch primary + OTP-imported patients through the doctor API.
      const patientResponse = await fetch("/api/doctor/patients", { credentials: "include" });
      const patientPayload = await patientResponse.json().catch(() => null) as { patients?: DoctorPatientRow[] } | null;

      if (patientResponse.ok && patientPayload?.patients) {
        const live: LivePatient[] = patientPayload.patients.map((p) => {
          const scores = [...(p.red_flag_scores ?? [])].sort(
            (a, b) => new Date(b.computed_at ?? "").getTime() - new Date(a.computed_at ?? "").getTime()
          );
          const latestScore = scores[0]?.global_score ?? null;
          return {
            id: p.id,
            name: p.name,
            primary_diagnosis: (p.patient_diagnoses ?? [])[0]?.primary_diagnosis ?? null,
            risk: scoreToRisk(latestScore),
            score: latestScore,
          };
        }).sort((left, right) => (right.score ?? -1) - (left.score ?? -1) || left.name.localeCompare(right.name));
        setPatients(live);
        setSelected(new Set(live.map((p) => p.id)));
      }

      // Fetch recent exports (last 5)
      const { data: expData } = await supabase
        .from("export_records")
        .select("id, export_type, generated_at, presigned_url")
        .eq("doctor_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(5);

      if (expData) {
        setRecentExports(
          expData.map((r) => ({
            id: r.id,
            export_type: r.export_type ?? "unknown",
            created_at: r.generated_at,
            presigned_url: r.presigned_url,
          }))
        );
      }
      setLoadingPatients(false);
    });
  }, []);

  const togglePatient = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === patients.length ? new Set() : new Set(patients.map((p) => p.id)));
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const typeConfig = EXPORT_TYPES.find((t) => t.id === exportType);
      const body: Record<string, unknown> = {
        export_type: typeConfig?.apiKey ?? "combined",
        format: exportFormat,
        patient_ids: Array.from(selected),
      };
      if (exportType === "Disease-Specific") {
        body.disease_filter = diseaseFilter;
      }
      if (exportType === "Date-Wise") {
        body.start_date = startDate;
        body.end_date = endDate;
      }
      if (exportType === "Single Patient") {
        body.patient_id = Array.from(selected)[0];
      }

      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setExportError(payload?.details ?? payload?.error ?? `Export failed (${res.status})`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? `saans-export.${exportFormat === "excel" ? "xls" : exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  // Compute panel distribution from live data
  const diagCounts: Record<string, number> = {};
  patients.forEach((p) => {
    const d = (p.primary_diagnosis ?? "unknown").toLowerCase();
    diagCounts[d] = (diagCounts[d] ?? 0) + 1;
  });
  const totalPatients = patients.length;
  const criticalCount = patients.filter((p) => p.risk === "critical").length;

  const panelDist = Object.entries(diagCounts).map(([diag, count]) => ({
    label: diag.toUpperCase(),
    count,
    pct: totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0,
    color: DIAG_COLORS[diag] ?? "#888",
  })).sort((a, b) => b.count - a.count);
  const diseaseOptions = useMemo(
    () =>
      Array.from(
        new Set(
          patients
            .map((patient) => patient.primary_diagnosis?.toLowerCase())
            .filter((diagnosis): diagnosis is string => Boolean(diagnosis)),
        ),
      ).sort(),
    [patients],
  );
  const canExport =
    selected.size > 0 &&
    (exportType !== "Disease-Specific" || Boolean(diseaseFilter)) &&
    (exportType !== "Date-Wise" || (Boolean(startDate) && Boolean(endDate))) &&
    (exportType !== "Single Patient" || selected.size === 1);

  useEffect(() => {
    if (exportType !== "Disease-Specific") return;
    if (diseaseFilter && diseaseOptions.includes(diseaseFilter)) return;
    setDiseaseFilter(diseaseOptions[0] ?? "");
  }, [diseaseFilter, diseaseOptions, exportType]);

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Export Patient Data</h1>
          <p className={styles.sub}>6 export types · PDF, Excel, CSV · Downloads directly to your device</p>
        </div>
        <button type="button" className={styles.btnGhost} onClick={onBack}>← Dashboard</button>
      </div>

      {/* ── Professional Excel Export ─────────────────────────────────────── */}
      <div className={styles.xlsxActions} style={{ padding: "12px 24px", display: "flex", gap: 10, flexShrink: 0, borderBottom: "1px solid rgba(19,45,54,0.08)", background: "#fff" }}>
        <button
          type="button"
          className={styles.xlsxBtnOutline}
          style={{ background: "none", border: "1.5px solid rgba(19,45,54,0.18)", color: "#496977", height: 38, padding: "0 16px", borderRadius: 8, fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          disabled={xlsxExporting !== null || selected.size === 0}
          onClick={() => handleXlsxExport("selected")}
        >
          {xlsxExporting === "selected"
            ? "Generating…"
            : `Export Selected (${selected.size})`}
        </button>
        <button
          type="button"
          className={styles.xlsxBtnPrimary}
          disabled={xlsxExporting !== null || patients.length === 0}
          onClick={() => handleXlsxExport("all")}
        >
          {xlsxExporting === "all"
            ? "Generating…"
            : `Export All My Patients (${patients.length})`}
        </button>
        {xlsxError && (
          <p style={{ fontSize: 12, color: "#c94d49", margin: "auto 0" }}>{xlsxError}</p>
        )}
      </div>

      <div className={styles.layout}>
        {/* Left */}
        <div className={styles.left}>
          {/* Summary stats — live */}
          <div className={styles.summaryGrid}>
            {[
              { val: totalPatients, lbl: "Total patients" },
              { val: criticalCount, lbl: "Critical alerts", red: true },
              { val: Object.keys(diagCounts).length, lbl: "Disease types" },
              { val: Array.from(selected).length, lbl: "Selected" },
            ].map((s) => (
              <div key={s.lbl} className={styles.summaryCard}>
                <p className={`${styles.summaryVal} ${s.red ? styles.summaryRed : ""}`}>{s.val}</p>
                <p className={styles.summaryLbl}>{s.lbl}</p>
              </div>
            ))}
          </div>

          {/* Panel distribution — live */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>
              <BarChart2 size={15} strokeWidth={1.5} style={{ color: "#0f6e56" }} />
              Panel Distribution
            </p>
            {panelDist.map((d) => (
              <div key={d.label} className={styles.barRow}>
                <span className={styles.barLabel}>{d.label}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${d.pct}%`, background: d.color }} />
                </div>
                <span className={styles.barCount}>{d.count}</span>
              </div>
            ))}
            {panelDist.length === 0 && <p style={{ fontSize: 12, color: "#888" }}>No data yet.</p>}
          </div>

          {/* Export type */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>
              <Table2 size={15} strokeWidth={1.5} style={{ color: "#0f6e56" }} />
              Export Type
            </p>
            <div className={styles.typeGrid}>
              {EXPORT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.typeCard} ${exportType === t.id ? styles.typeCardSelected : ""}`}
                  onClick={() => {
                    setExportType(t.id);
                    setExportError(null);
                  }}
                >
                  <p className={styles.typeTitle}>{t.id}</p>
                  <p className={styles.typeSub}>{t.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Format & options */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>
              <FileEdit size={15} strokeWidth={1.5} style={{ color: "#0f6e56" }} />
              Format &amp; Options
            </p>
            <p className={styles.formatLabel}>File Format</p>
            <div className={styles.formatPills}>
              {[
                { id: "pdf", label: "PDF Report" },
                { id: "excel", label: "Excel" },
                { id: "csv", label: "CSV" },
              ].map((format) => (
                <button
                  key={format.id}
                  type="button"
                  className={`${styles.formatPill} ${exportFormat === format.id ? styles.formatPillActive : ""}`}
                  onClick={() => setExportFormat(format.id as ExportFormat)}
                >
                  {format.label}
                </button>
              ))}
            </div>
            {exportType === "Disease-Specific" && (
              <div className={styles.dateField}>
                <label className={styles.dateLabel}>Disease</label>
                <select
                  className={styles.dateSelect}
                  value={diseaseFilter}
                  onChange={(event) => setDiseaseFilter(event.target.value)}
                >
                  {diseaseOptions.map((diagnosis) => (
                    <option key={diagnosis} value={diagnosis}>
                      {diagnosis.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {exportType === "Date-Wise" && (
              <div className={styles.dateGrid}>
                <div className={styles.dateField}>
                  <label className={styles.dateLabel}>Start Date</label>
                  <DateSelectInput value={startDate} onChange={setStartDate} />
                </div>
                <div className={styles.dateField}>
                  <label className={styles.dateLabel}>End Date</label>
                  <DateSelectInput value={endDate} onChange={setEndDate} />
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exporting || !canExport}
          >
            {exporting ? `Generating ${exportFormat.toUpperCase()}...` : `Export ${Array.from(selected).length} Patients - ${exportFormat.toUpperCase()} ->`}
          </button>
          {exportType === "Single Patient" && selected.size !== 1 && (
            <p style={{ fontSize: 12, color: "#b54708", marginTop: 8 }}>
              Select exactly one patient for a single-patient export.
            </p>
          )}
          {exportError && (
            <p style={{ fontSize: 12, color: "#b42318", marginTop: 8 }}>
              {exportError}
            </p>
          )}

        </div>

        {/* Right */}
        <div className={styles.right}>
          {/* Patient selection — live */}
          <div>
            <p className={styles.rightTitle}>Select Patients</p>
            <button type="button" className={styles.selectAll} onClick={toggleAll}>
              <div className={`${styles.ckbox} ${selected.size === patients.length && patients.length > 0 ? styles.ckboxChecked : ""}`}>
                {selected.size === patients.length && patients.length > 0 && <Check size={10} strokeWidth={3} />}
              </div>
              <span>Select all {totalPatients} patients</span>
            </button>
            <div className={styles.patientList}>
              {loadingPatients ? (
                <p style={{ fontSize: 12, color: "#888", padding: "12px 0" }}>Loading patients…</p>
              ) : (
                patients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.patientRow} ${selected.has(p.id) ? styles.patientRowSelected : ""}`}
                    onClick={() => togglePatient(p.id)}
                  >
                    <div className={styles.patientLeft}>
                      <div className={`${styles.ckbox} ${selected.has(p.id) ? styles.ckboxChecked : ""}`}>
                        {selected.has(p.id) && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span className={styles.patientName}>{p.name}</span>
                    </div>
                    <div className={styles.patientRight}>
                      <span className={styles.diagTag}>{p.primary_diagnosis?.toUpperCase() ?? "—"}</span>
                      <span
                        className={styles.scoreTag}
                        style={{
                          color: p.risk === "critical" ? "#e24b4a"
                            : p.risk === "high" ? "#d85a30"
                            : p.risk === "moderate" ? "#ef9f27"
                            : "#639922",
                        }}
                      >
                        {p.score ?? "—"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Recent exports — live */}
          <div>
            <p className={styles.rightTitle}>Recent Exports</p>
            {recentExports.length === 0 ? (
              <p style={{ fontSize: 12, color: "#888" }}>No exports yet.</p>
            ) : (
              recentExports.map((h) => (
                <div key={h.id} className={styles.histItem}>
                  <div className={styles.histIcon}>
                    <FileText size={13} strokeWidth={1.5} style={{ color: "#0f6e56" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className={styles.histName}>{h.export_type} export</p>
                    <p className={styles.histMeta}>
                      {h.created_at ? new Date(h.created_at).toLocaleString("en-IN") : "Unknown time"}
                    </p>
                  </div>
                  {h.presigned_url && (
                    <a
                      href={h.presigned_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: "#126969" }}
                    >
                      Download
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
