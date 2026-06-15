"use client";

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
}

export function CommonPatientDashboard({ name, diagnosis }: CommonDashboardProps) {
  return (
    <div className={dStyles.pageHeader}>
      <div>
        <h1 className={dStyles.pageTitle}>{name.split(" ")[0]}</h1>
        {diagnosis && (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 15,
              color: "#6d8794",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
          >
            Diagnosis: <strong style={{ color: "#132d36" }}>{diagnosis}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
