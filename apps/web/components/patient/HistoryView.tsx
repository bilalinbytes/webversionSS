"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, CheckCircle2, Clock, Heart, Loader2, Pill, ShieldAlert, Sparkles, Wind, XCircle } from "lucide-react";
import styles from "./HistoryView.module.css";
import { useTranslation } from "react-i18next";
import { usePatient } from "@/contexts/PatientContext";
import "@/lib/i18n";

type JsonRecord = Record<string, unknown>;

interface HistoryLog {
  id?: string;
  logged_at: string;
  spo2_rest: number | null;
  spo2_exertion: number | null;
  mmrc_today: number | null;
  vas_symptoms: JsonRecord | null;
  aqi_value: number | null;
  medication_compliance: Record<string, boolean> | null;
  side_effects: unknown[] | null;
  disease_specific_data: JsonRecord | null;
}

function numericField(record: JsonRecord | null | undefined, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" ? value : null;
}

function formatDayLabel(dateString: string) {
  const d = new Date(dateString);
  const day = d.getDate();
  const dayOfWeek = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
  return `${day}${dayOfWeek}`;
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const W = 300, H = 40;
  let min = Math.min(...points);
  let max = Math.max(...points);
  if (points.length === 0) { min = 0; max = 1; }
  if (min === max) { min -= 1; max += 1; }
  
  const range = max - min;
  const coords = points.map((v, i) => {
    const x = points.length > 1 ? (i / (points.length - 1)) * W : W / 2;
    const y = H - ((v - min) / range) * (H - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function HistoryView({ patientId }: { patientId: string }) {
  const { t } = useTranslation("patient");
  const { patient } = usePatient();
  const effective_dashboard = patient?.effective_dashboard;
  const supabase = createClient();
  const [daysRange, setDaysRange] = useState<14 | 30 | 90>(14);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [trendData, setTrendData] = useState<{
    spo2: number[];
    mmrc: number[];
    vas: number[];
    energy: number[];
    labels: string[];
  }>({ spo2: [], mmrc: [], vas: [], energy: [], labels: [] });

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysRange);

      const { data, error } = await supabase
        .from("daily_logs")
        .select("id, logged_at, spo2_rest, spo2_exertion, mmrc_today, vas_symptoms, aqi_value, medication_compliance, side_effects, disease_specific_data")
        .eq("patient_id", patientId)
        .gte("logged_at", cutoffDate.toISOString().split("T")[0])
        .order("logged_at", { ascending: false });

      if (data && !error) {
        const typedData = data as HistoryLog[];
        setLogs(typedData);
        
        // Prepare trend data (ascending order for charts)
        const ascendingData = [...typedData].reverse();
        
        const spo2 = ascendingData.map(d => d.spo2_rest || 0);
        const mmrc = ascendingData.map(d => d.mmrc_today || 0);
        const vas = ascendingData.map(d => {
          return numericField(d.vas_symptoms, "breathlessness") ?? 0;
        });
        const energy = ascendingData.map(d => {
          return numericField(d.disease_specific_data, "energy_level") ?? 0;
        });
        const labels = ascendingData.map(d => formatDayLabel(d.logged_at));
        
        setTrendData({ spo2, mmrc, vas, energy, labels });
      }
      setLoading(false);
    }
    fetchLogs();
  }, [patientId, daysRange, supabase]);

  if (loading && logs.length === 0) {
    return (
      <div className={styles.view} style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Loader2 className="animate-spin" size={32} color="var(--med-blue-600, #1e6091)" />
      </div>
    );
  }

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Daily Logs History
            <span className={styles.titleHi}>दैनिक स्वास्थ्य लॉग इतिहास</span>
          </h1>
          <p className={styles.sub}>
            All your daily saved health entries, vitals, medicines, and symptoms.
          </p>
        </div>

        {/* Range Selector */}
        <div className={styles.rangeSelector}>
          {[
            { label: "14 Days", value: 14 as const },
            { label: "30 Days", value: 30 as const },
            { label: "90 Days", value: 90 as const },
          ].map((r) => (
            <button
              key={r.value}
              type="button"
              className={`${styles.rangeBtn} ${daysRange === r.value ? styles.rangeBtnActive : ""}`}
              onClick={() => setDaysRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        {/* Trend charts */}
        <div className={styles.chartsGrid}>
          {[
            {
              label: "SpO₂ at Rest · आराम के समय ऑक्सीजन",
              points: trendData.spo2,
              color: "#1e6091",
              unit: "%",
              min: Math.min(...(trendData.spo2.length ? trendData.spo2 : [0])),
              max: Math.max(...(trendData.spo2.length ? trendData.spo2 : [0])),
            },
            {
              label: "Breathlessness (mMRC) · सांस फूलना",
              points: trendData.mmrc,
              color: "#d85a30",
              unit: "",
              min: Math.min(...(trendData.mmrc.length ? trendData.mmrc : [0])),
              max: Math.max(...(trendData.mmrc.length ? trendData.mmrc : [0])),
            },
            effective_dashboard === "post_icu" 
              ? {
                  label: "Energy Level · ऊर्जा स्तर",
                  points: trendData.energy,
                  color: "#0f6e56",
                  unit: "/10",
                  min: Math.min(...(trendData.energy.length ? trendData.energy : [0])),
                  max: Math.max(...(trendData.energy.length ? trendData.energy : [0])),
                }
              : {
                  label: "Discomfort Score (VAS) · बेचैनी",
                  points: trendData.vas,
                  color: "#b7791f",
                  unit: "/10",
                  min: Math.min(...(trendData.vas.length ? trendData.vas : [0])),
                  max: Math.max(...(trendData.vas.length ? trendData.vas : [0])),
                },
          ].map((chart) => (
            <div key={chart.label} className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <p className={styles.chartTitle}>{chart.label}</p>
                {chart.points.length > 0 && (
                  <span className={styles.chartRange} style={{ color: chart.color }}>
                    {chart.min}{chart.unit} – {chart.max}{chart.unit}
                  </span>
                )}
              </div>
              <div className={styles.sparkWrap}>
                {chart.points.length > 0 ? (
                  <Sparkline points={chart.points} color={chart.color} />
                ) : (
                  <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>
                    No data recorded in this period
                  </div>
                )}
              </div>
              {chart.points.length > 0 && (
                <div className={styles.sparkDates}>
                  {trendData.labels.filter((_, i) => i % 2 === 0).map((d, idx) => (
                    <span key={idx} className={styles.sparkDate}>{d}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Daily logs List */}
        <div className={styles.logsCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h2 className={styles.sectionTitle}>
                Saved Daily Logs ({logs.length} entries)
                <span style={{ display: "block", fontSize: 11.5, color: "#64748b", fontWeight: 400, marginTop: 2 }}>
                  दैनिक लॉग रिकॉर्ड्स — प्रत्येक दिन का सुरक्षित रिकॉर्ड
                </span>
              </h2>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className={styles.noDataBox}>
              <Calendar size={36} color="#94a3b8" />
              <p className={styles.noDataTitle}>No Daily Logs in this Period</p>
              <p className={styles.noDataSub}>
                Your submitted daily health check-ins will appear here day-by-day.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {logs.map((log) => {
                const meds = Object.entries((log.medication_compliance || {}) as Record<string, boolean>);
                const medsTaken = meds.filter((entry) => entry[1]).map(([name]) => name);
                const medsMissed = meds.filter((entry) => !entry[1]).map(([name]) => name);

                const dDate = new Date(log.logged_at);
                const formattedDate = dDate.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const formattedTime = dDate.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                
                const vasScore = numericField(log.vas_symptoms, "breathlessness");
                const heartRate = numericField(log.disease_specific_data, "heart_rate");
                const pefr = numericField(log.disease_specific_data, "pefr_current");
                const sputumVol = log.disease_specific_data?.sputum_volume as string | undefined;

                return (
                  <div key={log.logged_at} className={styles.logCard}>
                    <div className={styles.logCardHeader}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={styles.logDateBadge}>{formattedDate}</span>
                        <span className={styles.logTime}><Clock size={12} /> {formattedTime}</span>
                      </div>
                      <div className={styles.logStatusBadge}>
                        <CheckCircle2 size={13} color="#16a34a" /> Recorded
                      </div>
                    </div>

                    <div className={styles.logVitalsGrid}>
                      {/* SpO2 */}
                      <div className={styles.vitalItem}>
                        <span className={styles.vitalLabel}>SpO₂ Rest</span>
                        <span className={`${styles.vitalValue} ${log.spo2_rest && log.spo2_rest < 90 ? styles.vitalWarn : ""}`}>
                          {log.spo2_rest ? `${log.spo2_rest}%` : "--"}
                        </span>
                        <span className={styles.vitalSub}>
                          {log.spo2_exertion ? `Exertion: ${log.spo2_exertion}%` : "Resting"}
                        </span>
                      </div>

                      {/* Heart Rate */}
                      <div className={styles.vitalItem}>
                        <span className={styles.vitalLabel}>Heart Rate</span>
                        <span className={styles.vitalValue}>
                          {heartRate ? `${heartRate} bpm` : "--"}
                        </span>
                        <span className={styles.vitalSub}>Pulse</span>
                      </div>

                      {/* Breathlessness mMRC */}
                      <div className={styles.vitalItem}>
                        <span className={styles.vitalLabel}>mMRC Grade</span>
                        <span className={`${styles.vitalValue} ${log.mmrc_today !== null && log.mmrc_today >= 3 ? styles.vitalWarn : ""}`}>
                          {log.mmrc_today !== null ? `Grade ${log.mmrc_today}` : "--"}
                        </span>
                        <span className={styles.vitalSub}>0–4 Scale</span>
                      </div>

                      {/* Discomfort or Energy */}
                      <div className={styles.vitalItem}>
                        <span className={styles.vitalLabel}>
                          {effective_dashboard === "post_icu" ? "Energy Level" : "VAS Discomfort"}
                        </span>
                        <span className={styles.vitalValue}>
                          {effective_dashboard === "post_icu"
                            ? (numericField(log.disease_specific_data, "energy_level") ?? "--")
                            : (vasScore !== null ? `${vasScore}/10` : "--")}
                        </span>
                        <span className={styles.vitalSub}>Self reported</span>
                      </div>

                      {/* AQI */}
                      <div className={styles.vitalItem}>
                        <span className={styles.vitalLabel}>Local AQI</span>
                        <span className={styles.vitalValue}>
                          {log.aqi_value ?? "--"}
                        </span>
                        <span className={styles.vitalSub}>Air Quality</span>
                      </div>
                    </div>

                    {/* Disease-specific extras */}
                    {(pefr !== null || sputumVol) && (
                      <div className={styles.diseaseExtraRow}>
                        {pefr !== null && (
                          <span className={styles.diseasePill}>
                            PEFR: <strong>{pefr} L/min</strong>
                          </span>
                        )}
                        {sputumVol && (
                          <span className={styles.diseasePill}>
                            Sputum: <strong>{sputumVol}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Medications compliance summary */}
                    {(medsTaken.length > 0 || medsMissed.length > 0) && (
                      <div className={styles.logMedsRow}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                          <Pill size={12} /> Medicines:
                        </span>
                        {medsTaken.map((m) => (
                          <span key={m} className={styles.medTakenPill}>
                            ✓ {m}
                          </span>
                        ))}
                        {medsMissed.map((m) => (
                          <span key={m} className={styles.medMissedPill}>
                            ✗ {m} (Missed)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
