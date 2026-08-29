"use client";

import { Activity, CalendarClock, CheckCircle2, CircleDashed, Heart, Wind, AlertCircle } from "lucide-react";
import dStyles from "@/components/patient/disease.module.css";
import { DiseaseHero3DVisual } from "./DiseaseHero3DVisual";

export interface CommonDashboardProps {
  name: string;
  diagnosis: string | null;
  effectiveDashboard?: string | null;
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
  effectiveDashboard,
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
  const firstName = name ? (name.split(" ")[0] ?? "Patient") : "Patient";
  const risk = riskLabel(riskScore);
  const aqi = aqiLabel(aqiToday);
  const spo2 = spo2Label(spo2Today);
  const mmrcText = MMRC_LABELS[Math.min(mmrcToday, 4)] ?? MMRC_LABELS[0];

  return (
    <div className={dStyles.body} style={{ gap: 16 }}>

      {/* -- Header (3D Elevated Glass Surface) -- */}
      <div className={dStyles.pageHeader} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        borderRadius: 14,
        padding: "16px 22px",
        border: "1px solid var(--med-border-subtle, #e2e8f0)",
        boxShadow: "0 4px 16px rgba(15, 43, 72, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #0284c7 0%, #1e6091 100%)",
            color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 800,
            boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            flexShrink: 0,
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          }}>
            {firstName.charAt(0).toUpperCase() || "P"}
          </div>
          <div>
            <h1 className={dStyles.pageTitle} style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "var(--med-navy-800, #0f2b48)", letterSpacing: "-0.015em" }}>
              Welcome back, {firstName}
            </h1>
            {diagnosis && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", padding: "3px 11px", borderRadius: 999,
                  background: "linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)",
                  color: "#0369a1", fontSize: 11.5, fontWeight: 700,
                  border: "1px solid #7dd3fc",
                  boxShadow: "0 1px 3px rgba(2, 132, 199, 0.1)",
                }}>
                  {diagnosis}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--med-text-muted)", fontWeight: 500 }}>Active Care Plan</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {hasTodayLog ? (
            <>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999,
                background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",
                color: "#166534", fontSize: 12, fontWeight: 700,
                border: "1px solid #86efac",
                boxShadow: "0 2px 6px rgba(22, 101, 52, 0.08)",
              }}>
                <CheckCircle2 size={15} color="#16a34a" /> Today&apos;s Log Completed
              </span>
              <button
                type="button"
                onClick={onLogToday}
                style={{
                  padding: "8px 15px",
                  borderRadius: 9,
                  border: "1px solid #cbd5e1",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                  color: "var(--med-navy-800, #0f2b48)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(15, 43, 72, 0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                Update Entry
              </button>
              {onViewHistory && (
                <button
                  type="button"
                  onClick={onViewHistory}
                  style={{
                    padding: "8px 15px",
                    borderRadius: 9,
                    border: "1px solid #bfdbfe",
                    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
                    color: "var(--med-blue-600, #1e6091)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(30, 96, 145, 0.06)",
                    transition: "all 0.15s ease",
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
                style={{ padding: "10px 22px", fontSize: 13, borderRadius: 10, minHeight: 44, fontWeight: 700, width: "auto" }}
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
                    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                    color: "var(--med-navy-800, #0f2b48)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(15, 43, 72, 0.04)",
                  }}
                >
                  Logs History
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* -- Dynamic 3D Disease Educational Hero Visual -- */}
      <DiseaseHero3DVisual
        diagnosis={diagnosis}
        effectiveDashboard={effectiveDashboard}
        hasTodayLog={hasTodayLog}
        spo2Today={spo2Today}
        mmrcToday={mmrcToday}
        aqiToday={aqiToday}
        onLogToday={onLogToday}
      />

      {/* -- My Health Pathway (Care Journey Widget) -- */}
      <div className={dStyles.pathwayWidget}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #0284c7, #1e6091)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff",
            }}>
              <Activity size={17} strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--med-navy-800, #0f2b48)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                My Daily Health Pathway
              </p>
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--med-text-muted, #64748b)" }}>
                Three daily steps to protect your lung capacity and stay ahead
              </p>
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
            background: hasTodayLog ? "#f0fdf4" : "#f0f9ff",
            color: hasTodayLog ? "#166534" : "#0369a1",
            border: `1px solid ${hasTodayLog ? "#bbf7d0" : "#bae6fd"}`,
          }}>
            {hasTodayLog ? "Daily Goal Achieved" : "Daily Progress Active"}
          </span>
        </div>

        <div className={dStyles.pathwayStepsGrid}>
          {/* Step 1: Daily Check-in */}
          <div className={`${dStyles.pathwayStepCard} ${dStyles.pathwayStep1}`}>
            <div className={dStyles.pathwayStepHeader}>
              <span className={`${dStyles.pathwayStepNum} ${dStyles.pathwayStepNum1}`}>Step 1 · Check-in</span>
              <span className={`${dStyles.pathwayStepStatus} ${hasTodayLog ? dStyles.statusDone : dStyles.statusPending}`}>
                {hasTodayLog ? "Completed" : "Action Needed"}
              </span>
            </div>
            <p className={dStyles.pathwayStepTitle}>Daily Check-in</p>
            <p className={dStyles.pathwayStepSub}>
              {hasTodayLog ? "SpO2 & symptom check-in recorded" : "Log today's oxygen and breathlessness"}
            </p>
          </div>

          {/* Step 2: Medication Routine */}
          <div className={`${dStyles.pathwayStepCard} ${dStyles.pathwayStep2}`}>
            <div className={dStyles.pathwayStepHeader}>
              <span className={`${dStyles.pathwayStepNum} ${dStyles.pathwayStepNum2}`}>Step 2 · Protection</span>
              <span className={`${dStyles.pathwayStepStatus} ${todayMedications && todayMedications.length > 0 ? (todayMedications.every(m => m.taken) ? dStyles.statusDone : dStyles.statusActive) : dStyles.statusDone}`}>
                {todayMedications && todayMedications.length > 0
                  ? `${todayMedications.filter(m => m.taken).length}/${todayMedications.length} Taken`
                  : "On Schedule"}
              </span>
            </div>
            <p className={dStyles.pathwayStepTitle}>Medication Routine</p>
            <p className={dStyles.pathwayStepSub}>
              {todayMedications && todayMedications.length > 0
                ? `${todayMedications.filter(m => m.taken).length} of ${todayMedications.length} prescribed doses logged`
                : "Active inhaler & oral prescriptions verified"}
            </p>
          </div>

          {/* Step 3: Care Team Supervision */}
          <div className={`${dStyles.pathwayStepCard} ${dStyles.pathwayStep3}`}>
            <div className={dStyles.pathwayStepHeader}>
              <span className={`${dStyles.pathwayStepNum} ${dStyles.pathwayStepNum3}`}>Step 3 · Supervision</span>
              <span className={`${dStyles.pathwayStepStatus} ${dStyles.statusActive}`}>
                Active Care
              </span>
            </div>
            <p className={dStyles.pathwayStepTitle}>Doctor Supervision</p>
            <p className={dStyles.pathwayStepSub}>
              {doctor ? `Supervised by Dr. ${doctor}` : "Under active pulmonary monitoring"}
            </p>
          </div>
        </div>

        <div className={dStyles.pathwayFooterBanner}>
          <div className={dStyles.pathwayFooterText}>
            <p className={dStyles.pathwayFooterEn}>Regular monitoring helps you stay ahead.</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255, 255, 255, 0.75)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              Continuous telemetry and proactive triage protect your lung health.
            </p>
          </div>
        </div>
      </div>

      {/* -- Vitals row (3D Tactile Metric Pods) -- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>

        {/* SpO2 */}
        <div className={`${dStyles.metricCard} ${dStyles.metricCardVitals}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "rgba(2,132,199,0.12)", border: "1px solid rgba(2,132,199,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Heart size={15} color="#0284c7" strokeWidth={2.2} />
            </div>
            <span className={dStyles.fieldLabel} style={{ margin: 0, fontWeight: 700, color: "#0369a1", fontSize: 12 }}>SpO₂ (Oxygen)</span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: spo2.color, fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1, textShadow: "0 1px 2px rgba(15,43,72,0.06)" }}>
            {spo2Today > 0 ? `${spo2Today}%` : "--"}
          </p>
          <span style={{ fontSize: 11.5, color: spo2.color, fontWeight: 600 }}>
            {spo2Today > 0 ? `${spo2.label} ${hasTodayLog ? "(Today)" : "(Last Recorded)"}` : "No entry recorded"}
          </span>
          {spo2Trend && spo2Trend.length > 1 && <SparkLine values={spo2Trend} color={spo2.color} />}
        </div>

        {/* mMRC */}
        <div className={`${dStyles.metricCard} ${dStyles.metricCardSymptoms}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Wind size={15} color="#d97706" strokeWidth={2.2} />
            </div>
            <span className={dStyles.fieldLabel} style={{ margin: 0, fontWeight: 700, color: "#b45309", fontSize: 12 }}>Breathlessness</span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: "var(--med-navy-800)", fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1, textShadow: "0 1px 2px rgba(15,43,72,0.06)" }}>
            {mmrcToday}
          </p>
          <span style={{ fontSize: 11.5, color: "var(--med-text-muted)", fontWeight: 600 }}>
            Grade {mmrcToday} — {mmrcText} {hasTodayLog ? "(Today)" : "(Last Log)"}
          </span>
        </div>

        {/* AQI */}
        <div className={`${dStyles.metricCard} ${dStyles.metricCardAqi}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: aqiToday > 0 ? "rgba(13,148,136,0.12)" : "rgba(100,116,139,0.12)",
              border: aqiToday > 0 ? "1px solid rgba(13,148,136,0.3)" : "1px solid rgba(100,116,139,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Activity size={15} color={aqiToday > 0 ? "#0d9488" : "#64748b"} strokeWidth={2.2} />
            </div>
            <span className={dStyles.fieldLabel} style={{ margin: 0, fontWeight: 700, color: "#0f766e", fontSize: 12 }}>Air Quality (AQI)</span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: aqiToday > 0 ? aqi.color : "#64748b", fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1, textShadow: "0 1px 2px rgba(15,43,72,0.06)" }}>
            {aqiToday > 0 ? aqiToday : "--"}
          </p>
          <span style={{ fontSize: 11.5, color: aqiToday > 0 ? aqi.color : "#64748b", fontWeight: 600 }}>
            {aqiToday > 0 ? `${aqi.label} ${hasTodayLog ? "(Logged)" : "(Live AQI)"}` : "AQI unavailable"}
          </span>
        </div>

        {/* Risk Score */}
        <div className={`${dStyles.metricCard} ${dStyles.metricCardAppointment}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "rgba(79,70,229,0.12)", border: "1px solid rgba(79,70,229,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <AlertCircle size={15} color={risk.color} strokeWidth={2.2} />
            </div>
            <span className={dStyles.fieldLabel} style={{ margin: 0, fontWeight: 700, color: "#4338ca", fontSize: 12 }}>Clinical Risk Score</span>
          </div>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: risk.color, fontFamily: "var(--font-lora), Georgia, serif", lineHeight: 1, textShadow: "0 1px 2px rgba(15,43,72,0.06)" }}>
            {riskScore > 0 ? riskScore : "--"}
          </p>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, padding: "2px 10px",
            borderRadius: 999, background: risk.bg, color: risk.color, fontWeight: 700, width: "fit-content",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}>
            {risk.label}
          </span>
        </div>
      </div>

      {/* -- Symptoms Analytics & mMRC -- */}
      <div className={`${dStyles.card} ${dStyles.symptomsCard}`} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              padding: "4px 11px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
              background: mmrcToday >= 3 ? "#fef2f2" : "#f0f9ff",
              color: mmrcToday >= 3 ? "#dc2626" : "#0284c7",
              border: `1px solid ${mmrcToday >= 3 ? "#fecaca" : "#bae6fd"}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}>
              mMRC Grade: {mmrcToday} / 4
            </span>
            {mmrcTrend && mmrcTrend.length > 0 && (
              <span style={{
                padding: "4px 11px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                background: "#f8fafc", color: "var(--med-navy-800)",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
          <div style={{
            padding: "14px 16px", background: "linear-gradient(180deg, #ffffff 0%, #fffdfa 100%)",
            borderRadius: 11, border: "1px solid #fed7aa", display: "flex", flexDirection: "column", gap: 6,
            boxShadow: "0 2px 8px rgba(217, 119, 6, 0.04), inset 0 1px 0 rgba(255,255,255,0.9)"
          }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Breathlessness Scale (mMRC)
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "var(--med-navy-800)", fontFamily: "var(--font-lora), Georgia, serif" }}>
                Grade {mmrcToday}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: mmrcToday >= 3 ? "#dc2626" : "#0284c7" }}>
                {mmrcText}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--med-text-muted)", lineHeight: 1.45 }}>
              {mmrcToday === 0 && "Not troubled with breathlessness except with strenuous exercise."}
              {mmrcToday === 1 && "Troubled by shortness of breath when hurrying on level ground or walking up slight hill."}
              {mmrcToday === 2 && "Walks slower than people of same age on level ground because of breathlessness."}
              {mmrcToday === 3 && "Stops for breath after walking ~100 meters or after a few minutes on level ground."}
              {mmrcToday >= 4 && "Too breathless to leave house or breathless when dressing/undressing."}
            </p>
          </div>

          {/* Core Symptoms Monitoring List */}
          <div style={{
            padding: "14px 16px", background: "linear-gradient(180deg, #ffffff 0%, #fffdfa 100%)",
            borderRadius: 11, border: "1px solid #fed7aa", display: "flex", flexDirection: "column", gap: 6,
            boxShadow: "0 2px 8px rgba(217, 119, 6, 0.04), inset 0 1px 0 rgba(255,255,255,0.9)"
          }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Key Respiratory Indicators
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 4, borderBottom: "1px solid rgba(254,215,170,0.4)" }}>
                <span style={{ color: "var(--med-text-muted)" }}>Oxygenation (Rest)</span>
                <strong style={{ color: spo2.color }}>{spo2Today > 0 ? `${spo2Today}%` : "Not recorded"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 4, borderBottom: "1px solid rgba(254,215,170,0.4)" }}>
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
      <div className={`${dStyles.card} ${dStyles.medsCard}`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p className={dStyles.cardTitle} style={{ margin: 0 }}>
              Today&apos;s Prescribed Medications
            </p>
            <span style={{ fontSize: 11.5, color: "var(--med-text-muted)" }}>Tap to record taken / not taken doses</span>
          </div>
          {todayMedications && todayMedications.length > 0 && (() => {
            const total = todayMedications.length;
            const taken = todayMedications.filter((m) => m.taken === true).length;
            const pct = Math.round((taken / total) * 100);
            return (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px",
                borderRadius: 999,
                background: pct === 100 ? "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)" : pct > 0 ? "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)" : "#f8fafc",
                border: `1px solid ${pct === 100 ? "#86efac" : pct > 0 ? "#93c5fd" : "#e2e8f0"}`,
                color: pct === 100 ? "#166534" : pct > 0 ? "#1e40af" : "#64748b",
                fontSize: 12, fontWeight: 700,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                {taken} of {total} doses logged today — {pct}% adherence
              </span>
            );
          })()}
        </div>

        {(!todayMedications || todayMedications.length === 0) ? (
          <p style={{ margin: 0, fontSize: 13, color: "#888680", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
            No medications assigned. Log today to record adherence.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {todayMedications.map((med) => (
              <div
                key={med.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 11,
                  border: `1.5px solid ${med.taken === true ? "#86efac" : med.taken === false ? "#fca5a5" : "#e2e8f0"}`,
                  background: med.taken === true ? "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)" : med.taken === false ? "linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)" : "#ffffff",
                  boxShadow: "0 2px 6px rgba(15, 43, 72, 0.03), inset 0 1px 0 rgba(255,255,255,0.8)",
                  transition: "all 0.16s ease",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: `2px solid ${med.taken === true ? "#059669" : med.taken === false ? "#dc2626" : "#cbd5e1"}`,
                  background: med.taken === true ? "#059669" : med.taken === false ? "#dc2626" : "#ffffff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, color: "white", fontSize: 13,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}>
                  {med.taken === true ? <CheckCircle2 size={15} /> : med.taken === false ? "✕" : ""}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--med-navy-800)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {med.name}{med.dose ? ` - ${med.dose}` : ""}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, color: med.taken === true ? "#059669" : med.taken === false ? "#dc2626" : "#888680", fontWeight: 500 }}>
                    {med.taken === true ? "Taken today" : med.taken === false ? "Not taken today" : "Not marked yet"}
                  </p>
                </div>
                {onMedicationToggle && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => onMedicationToggle(med.id, true)}
                      style={{
                        minHeight: 38, minWidth: 68, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(5,150,105,0.3)",
                        background: med.taken === true ? "linear-gradient(180deg, #059669 0%, #047857 100%)" : "linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)",
                        color: med.taken === true ? "white" : "#047857",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                        boxShadow: med.taken === true ? "0 2px 6px rgba(5,150,105,0.3)" : "0 1px 3px rgba(0,0,0,0.04)",
                        transition: "all 0.14s ease",
                      }}
                    >
                      Taken
                    </button>
                    <button
                      type="button"
                      onClick={() => onMedicationToggle(med.id, false)}
                      style={{
                        minHeight: 38, minWidth: 72, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.3)",
                        background: med.taken === false ? "linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)" : "linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)",
                        color: med.taken === false ? "white" : "#dc2626",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                        boxShadow: med.taken === false ? "0 2px 6px rgba(220,38,38,0.3)" : "0 1px 3px rgba(0,0,0,0.04)",
                        transition: "all 0.14s ease",
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
        <div className={`${dStyles.card} ${dStyles.vitalsCard}`}>
          <p className={dStyles.cardTitle}>
            Latest PFT Results
            {latestPft.test_date && (
              <span className={dStyles.cardTitleHi}> — {new Date(latestPft.test_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 10 }}>
            {[
              { label: "FEV₁ / FVC", value: latestPft.fev1_fvc_ratio !== null ? `${latestPft.fev1_fvc_ratio}%` : null },
              { label: "FEV₁", value: latestPft.fev1 !== null ? `${latestPft.fev1} L` : null },
              { label: "FVC", value: latestPft.fvc !== null ? `${latestPft.fvc} L` : null },
              { label: "DLCO", value: latestPft.dlco !== null ? `${latestPft.dlco}%` : null },
            ].filter((item) => item.value !== null).map((item) => (
              <div key={item.label} style={{
                padding: "12px 14px", background: "linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)",
                borderRadius: 10, border: "1px solid #bae6fd",
                boxShadow: "0 2px 6px rgba(2,132,199,0.06), inset 0 1px 0 rgba(255,255,255,0.9)"
              }}>
                <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 21, fontWeight: 800, color: "var(--med-navy-800)", fontFamily: "var(--font-lora), Georgia, serif" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -- Doctor & Appointment -- */}
      <div className={`${dStyles.card} ${dStyles.appointmentCard}`}>
        <p className={dStyles.cardTitle}>My Care Team &amp; Doctor</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
            color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, flexShrink: 0,
            boxShadow: "0 4px 12px rgba(79,70,229,0.25), inset 0 1px 0 rgba(255,255,255,0.4)",
            border: "1px solid rgba(255,255,255,0.25)",
            fontFamily: "var(--font-dm-sans), system-ui, sans-serif"
          }}>
            {doctor ? doctor.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "Dr"}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: "var(--med-navy-800)", fontFamily: "var(--font-lora), Georgia, serif" }}>
              {doctor || "Your Attending Pulmonologist"}
            </p>
            {doctorHospital && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--med-text-muted)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>{doctorHospital}</p>
            )}
          </div>
          {nextAppointment && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10,
              background: "linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)",
              border: "1px solid #c7d2fe",
              boxShadow: "0 2px 6px rgba(79,70,229,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
            }}>
              <CalendarClock size={16} color="#4f46e5" />
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#4338ca", textTransform: "uppercase", letterSpacing: "0.05em" }}>Next Appt</p>
                <p style={{ margin: "1px 0 0", fontSize: 13, fontWeight: 700, color: "#4f46e5" }}>{nextAppointment}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* -- Log Today CTA if not logged -- */}
      {!hasTodayLog && (
        <div style={{
          padding: "20px 24px", borderRadius: 14,
          background: "linear-gradient(135deg, #091e36 0%, #0f2b48 50%, #164e77 100%)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          boxShadow: "0 6px 20px rgba(15, 43, 72, 0.15), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-lora), Georgia, serif" }}>
              You haven&apos;t logged today
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              Complete your daily check-in to track your respiratory recovery and alert your care team.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogToday}
            style={{
              minHeight: 44, padding: "10px 24px", borderRadius: 10, border: "none",
              background: "linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)",
              color: "var(--med-blue-600)", fontWeight: 800, fontSize: 13.5,
              cursor: "pointer", fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
              boxShadow: "0 4px 14px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,1)",
              flexShrink: 0,
              transition: "all 0.15s ease",
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
