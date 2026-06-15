"use client";

import { YellowTipsCard } from "@/components/patient/shared";
import { CommonPatientDashboard } from "@/components/patient/CommonPatientDashboard";
import dStyles from "@/components/patient/disease.module.css";
import styles from "./PostICU.module.css";

interface Props {
  patient: {
    name: string; doctor: string; doctorHospital: string;
    nextAppointment: string; riskScore: number;
    spo2Today: number; mmrcToday: number; aqiToday: number; hasTodayLog?: boolean;
    icuDischarge?: string; icuReason?: string;
    diagnosis?: string | null;
    baselineSpo2?: number | null;
    baselineHeartRate?: number | null;
    latestPft?: { fev1_fvc_ratio: number | null; fev1: number | null; fvc: number | null; dlco: number | null; test_date: string | null } | null;
    patientId?: string;
  };
  onLogToday: () => void;
  spo2Trend?: number[];
  mmrcTrend?: number[];
  vasTrend?: number[];
  diseaseSpecificTrend?: number[];
}

export function PostICUHomeView({ patient, onLogToday, spo2Trend, mmrcTrend, vasTrend }: Props) {
  const daysSinceDischarge = patient.icuDischarge
    ? Math.floor((new Date().getTime() - new Date(patient.icuDischarge).getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
          accentColor="#1565c0"
          diseaseLabel="My Health"
        />

        {patient.riskScore >= 4 && patient.riskScore < 7 && <YellowTipsCard disease="post_icu" />}

        {/* Recovery milestone banner */}
        <div className={styles.milestoneBanner}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>ICU</span>
          <div>
            <p className={styles.milestoneTitle}>
              {daysSinceDischarge !== null ? `Day ${daysSinceDischarge} of Recovery` : "Post-ICU Recovery"}
            </p>
            <p className={styles.milestoneSub}>
              {patient.icuDischarge ? `Discharged ${patient.icuDischarge}` : "Discharge date not recorded"}
              {patient.icuReason ? ` · ${patient.icuReason}` : ""}
            </p>
          </div>
          <div className={styles.milestoneProgress}>
            <div className={styles.milestoneBar}>
              <div
                className={styles.milestoneBarFill}
                style={{ width: daysSinceDischarge !== null ? `${Math.min((daysSinceDischarge / 90) * 100, 100)}%` : "0%" }}
              />
            </div>
            <p className={styles.milestoneBarLbl}>
              {daysSinceDischarge !== null ? `${daysSinceDischarge}/90 days target` : "—/90 days target"}
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={dStyles.card}>
            <p className={dStyles.cardTitle}>Today&apos;s Sputum Status</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <p style={{ margin: 0, color: "#d85a30", fontSize: 15, fontWeight: 800 }}>Dark Green - Potential Infection</p>
                <p className={dStyles.cardSub} style={{ marginTop: 4 }}>3rd consecutive day - Doctor notified</p>
              </div>
            </div>
          </div>

          <div className={dStyles.card}>
            <p className={dStyles.cardTitle}>Infection Screen</p>
            <p className={dStyles.cardSub}>Daily check for early infection signs</p>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {[
                { label: "Fever / Temp > 38°C", val: "Yes - 38.4°C" },
                { label: "Flu-like / Malaise", val: "Yes - feeling exhausted" },
                { label: "Sputum change", val: "Dark green x 3 days" },
                { label: "Chest clearance", val: "Very difficult (4/5)" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 8, background: "#fff7ed", border: "1px solid rgba(216,90,48,0.18)" }}>
                  <span style={{ fontSize: 12, color: "#6d8794", fontWeight: 700 }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: "#d85a30", fontWeight: 800 }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery checklist */}
          <div className={dStyles.card}>
            <p className={dStyles.cardTitle}>Recovery Milestones</p>
            <p className={dStyles.cardSub}>Post-ICU rehabilitation progress</p>
            <div className={styles.milestoneList}>
              {[
                { label: "SpO₂ stable > 94% for 7 days", done: false },
                { label: "Walking 100m without stopping", done: true },
                { label: "No supplemental oxygen needed", done: false },
                { label: "Sleep quality improved", done: true },
                { label: "Returned to light daily activities", done: true },
                { label: "Pulmonary rehab session completed", done: false },
              ].map(item => (
                <div key={item.label} className={`${styles.milestoneItem} ${item.done ? styles.milestoneItemDone : ""}`}>
                  <div className={`${styles.milestoneCheck} ${item.done ? styles.milestoneCheckDone : ""}`}>
                    {item.done && "Done"}
                  </div>
                  <span className={styles.milestoneLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
