"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sparkline, YellowTipsCard } from "@/components/patient/shared";
import { CommonPatientDashboard } from "@/components/patient/CommonPatientDashboard";
import dStyles from "@/components/patient/disease.module.css";
import styles from "./ILD.module.css";

const KBILD_TREND = [65, 63, 64, 60, 61, 58, 59, 57, 55, 52, 54, 53, 53, 53];
const DAYS = ["27M", "28T", "29W", "30T", "31F", "1S", "2S", "3M", "4T", "5W", "6T", "7F", "8S", "9S"];

interface Props {
  patient: {
    name: string;
    doctor: string;
    doctorHospital: string;
    nextAppointment: string;
    riskScore: number;
    spo2Today: number;
    mmrcToday: number;
    aqiToday: number;
    hasTodayLog?: boolean;
    diagnosis?: string | null;
    latestPft?: {
      fev1_fvc_ratio: number | null;
      fev1: number | null;
      fvc: number | null;
      dlco: number | null;
      test_date: string | null;
    } | null;
    patientId?: string;
  };
  onLogToday: () => void;
  spo2Trend?: number[];
  mmrcTrend?: number[];
  vasTrend?: number[];
  diseaseSpecificTrend?: number[]; // KBILD scores (0–100)
}

export function ILDHomeView({ patient, onLogToday, spo2Trend, mmrcTrend, vasTrend, diseaseSpecificTrend }: Props) {
  const [prevKbild, setPrevKbild] = useState<number | null>(null);
  const [kbildResponses, setKbildResponses] = useState<Record<string, number>>({});
  const [prevKbildResponses, setPrevKbildResponses] = useState<Record<string, number>>({});
  const kbildData = diseaseSpecificTrend && diseaseSpecificTrend.length > 0 ? diseaseSpecificTrend : KBILD_TREND;
  const currentKbild = kbildData[kbildData.length - 1] ?? 0;

  useEffect(() => {
    if (!patient.patientId) return;
    const supabase = createClient();
    supabase
      .from("daily_logs")
      .select("disease_specific_data")
      .eq("patient_id", patient.patientId)
      .order("logged_at", { ascending: false })
      .limit(2)
      .then(({ data }) => {
        const latest = data?.[0]?.disease_specific_data as Record<string, unknown> | undefined;
        const previous = data?.[1]?.disease_specific_data as Record<string, unknown> | undefined;
        setPrevKbild(typeof previous?.kbild_score === "number" ? previous.kbild_score : null);
        setKbildResponses((latest?.kbild_responses as Record<string, number> | undefined) ?? {});
        setPrevKbildResponses((previous?.kbild_responses as Record<string, number> | undefined) ?? {});
      });
  }, [patient.patientId]);

  let kbildColor = "#e24b4a";
  let kbildBg = "#fcebeb";
  let kbildStatus = "Very Poor · बहुत खराब";
  if (currentKbild >= 70) { kbildColor = "#126969"; kbildBg = "#e5f3f3"; kbildStatus = "Good / Excellent · अच्छा / उत्कृष्ट"; }
  else if (currentKbild >= 40) { kbildColor = "#ef9f27"; kbildBg = "#fef9e7"; kbildStatus = "Fair · ठीक-ठाक"; }

  const showWarning = patient.riskScore >= 8;

  return (
    <div className={dStyles.view}>
      <div className={dStyles.body}>

        {/* ── Common dashboard (name, diagnosis, vitals strip, AQI, trends, meds, doctor) ── */}
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
          accentColor="#4527a0"
          diseaseLabel="My Health"
        />

        {patient.riskScore >= 4 && patient.riskScore < 7 && <YellowTipsCard disease="ild" />}
        {showWarning && (
          <div className={dStyles.warningBanner}>
            <AlertTriangle size={16} style={{ color: "#ef9f27", flexShrink: 0 }} />
            <div className={dStyles.emergencyText}>
              <strong>High Risk Score ({patient.riskScore}/10).</strong> Your metrics show signs of progression or flare-up. Please monitor closely and follow your doctor&apos;s instructions.
            </div>
          </div>
        )}

        {/* ── ILD-specific: KBILD quality of life ── */}
        <div className={styles.grid}>
          <div className={dStyles.card}>
            <p className={dStyles.cardTitle}>Quality of Life / जीवन गुणवत्ता</p>
            <div className={styles.kbildBox} style={{ background: kbildBg }}>
              <span className={styles.kbildVal} style={{ color: kbildColor }}>
                {currentKbild}{prevKbild !== null ? ` (${prevKbild})` : ""}
              </span>
              <span className={styles.kbildLabel}>KBILD Score</span>
              <span className={styles.kbildStatus} style={{ color: kbildColor }}>{kbildStatus}</span>
            </div>
          </div>

          {/* KBILD trend */}
          <div className={dStyles.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p className={dStyles.cardTitle}>KBILD Trend / जीवन गुणवत्ता ट्रेंड</p>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7b1fa2", background: "#f3e5f5", padding: "3px 9px", borderRadius: 8 }}>
                {currentKbild}{prevKbild !== null ? ` (${prevKbild})` : ""}
              </span>
            </div>
            <div style={{ height: 48, background: "#f8f7f5", borderRadius: 8, overflow: "hidden", padding: "4px 8px", marginBottom: 4 }}>
              <Sparkline points={kbildData} color="#7b1fa2" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {DAYS.filter((_, i) => i % 2 === 0).map(d => (
                <span key={d} style={{ fontSize: 9, color: "#aaa9a6", fontFamily: "var(--font-dm-sans)" }}>{d}</span>
              ))}
            </div>
          </div>
        </div>

        {Object.keys(kbildResponses).length > 0 && (
          <div className={dStyles.card}>
            <p className={dStyles.cardTitle}>K-BILD Question Scores / प्रश्न स्कोर</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
              {Array.from({ length: 15 }, (_, index) => {
                const key = String(index + 1);
                const value = kbildResponses[key];
                if (typeof value !== "number") return null;
                const previous = prevKbildResponses[key];
                return (
                  <div key={key} style={{ background: "#f8f7f5", borderRadius: 6, padding: "8px 10px" }}>
                    <p style={{ margin: 0, fontSize: 10, color: "#6d8794", fontWeight: 700 }}>Q{key}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 16, fontWeight: 800, color: "#4527a0" }}>
                      {value}{typeof previous === "number" ? ` (${previous})` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
