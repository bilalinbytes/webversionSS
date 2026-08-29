"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  CheckSquare,
  User,
  Activity,
  Calendar,
  FileSpreadsheet,
  FileText,
  FileCode,
  Check,
  Search,
  AlertCircle,
  Download,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./ExportView.module.css";

export type ExportScope =
  | "All Patients"
  | "Selected Patients"
  | "Single Patient"
  | "Disease-Specific"
  | "Date-Wise"
  | "Daily"
  | "Weekly"
  | "Bi-Weekly (15 Days)"
  | "Monthly";

export type ExportFormat = "excel" | "csv" | "pdf";

interface LivePatient {
  id: string;
  name: string;
  primary_diagnosis: string | null;
  risk: "critical" | "high" | "moderate" | "stable" | "none";
  score: number | null;
  created_at: string | null;
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
  created_at: string | null;
  patient_diagnoses: { primary_diagnosis: string | null; effective_dashboard: string | null }[] | null;
  red_flag_scores: { global_score: number | null; computed_at: string | null }[] | null;
}

const PRIMARY_SCOPES: Array<{
  id: ExportScope;
  apiKey: string;
  title: string;
  description: string;
  icon: typeof Users;
}> = [
  {
    id: "All Patients",
    apiKey: "all_patients",
    title: "All Patients",
    description: "Complete patient registry",
    icon: Users,
  },
  {
    id: "Selected Patients",
    apiKey: "selected_patients",
    title: "Selected Patients",
    description: "Export only selected patients",
    icon: CheckSquare,
  },
  {
    id: "Single Patient",
    apiKey: "single_patient",
    title: "Single Patient",
    description: "Complete record for one patient",
    icon: User,
  },
  {
    id: "Disease-Specific",
    apiKey: "disease_specific",
    title: "Disease-Specific",
    description: "Export patients by diagnosis",
    icon: Activity,
  },
  {
    id: "Date-Wise",
    apiKey: "date_wise",
    title: "Date-Wise",
    description: "Export records within a date range",
    icon: Calendar,
  },
];

const TREND_SCOPES: Array<{
  id: ExportScope;
  apiKey: string;
  title: string;
  description: string;
}> = [
  { id: "Daily", apiKey: "daily", title: "Daily", description: "24-hour snapshot" },
  { id: "Weekly", apiKey: "weekly", title: "Weekly", description: "7-day trend with worst score" },
  { id: "Bi-Weekly (15 Days)", apiKey: "bi_weekly", title: "Bi-Weekly", description: "15-day trend with worst score" },
  { id: "Monthly", apiKey: "monthly", title: "Monthly", description: "30-day trend with worst score" },
];

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

  const emit = (y: number, m: number, d: number) => {
    const clamped = Math.min(d, daysInMonth(m, y));
    onChange(`${y}-${String(m).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`);
    setDay(clamped);
  };

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
        onChange={(e) => {
          const d = Number(e.target.value);
          setDay(d);
          emit(year, month, d);
        }}
      >
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {String(d).padStart(2, "0")}
          </option>
        ))}
      </select>
      <select
        className={styles.dateSelect}
        value={month}
        onChange={(e) => {
          const m = Number(e.target.value);
          setMonth(m);
          emit(year, m, day);
        }}
      >
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        className={styles.dateSelect}
        value={year}
        onChange={(e) => {
          const y = Number(e.target.value);
          setYear(y);
          emit(y, month, day);
        }}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
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
  const [scope, setScope] = useState<ExportScope>("All Patients");
  const [format, setFormat] = useState<ExportFormat>("excel");

  // Conditional filter states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [singlePatientId, setSinglePatientId] = useState<string>("");
  const [diseaseFilter, setDiseaseFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Search & data states
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<LivePatient[]>([]);
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Fetch live doctor patients
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoadingPatients(false);
        return;
      }

      const patientResponse = await fetch("/api/doctor/patients", { credentials: "include" });
      const patientPayload = (await patientResponse.json().catch(() => null)) as {
        patients?: DoctorPatientRow[];
      } | null;

      if (patientResponse.ok && patientPayload?.patients) {
        const live: LivePatient[] = patientPayload.patients
          .map((p) => {
            const scores = [...(p.red_flag_scores ?? [])].sort(
              (a, b) =>
                new Date(b.computed_at ?? "").getTime() - new Date(a.computed_at ?? "").getTime(),
            );
            const latestScore = scores[0]?.global_score ?? null;
            return {
              id: p.id,
              name: p.name,
              primary_diagnosis:
                (p.patient_diagnoses ?? [])[0]?.primary_diagnosis ??
                (p.patient_diagnoses ?? [])[0]?.effective_dashboard ??
                null,
              risk: scoreToRisk(latestScore),
              score: latestScore,
              created_at: p.created_at,
            };
          })
          .sort(
            (a, b) =>
              (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name),
          );

        setPatients(live);
        setSelectedIds(new Set(live.map((p) => p.id)));
        if (live.length > 0 && live[0]) {
          setSinglePatientId(live[0].id);
        }
      }

      // Fetch recent export logs
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
            export_type: r.export_type ?? "registry",
            created_at: r.generated_at,
            presigned_url: r.presigned_url,
          })),
        );
      }
      setLoadingPatients(false);
    });
  }, []);

  // Filtered patients by search query
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase().trim();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.primary_diagnosis ?? "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [patients, searchQuery]);

  // Distinct disease options with counts
  const diseaseBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    patients.forEach((p) => {
      const diag = p.primary_diagnosis || "Other";
      counts[diag] = (counts[diag] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [patients]);

  useEffect(() => {
    if (scope === "Disease-Specific" && !diseaseFilter && diseaseBreakdown.length > 0 && diseaseBreakdown[0]) {
      setDiseaseFilter(diseaseBreakdown[0].name);
    }
  }, [scope, diseaseFilter, diseaseBreakdown]);

  // Toggle single patient selection
  const togglePatientSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === patients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patients.map((p) => p.id)));
    }
  };

  // Format label for button
  const formatLabel = format === "excel" ? "Excel" : format === "csv" ? "CSV" : "PDF Report";

  // Dynamic Button Text (Requirement 4)
  const getExportButtonText = (): string => {
    if (exporting) return `Generating ${formatLabel}-`;

    switch (scope) {
      case "All Patients":
        return `Export All Patients - ${formatLabel}`;
      case "Selected Patients": {
        const count = selectedIds.size;
        if (count === 1) return `Export 1 Patient - ${formatLabel}`;
        return `Export ${count} Patients - ${formatLabel}`;
      }
      case "Single Patient":
        return `Export Single Patient - ${formatLabel}`;
      case "Disease-Specific":
        return `Export Disease-Specific Records - ${formatLabel}`;
      case "Date-Wise":
        return `Export Date-Wise Records - ${formatLabel}`;
      case "Daily":
        return `Export Daily Trends - ${formatLabel}`;
      case "Weekly":
        return `Export Weekly Trends - ${formatLabel}`;
      case "Bi-Weekly (15 Days)":
        return `Export Bi-Weekly Trends - ${formatLabel}`;
      case "Monthly":
        return `Export Monthly Trends - ${formatLabel}`;
      default:
        return `Export Patient Records - ${formatLabel}`;
    }
  };

  // Validation
  const isExportReady = useMemo(() => {
    if (patients.length === 0) return false;
    if (scope === "Selected Patients" && selectedIds.size === 0) return false;
    if (scope === "Single Patient" && !singlePatientId) return false;
    if (scope === "Disease-Specific" && !diseaseFilter) return false;
    if (scope === "Date-Wise" && (!startDate || !endDate)) return false;
    return true;
  }, [scope, patients.length, selectedIds.size, singlePatientId, diseaseFilter, startDate, endDate]);

  // Main Export Handler
  const handleExport = async () => {
    setExporting(true);
    setExportError(null);

    try {
      const allScopeList = [...PRIMARY_SCOPES, ...TREND_SCOPES];
      const currentScopeConfig = allScopeList.find((s) => s.id === scope);
      const apiKey = currentScopeConfig?.apiKey ?? "all_patients";

      const body: Record<string, unknown> = {
        export_type: apiKey,
        format,
      };

      if (scope === "Selected Patients") {
        body.patient_ids = Array.from(selectedIds);
      } else if (scope === "Single Patient") {
        body.patient_id = singlePatientId;
        body.patient_ids = [singlePatientId];
      } else if (scope === "Disease-Specific") {
        body.disease_filter = diseaseFilter;
      } else if (scope === "Date-Wise") {
        body.start_date = startDate;
        body.end_date = endDate;
      }

      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string; details?: string } | null;
        throw new Error(payload?.error ?? payload?.details ?? `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const match = contentDisposition.match(/filename="(.+)"/);
      const extension = format === "excel" ? "xlsx" : format === "csv" ? "csv" : "pdf";
      a.download = match?.[1] ?? `O2Plus_Patient_Export.${extension}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to generate export file.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={styles.view}>
      {/* Top Header Bar */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Export Patient Data</h1>
          <p className={styles.sub}>
            Clinical Cohort Registry &amp; Dossiers - Standard clinical registry .xlsx, CSV, and Clinical PDF
          </p>
        </div>
        <button type="button" className={styles.btnGhost} onClick={onBack}>
          - Back to Dashboard
        </button>
      </div>

      <div className={styles.layout}>
        {/* Left Column: Configuration Workflow */}
        <div className={styles.left}>
          {/* SECTION 1: EXPORT SCOPE */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>1</span>
              <div>
                <p className={styles.cardTitle}>Export Scope</p>
                <p className={styles.cardSubtitle}>Select patient cohort or report mode</p>
              </div>
            </div>

            {/* Primary: PATIENT EXPORTS */}
            <p className={styles.groupLabel}>PATIENT EXPORTS</p>
            <div className={styles.scopeGrid}>
              {PRIMARY_SCOPES.map((s) => {
                const IconComponent = s.icon;
                const isSelected = scope === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`${styles.scopeCard} ${isSelected ? styles.scopeCardActive : ""}`}
                    onClick={() => {
                      setScope(s.id);
                      if (s.id === "Single Patient") setFormat("pdf");
                      setExportError(null);
                    }}
                  >
                    <div className={styles.scopeIconWrapper}>
                      <IconComponent
                        size={18}
                        strokeWidth={2}
                        className={isSelected ? styles.scopeIconActive : styles.scopeIcon}
                      />
                    </div>
                    <div className={styles.scopeText}>
                      <p className={styles.scopeTitle}>{s.title}</p>
                      <p className={styles.scopeDesc}>{s.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Secondary: CLINICAL TREND EXPORTS */}
            <div className={styles.secondarySection}>
              <div className={styles.trendHeader}>
                <TrendingUp size={14} style={{ color: "var(--med-blue-600)" }} />
                <span className={styles.groupLabel} style={{ margin: 0 }}>CLINICAL TREND EXPORTS</span>
              </div>
              <div className={styles.trendGrid}>
                {TREND_SCOPES.map((t) => {
                  const isSelected = scope === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`${styles.trendCard} ${isSelected ? styles.trendCardActive : ""}`}
                      onClick={() => {
                        setScope(t.id);
                        setExportError(null);
                      }}
                    >
                      <p className={styles.trendTitle}>{t.title}</p>
                      <p className={styles.trendDesc}>{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: CONDITIONAL FILTERS */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>2</span>
              <div>
                <p className={styles.cardTitle}>Conditional Filters</p>
                <p className={styles.cardSubtitle}>
                  {scope === "All Patients" && "Exporting entire registered cohort"}
                  {scope === "Selected Patients" && `${selectedIds.size} of ${patients.length} patients selected`}
                  {scope === "Single Patient" && "Select specific patient to export dossier"}
                  {scope === "Disease-Specific" && "Filter patients by primary diagnosis"}
                  {scope === "Date-Wise" && "Select chronological date range"}
                  {(scope === "Daily" || scope === "Weekly" || scope === "Bi-Weekly (15 Days)" || scope === "Monthly") && `Aggregating trends for ${scope} window`}
                </p>
              </div>
            </div>

            {/* All Patients: Informative confirmation banner */}
            {(scope === "All Patients" || scope === "Daily" || scope === "Weekly" || scope === "Bi-Weekly (15 Days)" || scope === "Monthly") && (
              <div className={styles.infoBanner}>
                <ShieldCheck size={20} className={styles.infoIcon} />
                <div>
                  <p className={styles.infoTitle}>
                    {scope === "All Patients" ? "Clinical Patient Registry & Disease Tracks" : `${scope} Cohort Trends`}
                  </p>
                  <p className={styles.infoText}>
                    Generates the <strong>Master Patient Registry</strong> along with dedicated <strong>Disease-Specific Tracks (ILD, Asthma, COPD, Bronchiectasis, Post-ICU)</strong> containing every individual response, calculated score/sub-score, and clinical interpretation.
                  </p>
                </div>
              </div>
            )}

            {/* Selected Patients: Selection interface with search and counter */}
            {scope === "Selected Patients" && (
              <div className={styles.filterSection}>
                <div className={styles.filterBar}>
                  <div className={styles.searchBox}>
                    <Search size={15} className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search patient name, diagnosis, or UHID-"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button type="button" className={styles.btnSecondary} onClick={toggleSelectAll}>
                    {selectedIds.size === patients.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className={styles.patientSelectionCount}>
                  <CheckSquare size={15} style={{ color: "var(--med-blue-600)" }} />
                  <span>
                    <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? "patient" : "patients"} selected
                  </span>
                </div>

                <div className={styles.patientListScroll}>
                  {filteredPatients.map((p) => {
                    const isChecked = selectedIds.has(p.id);
                    return (
                      <div
                        key={p.id}
                        className={`${styles.patientSelectRow} ${isChecked ? styles.patientSelectRowChecked : ""}`}
                        onClick={() => togglePatientSelection(p.id)}
                      >
                        <div className={`${styles.customCheckbox} ${isChecked ? styles.customCheckboxChecked : ""}`}>
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div className={styles.patientSelectInfo}>
                          <p className={styles.patientSelectName}>{p.name}</p>
                          <p className={styles.patientSelectMeta}>
                            UHID: P-{p.id.slice(0, 8).toUpperCase()} - {p.primary_diagnosis ?? "Unspecified"}
                          </p>
                        </div>
                        <span className={`${styles.riskBadge} ${styles[`risk_${p.risk}`]}`}>
                          {p.risk.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Single Patient: Searchable Radio Selector */}
            {scope === "Single Patient" && (
              <div className={styles.filterSection}>
                <div className={styles.searchBox}>
                  <Search size={15} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search patient name, diagnosis, or UHID-"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className={styles.patientListScroll}>
                  {filteredPatients.map((p) => {
                    const isSelected = singlePatientId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`${styles.patientSelectRow} ${isSelected ? styles.patientSelectRowChecked : ""}`}
                        onClick={() => setSinglePatientId(p.id)}
                      >
                        <div className={`${styles.customRadio} ${isSelected ? styles.customRadioChecked : ""}`}>
                          {isSelected && <div className={styles.customRadioDot} />}
                        </div>
                        <div className={styles.patientSelectInfo}>
                          <p className={styles.patientSelectName}>{p.name}</p>
                          <p className={styles.patientSelectMeta}>
                            UHID: P-{p.id.slice(0, 8).toUpperCase()} - {p.primary_diagnosis ?? "Unspecified"}
                          </p>
                        </div>
                        <span className={`${styles.riskBadge} ${styles[`risk_${p.risk}`]}`}>
                          {p.risk.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Disease-Specific: Diagnosis Dropdown */}
            {scope === "Disease-Specific" && (
              <div className={styles.filterSection}>
                <label className={styles.fieldLabel}>Select Primary Diagnosis</label>
                <select
                  className={styles.selectInput}
                  value={diseaseFilter}
                  onChange={(e) => setDiseaseFilter(e.target.value)}
                >
                  {diseaseBreakdown.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.count} {d.count === 1 ? "patient" : "patients"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date-Wise: Start and End Date Pickers */}
            {scope === "Date-Wise" && (
              <div className={styles.filterSection}>
                <div className={styles.dateGrid}>
                  <div>
                    <label className={styles.fieldLabel}>Start Date</label>
                    <DateSelectInput value={startDate} onChange={setStartDate} />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>End Date</label>
                    <DateSelectInput value={endDate} onChange={setEndDate} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: FILE FORMAT (Excel / CSV / PDF) */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>3</span>
              <div>
                <p className={styles.cardTitle}>File Format</p>
                <p className={styles.cardSubtitle}>Select export output type</p>
              </div>
            </div>

            <div className={styles.formatGrid}>
              <button
                type="button"
                className={`${styles.formatCard} ${format === "excel" ? styles.formatCardActive : ""}`}
                onClick={() => setFormat("excel")}
              >
                <FileSpreadsheet size={20} className={format === "excel" ? styles.formatIconActive : styles.formatIcon} />
                <div>
                  <p className={styles.formatTitle}>Excel (.xlsx)</p>
                  <p className={styles.formatSub}>
                    Multi-sheet workbook: Master Registry + Disease Tracks (ILD, Asthma, COPD, Bronchiectasis, Post-ICU)
                  </p>
                </div>
              </button>

              <button
                type="button"
                className={`${styles.formatCard} ${format === "csv" ? styles.formatCardActive : ""}`}
                onClick={() => setFormat("csv")}
              >
                <FileCode size={20} className={format === "csv" ? styles.formatIconActive : styles.formatIcon} />
                <div>
                  <p className={styles.formatTitle}>CSV (.csv)</p>
                  <p className={styles.formatSub}>
                    Standard UTF-8 delimited clinical data table
                  </p>
                </div>
              </button>

              <button
                type="button"
                className={`${styles.formatCard} ${format === "pdf" ? styles.formatCardActive : ""}`}
                onClick={() => setFormat("pdf")}
              >
                <FileText size={20} className={format === "pdf" ? styles.formatIconActive : styles.formatIcon} />
                <div>
                  <p className={styles.formatTitle}>PDF Report (.pdf)</p>
                  <p className={styles.formatSub}>3-Page Executive Clinical Dossier</p>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 4: EXPORT ACTION BUTTON */}
          <div className={styles.actionCard}>
            {exportError && (
              <div className={styles.errorBanner}>
                <AlertCircle size={16} />
                <span>{exportError}</span>
              </div>
            )}

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleExport}
              disabled={exporting || !isExportReady}
            >
              {exporting ? (
                <div className={styles.loadingSpinner} />
              ) : (
                <Download size={18} strokeWidth={2.2} />
              )}
              <span>{getExportButtonText()}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Panel Overview & Recent History */}
        <div className={styles.right}>
          {/* Cohort Summary */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Cohort Overview</p>
            <div className={styles.summaryStatsGrid}>
              <div className={styles.statBox}>
                <p className={styles.statVal}>{patients.length}</p>
                <p className={styles.statLbl}>Total Patients</p>
              </div>
              <div className={styles.statBox}>
                <p className={`${styles.statVal} ${styles.statRed}`}>
                  {patients.filter((p) => p.risk === "critical").length}
                </p>
                <p className={styles.statLbl}>Critical Risk</p>
              </div>
              <div className={styles.statBox}>
                <p className={styles.statVal}>{diseaseBreakdown.length}</p>
                <p className={styles.statLbl}>Disease Panels</p>
              </div>
              <div className={styles.statBox}>
                <p className={`${styles.statVal} ${styles.statGreen}`}>
                  {patients.filter((p) => p.risk === "stable").length}
                </p>
                <p className={styles.statLbl}>Stable</p>
              </div>
            </div>
          </div>

          {/* Disease Distribution */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Panel Distribution</p>
            <div className={styles.panelList}>
              {diseaseBreakdown.map((d) => {
                const pct = patients.length > 0 ? Math.round((d.count / patients.length) * 100) : 0;
                return (
                  <div key={d.name} className={styles.panelItem}>
                    <div className={styles.panelHeader}>
                      <span className={styles.panelName}>{d.name}</span>
                      <span className={styles.panelCount}>
                        {d.count} ({pct}%)
                      </span>
                    </div>
                    <div className={styles.panelTrack}>
                      <div className={styles.panelBar} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Exports Log */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Recent Export History</p>
            {recentExports.length === 0 ? (
              <p className={styles.emptyText}>No recent exports generated yet.</p>
            ) : (
              <div className={styles.recentList}>
                {recentExports.map((item) => (
                  <div key={item.id} className={styles.recentItem}>
                    <div className={styles.recentIconBox}>
                      <FileSpreadsheet size={15} className={styles.recentIcon} />
                    </div>
                    <div className={styles.recentInfo}>
                      <p className={styles.recentType}>{item.export_type.replace(/_/g, " ").toUpperCase()} EXPORT</p>
                      <p className={styles.recentTime}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recent"}
                      </p>
                    </div>
                    {item.presigned_url && (
                      <a href={item.presigned_url} target="_blank" rel="noreferrer" className={styles.recentDownloadLink}>
                        <Download size={13} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
