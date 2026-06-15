"use client";

import { AlertTriangle } from "lucide-react";
import { YellowTipsCard } from "@/components/patient/shared";
import { CommonPatientDashboard } from "@/components/patient/CommonPatientDashboard";
import dStyles from "@/components/patient/disease.module.css";
import styles from "./COPD.module.css";

const SPO2_TREND  = [85, 84, 86, 83, 84, 82, 83, 82, 81, 80, 82, 81, 81, 81];
const ENERGY_TREND = [4, 3, 4, 3, 3, 2, 3, 2, 2, 1, 2, 2, 1, 1];
const DAYS = ["27M","28T","29W","30T","31F","1S","2S","3M","4T","5W","6T","7F","8S","9S"];

interface Props {
  patient: { name: string; doctor: string; doctorHospital: string; nextAppointment: string; riskScore: number; spo2Today: number; mmrcToday: number; aqiToday: number; hasTodayLog?: boolean; diagnosis?: string | null; latestPft?: { fev1_fvc_ratio: number | null; fev1: number | null; fvc: number | null; dlco: number | null; test_date: string | null } | null; patientId?: string; };
  onLogToday: () => void;
  spo2Trend?: number[];
  mmrcTrend?: number[];
  vasTrend?: number[];
  diseaseSpecificTrend?: number[];
}

export function COPDHomeView({ patient, onLogToday, spo2Trend, mmrcTrend, vasTrend, diseaseSpecificTrend }: Props) {
  const isCritical = patient.spo2Today < 85;

  return (
    <div className={dStyles.view}>
      <div className={dStyles.body}>

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
          accentColor="#378add"
          diseaseLabel="My Health"
        />

        {patient.riskScore >= 4 && patient.riskScore < 7 && <YellowTipsCard disease="copd" />}
        {isCritical && (
          <div className={dStyles.emergencyAlert}>
            <span className={dStyles.emergencyPulse} />
            <AlertTriangle size={16} style={{ color: "#f87171", flexShrink: 0 }} />
            <div className={dStyles.emergencyText}>
              <strong>SpO₂ critically low ({patient.spo2Today}%).</strong> For COPD, target is 88–92%. Please use your BiPAP and contact your doctor immediately.
            </div>
            <a href="tel:112" className={dStyles.emergencyBtn}>Call Now</a>
          </div>
        )}

        <div className={styles.grid}>
          {/* Weekly symptom impact */}
          <div className={dStyles.card}>
            <p className={dStyles.cardTitle}>Weekly Symptom Impact</p>
            <p className={dStyles.cardSub}>Last 7 days</p>
            <div className={styles.weeklyGrid}>
              {[
                { label: "Cough Frequency", val: "Constant", warn: true },
                { label: "Phlegm Production", val: "Much more than usual", warn: true },
                { label: "Exercise Tolerance", val: "Cannot keep up", warn: true },
                { label: "Sleep Quality", val: "Disturbed last night", warn: true },
              ].map(item => (
                <div key={item.label} className={`${styles.weeklyItem} ${item.warn ? styles.weeklyItemWarn : ""}`}>
                  <span className={styles.weeklyLabel}>{item.label}</span>
                  <span className={`${styles.weeklyVal} ${item.warn ? styles.weeklyValWarn : ""}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
