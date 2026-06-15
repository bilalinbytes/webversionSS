"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import { YellowTipsCard } from "@/components/patient/shared";
import { CommonPatientDashboard } from "@/components/patient/CommonPatientDashboard";
import styles from "./Asthma.module.css";
import dStyles from "@/components/patient/disease.module.css";

const SPO2_TREND = [95, 94, 96, 93, 94, 92, 93, 93, 92, 91, 93, 92, 93, 93];
const RESCUE_TREND = [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 8];
const DAYS = ["27M","28T","29W","30T","31F","1S","2S","3M","4T","5W","6T","7F","8S","9S"];

interface Props {
  patient: {
    name: string; doctor: string; doctorHospital: string;
    nextAppointment: string; riskScore: number;
    spo2Today: number; mmrcToday: number; aqiToday: number; hasTodayLog?: boolean;
    diagnosis?: string | null;
    latestPft?: { fev1_fvc_ratio: number | null; fev1: number | null; fvc: number | null; dlco: number | null; test_date: string | null } | null;
    patientId?: string;
  };
  onLogToday: () => void;
  spo2Trend?: number[];
  mmrcTrend?: number[];
  vasTrend?: number[];
  diseaseSpecificTrend?: number[];
}

// ACT score logic
function getControlStatus(yesCount: number) {
  if (yesCount === 0) return { label: "Well Controlled", color: "#639922", bg: "#eaf3de", icon: "" };
  if (yesCount <= 2)  return { label: "Partly Controlled", color: "#ef9f27", bg: "#fef9e7", icon: "" };
  return { label: "Uncontrolled", color: "#e24b4a", bg: "#fcebeb", icon: "" };
}

export function AsthmaHomeView({ patient, onLogToday, spo2Trend, diseaseSpecificTrend, mmrcTrend, vasTrend }: Props) {
  const spo2Data = spo2Trend && spo2Trend.length > 0 ? spo2Trend : SPO2_TREND;
  const rescueData = diseaseSpecificTrend && diseaseSpecificTrend.length > 0 ? diseaseSpecificTrend : RESCUE_TREND;
  // Mock last week's ACT answers
  const lastACT = { daytime: true, nightWaking: true, reliever: true, activity: false };
  const yesCount = Object.values(lastACT).filter(Boolean).length;
  const control = getControlStatus(yesCount);
  const isUncontrolled = yesCount >= 3;

  return (
    <div className={dStyles.view}>
      <div className={dStyles.body}>

        {/* ── Common dashboard (name, diagnosis, trends, AQI, mMRC, meds, doctor) ── */}
        <CommonPatientDashboard
          name={patient.name}
          diagnosis={patient.diagnosis ?? null}
          patientId={patient.patientId ?? ""}
          spo2Today={patient.spo2Today}
          mmrcToday={patient.mmrcToday}
          aqiToday={patient.aqiToday}
          riskScore={patient.riskScore}
          hasTodayLog={patient.hasTodayLog}
          doctor={patient.doctor}
          doctorHospital={patient.doctorHospital}
          nextAppointment={patient.nextAppointment}
          spo2Trend={spo2Trend}
          mmrcTrend={mmrcTrend}
          vasTrend={vasTrend}
          latestPft={patient.latestPft}
          onLogToday={onLogToday}
          accentColor="#0f6e56"
          diseaseLabel="My Health"
        />

        {patient.riskScore >= 4 && patient.riskScore < 7 && <YellowTipsCard disease="asthma" />}
        {/* Uncontrolled alert */}
        {isUncontrolled && (
          <div className={dStyles.emergencyAlert}>
            <span className={dStyles.emergencyPulse} />
            <AlertTriangle size={16} style={{ color: "#f87171", flexShrink: 0 }} />
            <div className={dStyles.emergencyText}>
              <strong>Your asthma is uncontrolled this week.</strong> Your doctor has been notified. Please avoid triggers and use your reliever as prescribed.
            </div>
          </div>
        )}

        <div className={styles.grid}>
          {/* ACT Control Score */}
          <div className={`${dStyles.card} ${styles.controlCard}`}>
            <p className={dStyles.cardTitle}>My Asthma Control</p>
            <p className={dStyles.cardSub}>Based on last 4 weeks</p>
            <div className={dStyles.controlBanner} style={{ background: control.bg }}>
              <span style={{ fontSize: 32 }}>{control.icon}</span>
              <div>
                <p className={dStyles.controlLabel} style={{ color: control.color }}>{control.label}</p>
                <p className={dStyles.controlSub} style={{ color: control.color }}>
                  {yesCount}/4 symptoms present this week
                </p>
              </div>
            </div>
            <div className={styles.actGrid}>
              {[
                { key: "daytime",    label: "Daytime symptoms >2×/week",    val: lastACT.daytime },
                { key: "nightWaking",label: "Night waking due to asthma",   val: lastACT.nightWaking },
                { key: "reliever",   label: "Reliever use >2×/week",        val: lastACT.reliever },
                { key: "activity",   label: "Activity limitation",          val: lastACT.activity },
              ].map(item => (
                <div key={item.key} className={`${styles.actItem} ${item.val ? styles.actItemYes : styles.actItemNo}`}>
                  {item.val
                    ? <AlertTriangle size={13} style={{ color: "#e24b4a", flexShrink: 0 }} />
                    : <CheckCircle size={13} style={{ color: "#639922", flexShrink: 0 }} />
                  }
                  <span className={styles.actLabel}>{item.label}</span>
                  <span className={`${styles.actVal} ${item.val ? styles.actValYes : styles.actValNo}`}>
                    {item.val ? "Yes" : "No"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rescue puffs trend */}
          {rescueData.length > 0 && (
            <div className={dStyles.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p className={dStyles.cardTitle}>Rescue Puffs — 14 Days</p>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e24b4a", background: "#fcebeb", padding: "3px 9px", borderRadius: 8 }}>
                  {rescueData[rescueData.length - 1] ?? 0} today
                </span>
              </div>
              <div style={{ height: 48, background: "#f8f7f5", borderRadius: 8, overflow: "hidden", padding: "4px 8px" }}>
                {/* Sparkline imported via CommonPatientDashboard — re-import locally */}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
