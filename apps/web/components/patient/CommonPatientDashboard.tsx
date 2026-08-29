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
  onViewHistory?: () => void;
  /** Optional today's medications list for taken/not taken */
  todayMedications?: Array<{
    id: string;
    name: string;
    dose?: string;
    taken: boolean | null;
  }>;
  onMedicationToggle?: (id: string, taken: boolean) => void;
}

function SparkLine({ values, color = "var(--med-blue-600)" }: { values: number[]; color?: string }) {
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
  if (score <= 3) return { label: "Stable", color: "var(--med-blue-600)", bg: "var(--med-blue-50)" };
  if (score <= 6) return { label: "Moderate", color: "#b7791f", bg: "rgba(183,121,31,0.1)" };
  return { label: "High Risk", color: "#c94d49", bg: "rgba(201,77,73,0.1)" };
}

function aqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "var(--med-blue-600)" };
  if (aqi <= 100) return { label: "Moderate", color: "#b7791f" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "#d85a30" };
  return { label: "Unhealthy", color: "#c94d49" };
}

function spo2Label(spo2: number): { label: string; color: string } {
  if (spo2 >= 95) return { label: "Normal", color: "var(--med-blue-600)" };
  if (spo2 >= 90) return { label: "Borderline", color: "#b7791f" };
  return { label: "Low - Alert", color: "#c94d49" };
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
  mmrcTrend,
  vasTrend,
  latestPft,
  onLogToday,
  onViewHistory,
  todayMedications,
  onMedicationToggle,
}: CommonDashboardProps) {
  const firstName = name.split(" ")[0];
  const risk = riskLabel(riskScore);
  const aqi = aqiLabel(aqiToday);
  const spo2 = spo2Label(spo2Today);
  const mmrcText = MMRC_LABELS[Math.min(mmrcToday, 4)] ?? MMRC_LABELS[0];

  return (
    <div className={dStyles.body} style={{ gap: 16 }}>

      {/* -- Header -- */}
      <div className={dStyles.pageHeader} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 className={dStyles.pageTitle} style={{ fontSize: 22, fontWeight: 800, color: "var(--med-navy-800)" }}>
            Welcome back, {firstName}
          </h1>
          {diagnosis && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999,
                background: "var(--med-blue-100)", color: "var(--med-blue-700, #1e6091)", fontSize: 12, fontWeight: 700,
                border: "1px solid rgba(30,96,145,0.2)"
              }}>
                {diagnosis}
              </span>
              <span style={{ fontSize: 12, color: "var(--med-text-muted)" }}>Active Care Plan</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {hasTodayLog ? (
            <>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, background: "#f0fdf4", color: "#166534", fontSize: 12.5, fontWeight: 700, border: "1.5px solid #bbf7d0" }}>
                <CheckCircle2 size={16} color="#16a34a" /> Today&apos;s Log Completed
              </span>
              <button
                type="button"
                onClick={onLogToday}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "var(--med-navy-800, #0f2b48)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Update Entry
              </button>
              {onViewHistory && (
                <button
                  type="button"
                  onClick={onViewHistory}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--med-blue-600, #1e6091)",
                    background: "var(--med-blue-50, #f4f8fb)",
                    color: "var(--med-blue-600, #1e6091)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  View Logs History →
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onLogToday}
                className={dStyles.submitBtn}
                style={{ padding: "10px 22px", fontSize: 13, borderRadius: 10, minHeight: 44, fontWeight: 700 }}
              >
                Log Today&apos;s Health
              </button>
              {onViewHistory && (
                <button
                  type="button"
                  onClick={onViewHistory}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "var(--med-navy-800, #0f2b48)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Logs History
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* -- Vitals row -- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>

        {/* SpO2 */}
        <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Heart size={16} color={spo2.color} strokeWidth={2} />
            <span className={dStyles.fieldLabel} style={{ margin: 0, fontWeight: 700 }}>SpO₂ (Oxygen)</span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: spo2.color, fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1 }}>
            {spo2Today > 0 ? `${spo2Today}%` : "--"}
          </p>
          <span style={{ fontSize: 11.5, color: spo2.color, fontWeight: 600 }}>{spo2Today > 0 ? spo2.label : "No entry today"}</span>
          {spo2Trend && spo2Trend.length > 1 && <SparkLine values={spo2Trend} color={spo2.color} />}
        </div>

        {/* mMRC */}
        <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wind size={16} color="var(--med-blue-600)" strokeWidth={2} />
            <span className={dStyles.fieldLabel} style={{ margin: 0, fontWeight: 700 }}>Breathlessness</span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: "var(--med-navy-800)", fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1 }}>
            {mmrcToday}
          </p>
          <span style={{ fontSize: 11.5, color: "var(--med-text-muted)", fontWeight: 600 }}>Grade {mmrcToday} — {mmrcText}</span>
        </div>

        {/* AQI */}
        <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={16} color={aqiToday > 0 ? aqi.color : "#64748b"} strokeWidth={2} />
            <span className={dStyles.fieldLabel} style={{ margin: 0, fontWeight: 700 }}>Air Quality (AQI)</span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: aqiToday > 0 ? aqi.color : "#64748b", fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1 }}>
            {aqiToday > 0 ? aqiToday : "--"}
          </p>
          <span style={{ fontSize: 11.5, color: aqiToday > 0 ? aqi.color : "#64748b", fontWeight: 600 }}>
            {aqiToday > 0 ? aqi.label : "AQI unavailable"}
          </span>
        </div>

        {/* Risk Score */}
        <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} color={risk.color} strokeWidth={2} />
            <span className={dStyles.fieldLabel} style={{ margin: 0, fontWeight: 700 }}>Clinical Risk Score</span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: risk.color, fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1 }}>
            {riskScore > 0 ? riskScore : "--"}
          </p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, padding: "2px 9px", borderRadius: 999, background: risk.bg, color: risk.color, fontWeight: 700, width: "fit-content" }}>
            {risk.label}
          </span>
        </div>
      </div>

      {/* -- Symptoms Analytics & mMRC -- */}
      <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p className={dStyles.cardTitle} style={{ margin: 0 }}>
              Symptoms &amp; Breathlessness Analytics
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--med-text-muted)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              Longitudinal tracking based on daily clinical logs
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
              background: mmrcToday >= 3 ? "rgba(201,77,73,0.12)" : "rgba(15,110,86,0.12)",
              color: mmrcToday >= 3 ? "#c94d49" : "var(--med-blue-600)",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}>
              mMRC Grade: {mmrcToday} / 4
            </span>
            {mmrcTrend && mmrcTrend.length > 0 && (
              <span style={{
                padding: "4px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                background: "rgba(19,45,54,0.08)", color: "var(--med-navy-800)",
                fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              }}>
                Worst mMRC (Period): Grade {Math.max(...mmrcTrend, mmrcToday)}
              </span>
            )}
          </div>
        </div>

        {/* Side-by-side Symptoms List and mMRC Score breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {/* mMRC Breathlessness Level Card */}
          <div style={{ padding: "12px 14px", background: "#f8f7f5", borderRadius: 10, border: "1px solid rgba(19,45,54,0.08)", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--med-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Breathlessness Scale (mMRC)
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "var(--med-navy-800)", fontFamily: "var(--font-lora), Georgia, serif" }}>
                Grade {mmrcToday}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: mmrcToday >= 3 ? "#c94d49" : "var(--med-blue-600)" }}>
                {mmrcText}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--med-text-muted)", lineHeight: 1.4 }}>
              {mmrcToday === 0 && "Not troubled with breathlessness except with strenuous exercise."}
              {mmrcToday === 1 && "Troubled by shortness of breath when hurrying on level ground or walking up slight hill."}
              {mmrcToday === 2 && "Walks slower than people of same age on level ground because of breathlessness."}
              {mmrcToday === 3 && "Stops for breath after walking ~100 meters or after a few minutes on level ground."}
              {mmrcToday >= 4 && "Too breathless to leave house or breathless when dressing/undressing."}
            </p>
          </div>

          {/* Core Symptoms Monitoring List */}
          <div style={{ padding: "12px 14px", background: "#f8f7f5", borderRadius: 10, border: "1px solid rgba(19,45,54,0.08)", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--med-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Key Respiratory Indicators
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--med-text-muted)" }}>Oxygenation (Rest)</span>
                <strong style={{ color: spo2.color }}>{spo2Today > 0 ? `${spo2Today}%` : "Not recorded"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--med-text-muted)" }}>Daily VAS Symptoms</span>
                <strong style={{ color: "var(--med-navy-800)" }}>
                  {vasTrend && vasTrend.length > 0 ? `Level ${vasTrend[vasTrend.length - 1]} / 10` : "Not recorded"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--med-text-muted)" }}>Spirometry / FEV₁</span>
                <strong style={{ color: "var(--med-navy-800)" }}>
                  {latestPft?.fev1 ? `${latestPft.fev1} L` : latestPft?.fev1_fvc_ratio ? `Ratio ${latestPft.fev1_fvc_ratio}` : "On file"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -- Today's Medications -- */}
      <div className={dStyles.card} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <p className={dStyles.cardTitle} style={{ margin: 0 }}>
            Today&apos;s Prescribed Medications
          </p>
          {todayMedications && todayMedications.length > 0 && (() => {
            const total = todayMedications.length;
            const taken = todayMedications.filter((m) => m.taken === true).length;
            const pct = Math.round((taken / total) * 100);
            return (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
                borderRadius: 999,
                background: pct === 100 ? "#f0fdf4" : pct > 0 ? "#eff6ff" : "#f8fafc",
                border: `1px solid ${pct === 100 ? "#bbf7d0" : pct > 0 ? "#bfdbfe" : "#e2e8f0"}`,
                color: pct === 100 ? "#166534" : pct > 0 ? "#1e40af" : "#64748b",
                fontSize: 12, fontWeight: 700,
              }}>
                {taken} of {total} doses logged today — {pct}% adherence
              </span>
            );
          })()}
        </div>
        <span style={{ fontSize: 11.5, color: "var(--med-text-muted)" }}>Tap to mark taken / not taken</span>
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
                  border: `2px solid ${med.taken === true ? "var(--med-blue-600)" : med.taken === false ? "#c94d49" : "rgba(0,0,0,0.18)"}`,
                  background: med.taken === true ? "var(--med-blue-600)" : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, color: "white", fontSize: 13,
                }}>
                  {med.taken === true ? <CheckCircle2 size={14} /> : med.taken === false ? "✕" : ""}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--med-navy-800)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {med.name}{med.dose ? ` - ${med.dose}` : ""}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: med.taken === true ? "var(--med-blue-600)" : med.taken === false ? "#c94d49" : "#888680" }}>
                    {med.taken === true ? "Taken" : med.taken === false ? "Not taken" : "Not marked yet"}
                  </p>
                </div>
                {onMedicationToggle && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => onMedicationToggle(med.id, true)}
                      style={{
                        minHeight: 40, minWidth: 64, padding: "6px 12px", borderRadius: 8, border: "none",
                        background: med.taken === true ? "var(--med-blue-600)" : "var(--med-blue-50)",
                        color: med.taken === true ? "white" : "var(--med-blue-600)",
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
                        minHeight: 40, minWidth: 64, padding: "6px 12px", borderRadius: 8, border: "none",
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

      {/* -- PFT Summary (if available) -- */}
      {latestPft && (latestPft.fev1_fvc_ratio !== null || latestPft.fev1 !== null) && (
        <div className={dStyles.card}>
          <p className={dStyles.cardTitle}>
            Latest PFT Results
            {latestPft.test_date && (
              <span className={dStyles.cardTitleHi}> — {new Date(latestPft.test_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 8 }}>
            {[
              { label: "FEV₁ / FVC", value: latestPft.fev1_fvc_ratio !== null ? `${latestPft.fev1_fvc_ratio}%` : null },
              { label: "FEV₁", value: latestPft.fev1 !== null ? `${latestPft.fev1} L` : null },
              { label: "FVC", value: latestPft.fvc !== null ? `${latestPft.fvc} L` : null },
              { label: "DLCO", value: latestPft.dlco !== null ? `${latestPft.dlco}%` : null },
            ].filter((item) => item.value !== null).map((item) => (
              <div key={item.label} style={{ padding: "10px 12px", background: "#f8f7f5", borderRadius: 8, border: "1px solid rgba(19,45,54,0.07)" }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--med-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "var(--med-navy-800)", fontFamily: "var(--font-lora), Georgia, serif" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -- Doctor & Appointment -- */}
      <div className={dStyles.card}>
        <p className={dStyles.cardTitle}>My Care Team &amp; Doctor</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--med-blue-600)", color: "var(--med-blue-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            {doctor ? doctor.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "Dr"}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--med-navy-800)", fontFamily: "var(--font-lora), Georgia, serif" }}>
              {doctor || "Your Attending Pulmonologist"}
            </p>
            {doctorHospital && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--med-text-muted)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{doctorHospital}</p>
            )}
          </div>
          {nextAppointment && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "var(--med-blue-50)", border: "1px solid var(--med-border-subtle)" }}>
              <CalendarClock size={16} color="var(--med-blue-600)" />
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--med-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Next Appt</p>
                <p style={{ margin: "1px 0 0", fontSize: 13, fontWeight: 600, color: "var(--med-blue-600)" }}>{nextAppointment}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* -- Log Today CTA if not logged -- */}
      {!hasTodayLog && (
        <div style={{ padding: "18px 20px", borderRadius: 14, background: "var(--med-navy-800)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-lora), Georgia, serif" }}>
              You haven&apos;t logged today
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              Complete your daily check-in to track your respiratory recovery and alert your care team.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogToday}
            style={{
              minHeight: 44, padding: "10px 24px", borderRadius: 10, border: "none",
              background: "#ffffff", color: "var(--med-blue-600)", fontWeight: 800, fontSize: 14,
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
