"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { Sparkline } from "@/components/patient/shared";
import dStyles from "@/components/patient/disease.module.css";

type JsonRecord = Record<string, unknown>;

function numericField(record: JsonRecord | null | undefined, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" ? value : null;
}

// Helper for formatting dates
function formatDayLabel(dateString: string) {
  const d = new Date(dateString);
  const day = d.getDate();
  const dayOfWeek = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
  return `${day}${dayOfWeek}`;
}

// Symptom metadata with display names and colors
const SYMPTOM_CONFIG: Record<string, { label: string; color: string; unit: string }> = {
  breathlessness: { label: "Breathlessness (0–10)", color: "#e24b4a", unit: "" },
  cough: { label: "Cough (0–10)", color: "#ef9f27", unit: "" },
  expectoration: { label: "Expectoration (0–10)", color: "#f59e0b", unit: "" },
  chest_pain: { label: "Chest Pain (0–10)", color: "#ec4899", unit: "" },
  haemoptysis: { label: "Haemoptysis (0–10)", color: "#8b5cf6", unit: "" },
  fever: { label: "Fever (0–10)", color: "#f97316", unit: "" },
  cold: { label: "Cold Symptoms (0–10)", color: "#0ea5e9", unit: "" },
  pedal_edema: { label: "Pedal Edema (0–10)", color: "#6366f1", unit: "" },
  stridor: { label: "Stridor (0–10)", color: "#a855f7", unit: "" },
  difficulty_lying: { label: "Difficulty Lying Down (0–10)", color: "#f43f5e", unit: "" },
  difficulty_swallowing: { label: "Difficulty Swallowing (0–10)", color: "#eab308", unit: "" },
  excessive_daytime_sleep: { label: "Excessive Daytime Sleep (0–10)", color: "#14b8a6", unit: "" },
};

function TrendCard({ title, points, color, unit = "", days }: {
  title: string; points: number[]; color: string; unit?: string; days: string[];
}) {
  const min = points.length ? Math.min(...points) : 0;
  const max = points.length ? Math.max(...points) : 0;
  const last = points.length ? points[points.length - 1]! : 0;
  const prev = points.length > 1 ? points[points.length - 2]! : last;
  const delta = last - prev;

  return (
    <div className={dStyles.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p className={dStyles.cardTitle}>{title}</p>
        <span style={{ fontSize: 12, fontWeight: 700, color: delta > 0 ? "#e24b4a" : delta < 0 ? "#639922" : "#888680", background: delta > 0 ? "#fcebeb" : delta < 0 ? "#eaf3de" : "#f5f3ee", padding: "3px 9px", borderRadius: 8, fontFamily: "var(--font-dm-sans)" }}>
          {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {last}{unit}
        </span>
      </div>
      <div style={{ height: 56, background: "#f8f7f5", borderRadius: 8, overflow: "hidden", padding: "4px 8px", marginBottom: 4 }}>
        {points.length > 0 ? (
          <Sparkline points={points} color={color} />
        ) : (
          <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>No data</div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        {days.map((d, i) => <span key={i} style={{ fontSize: 9, color: "#aaa9a6", fontFamily: "var(--font-dm-sans)" }}>{d}</span>)}
      </div>
      <div style={{ display: "flex", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10 }}>
        {[{ label: "Min", val: `${min}${unit}` }, { label: "Max", val: `${max}${unit}` }, { label: "Latest", val: `${last}${unit}` }].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: "center", borderRight: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18", fontFamily: "var(--font-lora)" }}>{s.val}</p>
            <p style={{ fontSize: 10, color: "#888680", fontFamily: "var(--font-dm-sans)", marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
        <div style={{ flex: 1, textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: delta > 0 ? "#e24b4a" : delta < 0 ? "#639922" : "#888680", fontFamily: "var(--font-lora)" }}>{delta > 0 ? "+" : ""}{delta}{unit}</p>
          <p style={{ fontSize: 10, color: "#888680", fontFamily: "var(--font-dm-sans)", marginTop: 2 }}>Change</p>
        </div>
      </div>
    </div>
  );
}

export function ILDTrendsView({ patientId }: { patientId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<Record<string, { points: number[]; labels: string[] }>>({});

  useEffect(() => {
    async function fetchTrends() {
      setLoading(true);
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const { data, error } = await supabase
        .from("daily_logs")
        .select("logged_at, spo2_rest, vas_symptoms, disease_specific_data")
        .eq("patient_id", patientId)
        .gte("logged_at", fiveDaysAgo.toISOString().split("T")[0])
        .order("logged_at", { ascending: true });

      if (data && !error) {
        const labels = data.map(d => formatDayLabel(d.logged_at));
        const trends: Record<string, { points: number[]; labels: string[] }> = {};

        // Add baseline vitals
        trends.spo2_rest = {
          points: data.map(d => d.spo2_rest || 0),
          labels,
        };

        // Add K-BILD score
        trends.kbild_score = {
          points: data.map(d => numericField(d.disease_specific_data as JsonRecord | null, "kbild_score") ?? 0),
          labels,
        };

        // Extract all VAS symptoms dynamically
        const allSymptomKeys = new Set<string>();
        data.forEach(d => {
          const vasSymptoms = d.vas_symptoms as JsonRecord | null;
          if (vasSymptoms) {
            Object.keys(vasSymptoms).forEach(key => {
              if (typeof vasSymptoms[key] === "number") {
                allSymptomKeys.add(key);
              }
            });
          }
        });

        // Create trend data for each symptom
        allSymptomKeys.forEach(symptomKey => {
          trends[symptomKey] = {
            points: data.map(d => numericField(d.vas_symptoms as JsonRecord | null, symptomKey) ?? 0),
            labels,
          };
        });

        setTrendData(trends);
      }
      setLoading(false);
    }
    fetchTrends();
  }, [patientId, supabase]);

  if (loading) {
    return (
      <div className={dStyles.view} style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Loader2 className="animate-spin" size={32} color="#4527a0" />
      </div>
    );
  }

  return (
    <div className={dStyles.view}>
      <div className={dStyles.pageHeader}>
        <div>
          <h1 className={dStyles.pageTitle}>Trends</h1>
          <p className={dStyles.pageSub}>Graphical overview of symptom progression · Last 5 entries</p>
        </div>
      </div>
      <div className={dStyles.body} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignContent: "start" }}>
        {/* SpO2 at Rest */}
        {trendData.spo2_rest && (
          <TrendCard
            title="SpO₂ at Rest (%)"
            points={trendData.spo2_rest.points}
            color="#7c4dff"
            unit="%"
            days={trendData.spo2_rest.labels}
          />
        )}

        {/* K-BILD Score */}
        {trendData.kbild_score && (
          <TrendCard
            title="K-BILD Score"
            points={trendData.kbild_score.points}
            color="#4527a0"
            unit=""
            days={trendData.kbild_score.labels}
          />
        )}

        {/* All VAS Symptoms */}
        {Object.entries(trendData).map(([key, data]) => {
          if (key.startsWith("spo2_") || key === "kbild_score") return null;
          const config = SYMPTOM_CONFIG[key];
          if (!config) return null;
          return (
            <TrendCard
              key={key}
              title={config.label}
              points={data.points}
              color={config.color}
              unit={config.unit}
              days={data.labels}
            />
          );
        })}
      </div>
    </div>
  );
}
