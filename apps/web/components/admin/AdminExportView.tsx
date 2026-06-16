"use client";

import { useState } from "react";
import { Download, Users, Stethoscope, CheckCircle2 } from "lucide-react";
import styles from "./AdminExportView.module.css";

type Scope = "patients" | "doctors";
type Format = "csv" | "excel";

interface ExportOption {
  id: Scope;
  icon: React.ElementType;
  label: string;
  desc: string;
  columns: string[];
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "patients",
    icon: Users,
    label: "All Patients",
    desc: "Every patient on the platform with diagnosis, assigned doctor and enrollment date",
    columns: [
      "Patient ID", "Name", "Gender", "Date of Birth", "Mobile",
      "Primary Diagnosis", "Dashboard", "Doctor Name", "Hospital",
      "Date of Enrollment",
    ],
  },
  {
    id: "doctors",
    icon: Stethoscope,
    label: "All Doctors",
    desc: "Every registered doctor with specialisation, hospital and patient count",
    columns: [
      "Doctor ID", "Name", "Email", "Hospital", "Specialisation",
      "Patient Count", "Date of Enrollment",
    ],
  },
];

export function AdminExportView() {
  const [scope, setScope] = useState<Scope>("patients");
  const [format, setFormat] = useState<Format>("csv");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setLastExport(null);

    try {
      const res = await fetch(
        `/api/admin/export?scope=${scope}&format=${format}`,
        { credentials: "include" },
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const ext = format === "excel" ? "xls" : "csv";
      a.download = match?.[1] ?? `admin-${scope}-export.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      setLastExport(new Date().toLocaleString("en-IN"));
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const selectedOption = EXPORT_OPTIONS.find((o) => o.id === scope)!;

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Platform Export</h1>
          <p className={styles.sub}>
            Download complete platform data as CSV or Excel
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Left panel */}
        <div className={styles.left}>
          {/* Dataset selector */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>
              <Download size={14} strokeWidth={1.6} />
              Select Dataset
            </p>
            <div className={styles.optionList}>
              {EXPORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.optionCard} ${scope === opt.id ? styles.optionCardActive : ""}`}
                    onClick={() => setScope(opt.id)}
                  >
                    <div className={styles.optionIcon}>
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <div className={styles.optionBody}>
                      <p className={styles.optionLabel}>{opt.label}</p>
                      <p className={styles.optionDesc}>{opt.desc}</p>
                    </div>
                    {scope === opt.id && (
                      <CheckCircle2
                        size={16}
                        strokeWidth={1.8}
                        className={styles.optionCheck}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format selector */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>File Format</p>
            <div className={styles.formatPills}>
              {(["csv", "excel"] as Format[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`${styles.formatPill} ${format === f ? styles.formatPillActive : ""}`}
                  onClick={() => setFormat(f)}
                >
                  {f === "csv" ? "CSV" : "Excel (.xls)"}
                </button>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <>Generating {format.toUpperCase()}…</>
            ) : (
              <>
                <Download size={15} strokeWidth={2} />
                Export {selectedOption.label} — {format.toUpperCase()}
              </>
            )}
          </button>

          {exportError && (
            <p className={styles.exportError}>{exportError}</p>
          )}
          {lastExport && !exportError && (
            <p className={styles.exportSuccess}>
              ✓ Exported successfully at {lastExport}
            </p>
          )}
        </div>

        {/* Right panel — columns preview */}
        <div className={styles.right}>
          <p className={styles.previewTitle}>Columns Included</p>
          <p className={styles.previewSub}>
            The {selectedOption.label} export will include the following columns:
          </p>
          <ul className={styles.columnList}>
            {selectedOption.columns.map((col) => (
              <li key={col} className={styles.columnItem}>
                <span className={styles.columnDot} />
                {col}
              </li>
            ))}
          </ul>

          <div className={styles.noticeBox}>
            <p className={styles.noticeTitle}>About Date of Enrollment</p>
            <p className={styles.noticeText}>
              The "Date of Enrollment" column reflects when a doctor or patient
              first registered on the platform. This timestamp is stored as{" "}
              <code>created_at</code> in the database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
