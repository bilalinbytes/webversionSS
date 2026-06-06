"use client";

/**
 * CommonPatientDashboard
 * ──────────────────────
 * Shared dashboard header shown on every disease home view.
 * Displays:
 *   • Patient name + diagnosis header
 *   • PFT, SpO2, Symptoms (VAS), Quality-of-life trend sparklines
 *   • AQI card
 *   • Latest medications list
 *   • Doctor info + next appointment
 *
 * Each disease home view renders this component at the top, then adds
 * its own disease-specific cards below.
 */

import { useEffect, useState } from "react";
import { Activity, Pill, TrendingDown, TrendingUp, Minus, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sparkline } from "@/components/patient/shared";
import dStyles from "@/components/patient/disease.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CommonDashboardProps {
  /** Patient first name (used in greeting) */
  name: string;
  /** Full diagnosis string e.g. "ILD / IPF / Fibrotic" */
  diagnosis: string | null;
  /** Patient DB id — used to fetch medications & previous day log */
  patientId: string;
  /** Today's values */
  spo2Today: number;
  mmrcToday: number;
  aqiToday: number;
  riskScore: number;
  hasTodayLog?: boolean;
  /** Doctor info */
  doctor: string;
  doctorHospital: string;
  nextAppointment: string;
  /** 14-day trend arrays (oldest → newest) */
  spo2Trend?: number[];
  mmrcTrend?: number[];
  vasTrend?: number[];
  /** Latest PFT */
  latestPft?: {
    fev1_fvc_ratio: number | null;
    fev1: number | null;
    fvc: number | null;
    dlco: number | null;
    test_date: string | null;
  } | null;
  /** Callback to navigate to Log Today */
  onLogToday: () => void;
  /** Disease accent colour (hex) — used for sparklines */
  accentColor?: string;
  /** Disease label shown in sub-header */
  diseaseLabel?: string;
}

interface MedRow {
  id: string;
  drug_name: string;
  dose: number | null;
  dose_unit: string | null;
  route: string;
  start_date: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function trendIcon(arr: number[]) {
  if (arr.length < 2) return <Minus size={11} />;
  const delta = (arr[arr.length - 1] ?? 0) - (arr[0] ?? 0);
  if (delta > 1) return <TrendingUp size={11} />;
  if (delta < -1) return <TrendingDown size={11} />;
  return <Minus size={11} />;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function yesterdayBounds() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CommonPatientDashboard({
  name,
  diagnosis,
  patientId,
  spo2Today,
  mmrcToday,
  aqiToday,
  riskScore,
  hasTodayLog,
  doctor,
  doctorHospital,
  nextAppointment,
  spo2Trend = [],
  mmrcTrend = [],
  vasTrend = [],
  latestPft,
  onLogToday,
  accentColor = "#126969",
  diseaseLabel = "Dashboard",
}: CommonDashboardProps) {
  const [medications, setMedications] = useState<MedRow[]>([]);
  const [medicationsOpen, setMedicationsOpen] = useState(false);
  const [prevMmrc, setPrevMmrc] = useState<number | null>(null);
  const [prevSymptoms, setPrevSymptoms] = useState<Record<string, number>>({});

  // Fetch medications + previous day log
  useEffect(() => {
    if (!patientId) return;
    const supabase = createClient();

    setPrevMmrc(null);
    setPrevSymptoms({});

    // Medications
    supabase
      .from("medications")
      .select("id, drug_name, dose, dose_unit, route, start_date")
      .eq("patient_id", patientId)
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        if (data) setMedications(data as MedRow[]);
      });

    if (hasTodayLog === false) return;

    // Previous day log for comparison
    const { start: yesterdayStart, end: yesterdayEnd } = yesterdayBounds();
    supabase
      .from("daily_logs")
      .select("mmrc_today, vas_symptoms")
      .eq("patient_id", patientId)
      .gte("logged_at", yesterdayStart)
      .lt("logged_at", yesterdayEnd)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrevMmrc(data.mmrc_today);
          const vas = data.vas_symptoms as Record<string, number> | null;
          setPrevSymptoms(vas ?? {});
        }
      });
  }, [hasTodayLog, patientId]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const spo2Color = spo2Today < 90 ? "#c94d49" : spo2Today < 94 ? "#ef9f27" : "#2d7a38";
  const mmrcColor = mmrcToday >= 3 ? "#c94d49" : mmrcToday >= 2 ? "#ef9f27" : "#2d7a38";
  void aqiToday;
  void riskScore;
  void doctor;
  void doctorHospital;
  void nextAppointment;

  const latestVas = vasTrend.length > 0 ? vasTrend[vasTrend.length - 1] ?? 0 : 0;
  const vasColor = latestVas >= 8 ? "#c94d49" : latestVas >= 5 ? "#ef9f27" : "#2d7a38";
  const showTodayData = hasTodayLog !== false;
  const prevVas = showTodayData
    ? Object.values(prevSymptoms).filter((value) => typeof value === "number").at(0) ?? null
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ── */}
      <div className={dStyles.pageHeader}>
        <div>
          <h1 className={dStyles.pageTitle}>
            {name.split(" ")[0]}
          </h1>
          <p className={dStyles.pageSub}>
            {today} · {diseaseLabel}
          </p>
          {diagnosis && (
            <p style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "#6d8794",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}>
              Diagnosis · निदान: <strong style={{ color: "#132d36" }}>{diagnosis}</strong>
            </p>
          )}
        </div>
        <button type="button" className={dStyles.btnPrimary} onClick={onLogToday}>
          + Log Today · आज लॉग करें
        </button>
      </div>


      {/* ── Trend graphs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>

        {/* SpO2 trend */}
        {spo2Trend.length > 0 && (
          <div className={dStyles.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Activity size={13} color={accentColor} />
                <p className={dStyles.cardTitle} style={{ margin: 0 }}>SpO₂ Trend · ऑक्सीजन ट्रेंड</p>
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: spo2Color, background: `${spo2Color}18`, padding: "2px 8px", borderRadius: 8 }}>
                {trendIcon(spo2Trend)}{spo2Today}%
              </span>
            </div>
            <div style={{ height: 52, background: "#f8f7f5", borderRadius: 8, overflow: "hidden", padding: "4px 8px" }}>
              <Sparkline points={spo2Trend} color={accentColor} />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 10, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              Last {spo2Trend.length} days · पिछले {spo2Trend.length} दिन · Oxygen saturation at rest · आराम की ऑक्सीजन
            </p>
          </div>
        )}

        {/* mMRC trend */}
        {mmrcTrend.length > 0 && (
          <div className={dStyles.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p className={dStyles.cardTitle} style={{ margin: 0 }}>Breathlessness (mMRC) · सांस फूलना</p>
              <span style={{ fontSize: 11, fontWeight: 700, color: mmrcColor, background: `${mmrcColor}18`, padding: "2px 8px", borderRadius: 8 }}>
                Grade {mmrcToday}{showTodayData && prevMmrc !== null ? ` (${prevMmrc})` : ""} · ग्रेड
              </span>
            </div>
            <div style={{ height: 52, background: "#f8f7f5", borderRadius: 8, overflow: "hidden", padding: "4px 8px" }}>
              <Sparkline points={mmrcTrend} color="#d85a30" />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 10, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              Last {mmrcTrend.length} days · पिछले {mmrcTrend.length} दिन · Grade 0-4 · ग्रेड 0-4
            </p>
          </div>
        )}

        {/* VAS / Symptoms trend */}
        {vasTrend.length > 0 && (
          <div className={dStyles.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p className={dStyles.cardTitle} style={{ margin: 0 }}>Symptoms (VAS) · लक्षण</p>
              <span style={{ fontSize: 11, fontWeight: 700, color: vasColor, background: `${vasColor}18`, padding: "2px 8px", borderRadius: 8 }}>
                {latestVas}/10{prevVas !== null ? ` (${prevVas})` : ""}
              </span>
            </div>
            <div style={{ height: 52, background: "#f8f7f5", borderRadius: 8, overflow: "hidden", padding: "4px 8px" }}>
              <Sparkline points={vasTrend} color="#ef9f27" />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 10, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
              Last {vasTrend.length} days · पिछले {vasTrend.length} दिन · 0 = none/नहीं, 10 = severe/गंभीर
            </p>
          </div>
        )}

        {/* PFT */}
        {latestPft && (
          <div className={dStyles.card}>
            <p className={dStyles.cardTitle} style={{ marginBottom: 8 }}>Latest PFT · नवीनतम PFT</p>
            {latestPft.test_date && (
              <p style={{ margin: "0 0 8px", fontSize: 10, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                {fmtDate(latestPft.test_date)}
              </p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "FEV1/FVC", value: latestPft.fev1_fvc_ratio !== null ? String(latestPft.fev1_fvc_ratio) : "—" },
                { label: "FEV1 (L)", value: latestPft.fev1 !== null ? String(latestPft.fev1) : "—" },
                { label: "FVC (L)",  value: latestPft.fvc  !== null ? String(latestPft.fvc)  : "—" },
                { label: "DLCO",     value: latestPft.dlco !== null ? String(latestPft.dlco) : "—" },
              ].map((item) => (
                <div key={item.label} style={{ background: "#f5f3ee", borderRadius: 6, padding: "7px 10px" }}>
                  <p style={{ margin: 0, fontSize: 9, color: "#888680", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {item.label}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 700, color: "#1a1a18", fontFamily: "var(--font-lora), Georgia, serif" }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Medications ── */}
      {medications.length > 0 && (
        <div className={dStyles.card}>
          <button
            type="button"
            onClick={() => setMedicationsOpen((open) => !open)}
            aria-expanded={medicationsOpen}
            className={dStyles.medHeaderButton}
          >
            <Pill size={14} color={accentColor} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className={dStyles.cardTitle} style={{ margin: 0 }}>Current Medications · वर्तमान दवाएं</p>
              <p className={dStyles.cardSub} style={{ margin: "3px 0 0" }}>
                {medications.length} prescribed · Click to {medicationsOpen ? "hide" : "view"} medicines
              </p>
            </div>
            <ChevronDown
              size={18}
              color="#6d8794"
              style={{ transform: medicationsOpen ? "rotate(180deg)" : "none", transition: "transform 0.16s" }}
            />
          </button>
          {medicationsOpen && (
            <div className={dStyles.medicationList}>
              {medications.map((med) => (
                <div key={med.id} className={dStyles.medicationItem}>
                  <div className={dStyles.medicationDot} style={{ background: accentColor }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#132d36", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                      {med.drug_name}
                      {med.dose !== null && (
                        <span style={{ fontWeight: 500, color: "#6d8794" }}>
                          {" "}{med.dose} {med.dose_unit ?? ""}
                        </span>
                      )}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "#6d8794", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                      {med.route} · Prescribed {fmtDate(med.start_date)} · लिखी गई
                    </p>
                  </div>
                  <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
