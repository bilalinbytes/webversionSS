"use client";

import { AlertTriangle } from "lucide-react";
import { DoctorNoteCard, YellowTipsCard } from "@/components/patient/shared";
import { CommonPatientDashboard } from "@/components/patient/CommonPatientDashboard";
import dStyles from "@/components/patient/disease.module.css";
import styles from "./Bronch.module.css";

const SPO2_TREND = [92, 91, 93, 90, 91, 90, 90, 89, 90, 90, 89, 90, 90, 90];
const DAYS = ["27M","28T","29W","30T","31F","1S","2S","3M","4T","5W","6T","7F","8S","9S"];

interface Props {
  patient: { name: string; doctor: string; doctorHospital: string; nextAppointment: string; riskScore: number; spo2Today: number; mmrcToday: number; aqiToday: number; hasTodayLog?: boolean; diagnosis?: string | null; latestPft?: { fev1_fvc_ratio: number | null; fev1: number | null; fvc: number | null; dlco: number | null; test_date: string | null } | null; patientId?: string; };
  onLogToday: () => void;
  spo2Trend?: number[];
  mmrcTrend?: number[];
  vasTrend?: number[];
  doctorNote?: string;
}

export function BronchHomeView({ patient, onLogToday, spo2Trend, mmrcTrend, vasTrend, doctorNote }: Props) {
  const infectionRisk = true;
  const sputumColor = "";
  const sputumLabel = "Dark Green — Potential Infection";

  return (
    <div className={dStyles.view}>
      <div className={dStyles.body}>
        {doctorNote && <DoctorNoteCard note={doctorNote} />}

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
          accentColor="#e65100"
          diseaseLabel="Bronchiectasis Dashboard"
        />

        {patient.riskScore >= 4 && patient.riskScore < 7 && <YellowTipsCard disease="bronchiectasis" />}
        {infectionRisk && (
          <div className={dStyles.emergencyAlert}>
            <span className={dStyles.emergencyPulse} />
            <AlertTriangle size={16} style={{ color: "#f87171", flexShrink: 0 }} />
            <div className={dStyles.emergencyText}>
              <strong>Dark green sputum for 3 consecutive days.</strong> This may indicate a chest infection. Your doctor has been alerted. Please contact them today.
            </div>
          </div>
        )}

        <div className={styles.grid}>
          {/* Sputum status */}
          <div className={dStyles.card}>
            <p className={dStyles.cardTitle}>Today&apos;s Sputum Status</p>
            <div className={styles.sputumStatus}>
              <span className={styles.sputumEmoji}>{sputumColor}</span>
              <div>
                <p className={styles.sputumLabel} style={{ color: "#d85a30" }}>{sputumLabel}</p>
                <p className={styles.sputumSub}>3rd consecutive day · Doctor notified</p>
              </div>
            </div>
          </div>

          {/* Infection screen */}
          <div className={dStyles.card}>
            <p className={dStyles.cardTitle}>Infection Screen</p>
            <p className={dStyles.cardSub}>Daily check for early infection signs</p>
            <div className={styles.infectionGrid}>
              {[
                { label: "Fever / Temp > 38°C", val: "Yes — 38.4°C", warn: true },
                { label: "Flu-like / Malaise", val: "Yes — feeling exhausted", warn: true },
                { label: "Sputum change", val: "Dark green × 3 days", warn: true },
                { label: "Chest clearance", val: "Very difficult (4/5)", warn: true },
              ].map(item => (
                <div key={item.label} className={`${styles.infectionItem} ${item.warn ? styles.infectionItemWarn : ""}`}>
                  <span className={styles.infectionLabel}>{item.label}</span>
                  <span className={`${styles.infectionVal} ${item.warn ? styles.infectionValWarn : ""}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
