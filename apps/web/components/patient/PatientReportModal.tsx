"use client";

import { useState } from "react";
import { Calendar, Download, FileText, X, Loader2, Check } from "lucide-react";
import styles from "./PatientReportModal.module.css";

interface PatientReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string; // If undefined, API uses authenticated patient session
  patientName?: string;
  isDoctorView?: boolean;
}

type DatePreset = "7d" | "30d" | "90d" | "all" | "custom";

export function PatientReportModal({
  isOpen,
  onClose,
  patientId,
  patientName = "Patient",
  isDoctorView = false,
}: PatientReportModalProps) {
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0]!;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]!;
  });
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handlePresetSelect = (selectedPreset: DatePreset) => {
    setPreset(selectedPreset);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]!;

    if (selectedPreset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split("T")[0]!);
      setEndDate(todayStr);
    } else if (selectedPreset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split("T")[0]!);
      setEndDate(todayStr);
    } else if (selectedPreset === "90d") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setStartDate(d.toISOString().split("T")[0]!);
      setEndDate(todayStr);
    } else if (selectedPreset === "all") {
      setStartDate("2020-01-01");
      setEndDate(todayStr);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const endpoint = isDoctorView ? "/api/exports" : "/api/patient/report";
      const payload = isDoctorView
        ? {
            export_type: "single_patient",
            format: "pdf",
            patient_id: patientId,
            start_date: startDate,
            end_date: endDate,
          }
        : {
            format: "pdf",
            start_date: startDate,
            end_date: endDate,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF report.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `O2Plus_${patientName.replace(/\s+/g, "_")}_Clinical_Report_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error("Report download failed:", err);
      alert("Failed to download PDF report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Download Clinical PDF Report">

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleRow}>
            <div className={styles.iconCircle}>
              <FileText size={20} />
            </div>
            <div>
              <h2 className={styles.title}>Download Clinical PDF Dossier</h2>
              <p className={styles.subtitle}>
                {isDoctorView ? `Generating report for ${patientName}` : "Download your complete 3-page clinical health report"}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Date Range Presets */}
          <div className={styles.sectionGroup}>
            <label className={styles.sectionLabel}>Select Time Period</label>
            <div className={styles.presetsGrid}>
              {[
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "90d", label: "Last 90 Days" },
                { id: "all", label: "All Recorded History" },
                { id: "custom", label: "Custom Dates" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.presetBtn} ${preset === p.id ? styles.presetBtnActive : ""}`}
                  onClick={() => handlePresetSelect(p.id as DatePreset)}
                >
                  {preset === p.id && <Check size={13} className={styles.checkIcon} />}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers */}
          <div className={styles.datePickerRow}>
            <div className={styles.dateField}>
              <label className={styles.fieldLabel}>From Date</label>
              <div className={styles.inputWrap}>
                <Calendar size={15} className={styles.calendarIcon} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreset("custom");
                  }}
                  className={styles.dateInput}
                />
              </div>
            </div>

            <div className={styles.dateField}>
              <label className={styles.fieldLabel}>To Date</label>
              <div className={styles.inputWrap}>
                <Calendar size={15} className={styles.calendarIcon} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPreset("custom");
                  }}
                  className={styles.dateInput}
                />
              </div>
            </div>
          </div>

          {/* Report Format Summary Box */}
          <div className={styles.formatInfoBox}>
            <div className={styles.formatBadge}>
              <span>Format: Clinical PDF Dossier Only</span>
            </div>
            <p className={styles.formatDesc}>
              Includes Patient Demographics, Baseline PFT &amp; Spirometry, Longitudinal $SpO_2$ &amp; mMRC Logs, Red-Flag Triage Events, Active Inhalers, and Doctor Sign-Off.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isGenerating}>
            Cancel
          </button>
          <button type="button" className={styles.downloadBtn} onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 size={16} className={styles.spinIcon} />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Download PDF Dossier</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
