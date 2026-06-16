"use client";

import { Activity, CalendarClock, CheckCircle2, CircleDashed, Heart, Wind, AlertCircle } from "lucide-react";
import dStyles from "@/components/patient/disease.module.css";

export interface CommonDashboardProps {
  name: string;
  diagnosis: string | null;
  patientId: string;
  spo2Today: number;
  mmrcToday: number;
  aqiToday: number;
  riskScore: number;
  hasTodayLog?: boolean;
  doctor: string;
  doctorHospital: string;
  nextAppointment: string;
  spo2Trend?: number[];
  mmrcTrend?: number[];
  vasTrend?: number[];
  latestPft?: {
    fev1_fvc_ratio: number | null;
    fev1: number | null;
    fvc: number | null;
    dlco: number | null;
    test_date: string | null;
  } | null;
  onLogToday: () => void;
  accentColor?: string;
  diseaseLabel?: string;
  /** Optional today's medications list for taken/not taken */
  todayMedications?: Array<{
    id: string;
    name: string;
    dose?: string;
    taken: boolean | null;
  }>;
  onMedicationToggle?: (id: string, taken: boolean) => void;
}

function SparkLine({ values, color = "#126969" }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function riskLabel(score: number): { label: string; color: string; bg: string } {
  if (score <= 3) return { label: "Stable", color: "#0f6e56", bg: "rgba(15,110,86,0.1)" };
  if (score <= 6) return { label: "Moderate", color: "#b7791f", bg: "rgba(183,121,31,0.1)" };
  return { label: "High Risk", color: "#c94d49", bg: "rgba(201,77,73,0.1)" };
}

function aqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "#0f6e56" };
  if (aqi <= 100) return { label: "Moderate", color: "#b7791f" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "#d85a30" };
  return { label: "Unhealthy", color: "#c94d49" };
}

function spo2Label(spo2: number): { label: string; color: string } {
  if (spo2 >= 95) return { label: "Normal", color: "#0f6e56" };
  if (spo2 >= 90) return { label: "Borderline", color: "#b7791f" };
  return { label: "Low — Alert", color: "#c94d49" };
}

const MMRC_LABELS = ["No breathlessness", "On hills/hurrying", "Slower than peers", "Stops after ~100m", "Too breathless to leave home"];

export function CommonPatientDashboard({
  name,
  diagnosis,
  spo2Today,
  mmrcToday,
  aqiToday,
  riskScore,
  hasTodayLog,
  doctor,
  doctorHospital,
  nextAppointment,
  spo2Trend,
  latestPft,
  onLogToday,
  todayMedications,
  onMedicationToggle,
}: CommonDashboardProps) {
  const firstName = name.split(" ")[0];
  const risk = riskLabel(riskScore);
  const aqi = aqiLabel(aqiToday);
  const spo2 = spo2Label(spo2Today);
  const mmrcText = MMRC_LABELS[Math.min(mmrcToday, 4)] ?? MMRC_LABELS[0];

  return (
    <div className={dStyles.body} style={{ gap: 14 }}>

      {/* ── Header ── */}
      <div className={dStyles.pageHeader} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className={dStyles.pageTitle} style={{ fontSize: 20 }}>
            Welcome, {firstName} <span className={dStyles.pageTitleHi}>· स्वागत है</span>
          </h1>
          {diagnosis && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              <strong style={{ color: "#132d36" }}>{diagnosis}</strong>
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasTodayLog ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "rgba(15,110,86,0.1)", color: "#0f6e56", fontSize: 12, fontWeight: 700 }}>
              <CheckCircle2 size={14} /> Today logged
            </span>
          ) : (
            <button
              type="button"
              onClick={onLogToday}
              className={dStyles.submitBtn}
              style={{ padding: "10px 20px", fontSize: 13, borderRadius: 10, minHeight: 44 }}
            >
              Log Today · आज लॉग करें
            </button>
          )}
        </div>
      </div>

      {/* ── Vitals row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>

        {/* SpO2 */}
        <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Heart size={16} color={spo2.color} strokeWidth={2} />
            <span className={dStyles.fieldLabel} style={{ margin: 0 }}>SpO₂ <span className={dStyles.fieldLabelHi}>ऑक्सीजन</span></span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 700, color: spo2.color, fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1 }}>
            {spo2Today > 0 ? `${spo2Today}%` : "—"}
          </p>
          <span style={{ fontSize: 11, color: spo2.color, fontWeight: 600 }}>{spo2Today > 0 ? spo2.label : "No entry today"}</span>
          {spo2Trend && spo2Trend.length > 1 && <SparkLine values={spo2Trend} color={spo2.color} />}
        </div>

        {/* mMRC */}
        <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wind size={16} color="#126969" strokeWidth={2} />
            <span className={dStyles.fieldLabel} style={{ margin: 0 }}>Breathlessness <span className={dStyles.fieldLabelHi}>सांस फूलना</span></span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 700, color: "#132d36", fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1 }}>
            {mmrcToday}
          </p>
          <span style={{ fontSize: 11, color: "#6d8794" }}>Grade {mmrcToday} — {mmrcText}</span>
        </div>

        {/* AQI */}
        <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={16} color={aqi.color} strokeWidth={2} />
            <span className={dStyles.fieldLabel} style={{ margin: 0 }}>Air Quality <span className={dStyles.fieldLabelHi}>वायु गुणवत्ता</span></span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 700, color: aqi.color, fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1 }}>
            {aqiToday > 0 ? aqiToday : "—"}
          </p>
          <span style={{ fontSize: 11, color: aqi.color, fontWeight: 600 }}>{aqiToday > 0 ? aqi.label : "No data"}</span>
        </div>

        {/* Risk Score */}
        <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} color={risk.color} strokeWidth={2} />
            <span className={dStyles.fieldLabel} style={{ margin: 0 }}>Risk Score <span className={dStyles.fieldLabelHi}>जोखिम स्कोर</span></span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 700, color: risk.color, fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1 }}>
            {riskScore > 0 ? riskScore : "—"}
          </p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 9px", borderRadius: 999, background: risk.bg, color: risk.color, fontWeight: 700, width: "fit-content" }}>
            {risk.label}
          </span>
        </div>
      </div>

      {/* ── Today's Medications ── */}
      <div className={dStyles.card}>
        <p className={dStyles.cardTitle}>
          Today&apos;s Medications · आज की दवाएं
          <span className={dStyles.cardTitleHi}> — Tap to mark taken / not taken</span>
        </p>
        {(!todayMedications || todayMedications.length === 0) ? (
          <p style={{ margin: 0, fontSize: 13, color: "#888680", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            No medications assigned. Log today to record adherence.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {todayMedications.map((med) => (
              <div
                key={med.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${med.taken === true ? "rgba(15,110,86,0.3)" : med.taken === false ? "rgba(201,77,73,0.25)" : "rgba(0,0,0,0.1)"}`,
                  background: med.taken === true ? "rgba(15,110,86,0.05)" : med.taken === false ? "rgba(201,77,73,0.05)" : "#fafaf9",
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  border: `2px solid ${med.taken === true ? "#0f6e56" : med.taken === false ? "#c94d49" : "rgba(0,0,0,0.18)"}`,
                  background: med.taken === true ? "#0f6e56" : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, color: "white", fontSize: 13,
                }}>
                  {med.taken === true ? <CheckCircle2 size={14} /> : med.taken === false ? "✕" : ""}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#132d36", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {med.name}{med.dose ? ` — ${med.dose}` : ""}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: med.taken === true ? "#0f6e56" : med.taken === false ? "#c94d49" : "#888680" }}>
                    {med.taken === true ? "Taken ✓" : med.taken === false ? "Not taken" : "Not marked yet"}
                  </p>
                </div>
                {onMedicationToggle && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => onMedicationToggle(med.id, true)}
                      style={{
                        minHeight: 44, minWidth: 64, padding: "6px 12px", borderRadius: 8, border: "none",
                        background: med.taken === true ? "#0f6e56" : "rgba(15,110,86,0.1)",
                        color: med.taken === true ? "white" : "#0f6e56",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                      }}
                    >
                      Taken
                    </button>
                    <button
                      type="button"
                      onClick={() => onMedicationToggle(med.id, false)}
                      style={{
                        minHeight: 44, minWidth: 64, padding: "6px 12px", borderRadius: 8, border: "none",
                        background: med.taken === false ? "#c94d49" : "rgba(201,77,73,0.1)",
                        color: med.taken === false ? "white" : "#c94d49",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                      }}
                    >
                      Not Taken
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PFT Summary (if available) ── */}
      {latestPft && (latestPft.fev1_fvc_ratio !== null || latestPft.fev1 !== null) && (
        <div className={dStyles.card}>
          <p className={dStyles.cardTitle}>
            Latest PFT Results · PFT परिणाम
            {latestPft.test_date && (
              <span className={dStyles.cardTitleHi}> — {new Date(latestPft.test_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 8 }}>
            {[
              { label: "FEV₁/FVC", value: latestPft.fev1_fvc_ratio !== null ? `${latestPft.fev1_fvc_ratio}%` : null },
              { label: "FEV₁", value: latestPft.fev1 !== null ? `${latestPft.fev1} L` : null },
              { label: "FVC", value: latestPft.fvc !== null ? `${latestPft.fvc} L` : null },
              { label: "DLCO", value: latestPft.dlco !== null ? `${latestPft.dlco}%` : null },
            ].filter((item) => item.value !== null).map((item) => (
              <div key={item.label} style={{ padding: "10px 12px", background: "#f8f7f5", borderRadius: 8, border: "1px solid rgba(19,45,54,0.07)" }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#6d8794", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#132d36", fontFamily: "var(--font-lora), Georgia, serif" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Doctor & Appointment ── */}
      <div className={dStyles.card}>
        <p className={dStyles.cardTitle}>My Care Team · मेरी देखभाल टीम</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#126969", color: "#89d3d3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            {doctor ? doctor.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "Dr"}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#132d36", fontFamily: "var(--font-lora), Georgia, serif" }}>
              {doctor || "Your Doctor"}
            </p>
            {doctorHospital && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{doctorHospital}</p>
            )}
          </div>
          {nextAppointment && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(18,105,105,0.07)", border: "1px solid rgba(18,105,105,0.15)" }}>
              <CalendarClock size={16} color="#126969" />
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#6d8794", textTransform: "uppercase", letterSpacing: "0.05em" }}>Next Appt</p>
                <p style={{ margin: "1px 0 0", fontSize: 13, fontWeight: 600, color: "#126969" }}>{nextAppointment}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Log Today CTA if not logged ── */}
      {!hasTodayLog && (
        <div style={{ padding: "18px 20px", borderRadius: 14, background: "linear-gradient(135deg, #126969 0%, #0f6e56 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-lora), Georgia, serif" }}>
              You haven&apos;t logged today
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              आज का लॉग अभी नहीं किया गया है
            </p>
          </div>
          <button
            type="button"
            onClick={onLogToday}
            style={{
              minHeight: 44, padding: "10px 24px", borderRadius: 10, border: "none",
              background: "#ffffff", color: "#126969", fontWeight: 800, fontSize: 14,
              cursor: "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)", flexShrink: 0,
            }}
          >
            <CircleDashed size={14} style={{ marginRight: 8, verticalAlign: "middle" }} />
            Log Today
          </button>
        </div>
      )}

    </div>
  );
}
