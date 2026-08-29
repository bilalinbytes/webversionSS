"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, Calendar, User, CheckCircle2 } from "lucide-react";
import { PATIENT_PROFILE, SPO2_TREND, VAS_TREND, DAYS_14 } from "@/lib/mock-data";
import { usePatient } from "@/contexts/PatientContext";
import { DoctorNoteCard } from "./shared";
import styles from "./HomeView.module.css";

// ── Animated number ───────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const dur = 700;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      start = Math.round(e * end);
      setDisplay(start);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const W = 300, H = 48;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Risk badge ────────────────────────────────────────────────────────────────
const RISK_COLOR = { critical: "#e24b4a", high: "#d85a30", moderate: "#ef9f27", stable: "#639922" };
const RISK_BG    = { critical: "#fcebeb", high: "#faece7", moderate: "#fef9e7", stable: "#eaf3de" };

interface HomeViewProps {
  onLogToday: () => void;
  spo2Today?: number;
  mmrcToday?: number;
  aqiToday?: number;
  riskScore?: number;
  doctor?: string;
  doctorHospital?: string;
  spo2Trend?: number[];
  doctorNote?: string;
  lastLogDate?: string | null;
}

export function HomeView({
  onLogToday,
  spo2Today,
  mmrcToday,
  aqiToday,
  riskScore,
  doctor,
  doctorHospital,
  spo2Trend,
  doctorNote,
  lastLogDate,
}: HomeViewProps) {
  const { patient } = usePatient();
  const mock = PATIENT_PROFILE;

  const currentSpo2 = spo2Today ?? mock.spo2Today;
  const currentMmrc = mmrcToday ?? mock.mmrcToday;
  const currentAqi  = aqiToday ?? mock.aqiToday;
  const currentRisk = riskScore ?? mock.riskScore;
  const currentDoctor = doctor ?? mock.doctor;
  const currentHospital = doctorHospital ?? mock.doctorHospital;
  const currentSpo2Trend = spo2Trend ?? SPO2_TREND;

  const patientName = patient?.name?.split(" ")[0] || mock.name.split(" ")[0];

  // Derived risk level
  const riskLevel = currentRisk >= 8 ? "critical" :
                   currentRisk >= 6 ? "high" :
                   currentRisk >= 4 ? "moderate" : "stable";

  const isCritical = riskLevel === "critical";
  const riskColor = RISK_COLOR[riskLevel];
  const riskBg    = RISK_BG[riskLevel];

  // Breathing status based on mMRC
  const breathingStatus = currentMmrc >= 4 ? "Very Severe" :
                          currentMmrc >= 3 ? "Severe" :
                          currentMmrc >= 2 ? "Moderate" : "Mild";

  // Oxygen status
  const oxygenStatus = currentSpo2 < 88 ? "Low — Oxygen needed" :
                      currentSpo2 < 92 ? "Borderline" : "Normal";

  const todayStr = new Date().toISOString().split("T")[0]!;
  const isLoggedToday = lastLogDate ? lastLogDate.startsWith(todayStr) : false;

  return (
    <div className={styles.view}>
      {/* ── Header bar ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <span className={styles.titleEn}>Good afternoon, {patientName}</span>
            <span className={styles.titleHi}>नमस्ते, {patientName}</span>
          </h1>
          <p className={styles.sub}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {isLoggedToday ? "Today's log completed" : `Last logged ${lastLogDate ? new Date(lastLogDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "No logs yet"}`}</p>
        </div>
        {isLoggedToday ? (
          <div className={styles.completedHeaderBadge}>
            <CheckCircle2 size={18} className={styles.completedIcon} />
            <div className={styles.completedContent}>
              <span className={styles.completedTitle}>✓ Today&apos;s Health Log Recorded</span>
              <span className={styles.completedSub}>No further action required today</span>
            </div>
            <button type="button" className={styles.btnSecondarySmall} onClick={onLogToday}>
              Update
            </button>
          </div>
        ) : (
          <button type="button" className={styles.btnPrimary} onClick={onLogToday}>
            <span className={styles.btnEn}>+ Log Today&apos;s Health</span>
            <span className={styles.btnHi}>+ आज का लॉग भरें</span>
          </button>
        )}
      </div>

      <div className={styles.body}>
        {doctorNote && <DoctorNoteCard note={doctorNote} />}
        {/* ── Critical alert banner ── */}
        {isCritical && (
          <div className={styles.alertBanner}>
            <span className={styles.alertPulse} />
            <AlertTriangle size={16} className={styles.alertIcon} />
            <div className={styles.alertText}>
              <strong>Your oxygen level is critically low ({currentSpo2}%).</strong> Please contact Dr. {currentDoctor.split(" ")[1]} immediately or call emergency services.
            </div>
            <a href="tel:112" className={styles.alertBtn}>Call Now</a>
          </div>
        )}

        <div className={styles.grid}>
          {/* ── Today's vitals ── */}
          <div className={styles.vitalsCard}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>Today&apos;s Vitals</p>
              <span className={styles.cardTime}>Logged {mock.lastLog}</span>
            </div>

            {/* SpO2 — dominant */}
            <div className={styles.spo2Block} style={{ background: riskBg }}>
              <div className={styles.spo2Left}>
                <span className={styles.spo2Dot} style={{ background: riskColor,
                  animation: isCritical ? "pulseDot 1.4s ease-in-out infinite" : "none" }} />
                <div>
                  <div className={styles.spo2Val} style={{ color: riskColor }}>
                    <AnimatedNumber value={currentSpo2} suffix="%" />
                  </div>
                  <div className={styles.spo2Label}>SpO₂ at rest</div>
                </div>
              </div>
              <div className={styles.spo2Right}>
                <p className={styles.spo2Status} style={{ color: riskColor }}>{oxygenStatus}</p>
                <p className={styles.spo2Support}>{mock.supportNote}</p>
              </div>
            </div>

            {/* Other vitals */}
            <div className={styles.vitalsRow}>
              <div className={styles.vitalBox}>
                <p className={styles.vitalLabel}>Breathlessness</p>
                <p className={`${styles.vitalVal} ${currentMmrc >= 3 ? styles.vitalWarn : ""}`}>
                  {breathingStatus}
                </p>
                <p className={styles.vitalSub}>mMRC grade {currentMmrc}</p>
              </div>
              <div className={styles.vitalBox}>
                <p className={styles.vitalLabel}>Air Quality</p>
                <p className={`${styles.vitalVal} ${currentAqi > 100 ? styles.vitalWarn : ""}`}>
                  AQI {currentAqi}
                </p>
                <p className={styles.vitalSub}>{currentAqi > 150 ? "Unhealthy" : currentAqi > 100 ? "Moderate" : "Good"}</p>
              </div>
              <div className={styles.vitalBox}>
                <p className={styles.vitalLabel}>Risk Score</p>
                <p className={styles.vitalVal} style={{ color: riskColor }}>{currentRisk}/10</p>
                <p className={styles.vitalSub} style={{ color: riskColor, textTransform: "capitalize" }}>{riskLevel}</p>
              </div>
            </div>
          </div>

          {/* ── SpO2 trend ── */}
          <div className={styles.trendCard}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>SpO₂ — Last 14 Days</p>
              <div className={styles.trendBadge} style={{ color: riskColor, background: riskBg }}>
                <TrendingDown size={12} />
                {currentSpo2}%
              </div>
            </div>
            <div className={styles.sparkWrap}>
              <Sparkline points={currentSpo2Trend} color={riskColor} />
            </div>
            <div className={styles.sparkDates}>
              {DAYS_14.filter((_, i) => i % 2 === 0).map(d => (
                <span key={d} className={styles.sparkDate}>{d}</span>
              ))}
            </div>
            <div className={styles.trendStats}>
              <div className={styles.trendStat}>
                <span className={styles.trendStatVal} style={{ color: riskColor }}>
                  {Math.min(...currentSpo2Trend)}%
                </span>
                <span className={styles.trendStatLbl}>Lowest</span>
              </div>
              <div className={styles.trendStat}>
                <span className={styles.trendStatVal}>{Math.max(...currentSpo2Trend)}%</span>
                <span className={styles.trendStatLbl}>Highest</span>
              </div>
              <div className={styles.trendStat}>
                <span className={styles.trendStatVal} style={{ color: riskColor }}>
                  {Math.max(...currentSpo2Trend) - Math.min(...currentSpo2Trend) > 0 ? "↓" : "↔"}{" "}
                  {Math.abs(Math.max(...currentSpo2Trend) - Math.min(...currentSpo2Trend))}%
                </span>
                <span className={styles.trendStatLbl}>14d range</span>
              </div>
            </div>
          </div>

          {/* ── Discomfort trend ── */}
          <div className={styles.trendCard}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>Discomfort Score — Last 14 Days</p>
              <div className={styles.trendBadge} style={{ color: "#e24b4a", background: "#fcebeb" }}>
                <TrendingUp size={12} />
                {VAS_TREND[VAS_TREND.length - 1]}/10
              </div>
            </div>
            <div className={styles.sparkWrap}>
              <Sparkline points={VAS_TREND} color="#e24b4a" />
            </div>
            <div className={styles.sparkDates}>
              {DAYS_14.filter((_, i) => i % 2 === 0).map(d => (
                <span key={d} className={styles.sparkDate}>{d}</span>
              ))}
            </div>
            <div className={styles.trendStats}>
              <div className={styles.trendStat}>
                <span className={styles.trendStatVal} style={{ color: "#e24b4a" }}>
                  {Math.max(...VAS_TREND)}/10
                </span>
                <span className={styles.trendStatLbl}>Peak today</span>
              </div>
              <div className={styles.trendStat}>
                <span className={styles.trendStatVal}>{Math.min(...VAS_TREND)}/10</span>
                <span className={styles.trendStatLbl}>Best day</span>
              </div>
              <div className={styles.trendStat}>
                <span className={styles.trendStatVal} style={{ color: "#e24b4a" }}>
                  ↑ {Math.max(...VAS_TREND) - Math.min(...VAS_TREND)} pts
                </span>
                <span className={styles.trendStatLbl}>14d change</span>
              </div>
            </div>
          </div>

          {/* ── Doctor info ── */}
          <div className={styles.doctorCard}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>Your Doctor</p>
            </div>
            <div className={styles.doctorRow}>
              <div className={styles.doctorAvatar}>
                {currentDoctor.split(" ").map(n => n[0]).join("").toUpperCase()}
              </div>
              <div className={styles.doctorInfo}>
                <p className={styles.doctorName}>{currentDoctor}</p>
                <p className={styles.doctorHospital}>{currentHospital}</p>
                <p className={styles.doctorSpec}>Pulmonology Specialist</p>
              </div>
            </div>
            <div className={styles.apptRow}>
              <Calendar size={13} className={styles.apptIcon} />
              <div>
                <p className={styles.apptLabel}>Next Appointment</p>
                <p className={styles.apptDate}>{mock.nextAppointment}</p>
              </div>
            </div>
            <div className={styles.diagRow}>
              <User size={13} className={styles.apptIcon} />
              <div>
                <p className={styles.apptLabel}>Diagnosis</p>
                <p className={styles.apptDate}>{mock.diagnosisLabel}</p>
              </div>
            </div>
          </div>

          {/* ── Quick actions ── */}
          <div className={styles.actionsCard}>
            <p className={styles.cardTitle}>Quick Actions</p>
            <div className={styles.actionGrid}>
              {[
                { label: "Log Today's Health", sub: "SpO₂, breathing, symptoms", action: onLogToday, primary: true },
                { label: "View Full History", sub: "14-day trends & logs", action: () => {}, primary: false },
                { label: "Message Doctor", sub: "Send a note to Dr. Prasad", action: () => {}, primary: false },
                { label: "Transfer Doctor", sub: "Generate transfer code", action: () => {}, primary: false },
              ].map((a) => (
                <button
                  key={a.label}
                  type="button"
                  className={`${styles.actionBtn} ${a.primary ? styles.actionBtnPrimary : ""}`}
                  onClick={a.action}
                >
                  <p className={styles.actionLabel}>{a.label}</p>
                  <p className={styles.actionSub}>{a.sub}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
