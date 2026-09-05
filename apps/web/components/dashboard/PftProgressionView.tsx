"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Activity, TrendingUp, TrendingDown, Award, Calendar, FileText } from "lucide-react";

export interface PftRecordItem {
  id?: string;
  test_date?: string | null;
  created_at?: string | null;
  fev1?: number | null;
  fvc?: number | null;
  fev1_fvc_ratio?: number | null;
  dlco?: number | null;
  pefr?: number | null;
  six_mwd?: number | null;
  interpretation?: string | null;
}

export function classifyPftSeverity(fev1FvcRatio?: number | null, fev1?: number | null, fev1PctPred?: number | null): {
  stage: string;
  badgeColor: string;
  badgeBg: string;
  description: string;
} {
  const ratio = fev1FvcRatio ?? 0;
  const fev1Val = fev1PctPred ?? (fev1 ? (fev1 / 3.0) * 100 : 0); // Approximate % pred if raw L

  if (ratio > 0 && ratio < 70) {
    if (fev1Val >= 80) {
      return {
        stage: "GOLD 1: Mild Obstruction",
        badgeColor: "#15803d",
        badgeBg: "#dcfce7",
        description: "Mild airflow limitation (FEV1/FVC < 70%, FEV1 ≥ 80% pred)",
      };
    } else if (fev1Val >= 50) {
      return {
        stage: "GOLD 2: Moderate Obstruction",
        badgeColor: "#b45309",
        badgeBg: "#fef3c7",
        description: "Moderate airflow limitation (FEV1 50%–79% pred)",
      };
    } else if (fev1Val >= 30) {
      return {
        stage: "GOLD 3: Severe Obstruction",
        badgeColor: "#c2410c",
        badgeBg: "#ffedd5",
        description: "Severe airflow limitation (FEV1 30%–49% pred)",
      };
    } else {
      return {
        stage: "GOLD 4: Very Severe",
        badgeColor: "#b91c1c",
        badgeBg: "#fee2e2",
        description: "Very severe airflow limitation (FEV1 < 30% pred)",
      };
    }
  }

  if (ratio >= 70) {
    return {
      stage: "Preserved / Non-Obstructive",
      badgeColor: "#0369a1",
      badgeBg: "#e0f2fe",
      description: "Normal FEV1/FVC ratio (Assess FVC & DLCO for restrictive parenchymal pattern)",
    };
  }

  return {
    stage: "Clinical Review Pending",
    badgeColor: "#475569",
    badgeBg: "#f1f5f9",
    description: "Spirometry values recorded",
  };
}

export function PftProgressionView({ records }: { records: PftRecordItem[] }) {
  const sortedRecords = useMemo(() => {
    return [...records].sort(
      (a, b) =>
        new Date(a.test_date ?? a.created_at ?? 0).getTime() -
        new Date(b.test_date ?? b.created_at ?? 0).getTime()
    );
  }, [records]);

  const latest = sortedRecords[sortedRecords.length - 1];
  const baseline = sortedRecords[0];

  const chartData = useMemo(() => {
    return sortedRecords.map((r, idx) => {
      const d = r.test_date || r.created_at || `Visit ${idx + 1}`;
      const formattedDate = d.includes("T") ? d.split("T")[0] : d;
      return {
        date: formattedDate,
        fev1: r.fev1 !== null && r.fev1 !== undefined ? Number(r.fev1) : null,
        fvc: r.fvc !== null && r.fvc !== undefined ? Number(r.fvc) : null,
        ratio: r.fev1_fvc_ratio !== null && r.fev1_fvc_ratio !== undefined ? Number(r.fev1_fvc_ratio) : null,
        dlco: r.dlco !== null && r.dlco !== undefined ? Number(r.dlco) : null,
      };
    });
  }, [sortedRecords]);

  if (sortedRecords.length === 0) {
    return (
      <div style={{ padding: "30px 20px", textAlign: "center", color: "#64748b", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
        <Activity size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
        <p style={{ margin: 0, fontWeight: 600 }}>No Spirometry / PFT records on file for this patient.</p>
      </div>
    );
  }

  const severity = classifyPftSeverity(latest?.fev1_fvc_ratio, latest?.fev1);

  // Compute Delta FEV1
  let fev1Delta: number | null = null;
  if (latest?.fev1 && baseline?.fev1 && sortedRecords.length > 1) {
    fev1Delta = Math.round((Number(latest.fev1) - Number(baseline.fev1)) * 1000); // in mL
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 10, fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
      {/* Top Clinical Staging Card */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "0 1px 3px rgba(15, 43, 72, 0.05)",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Latest Spirometry Classification
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: severity.badgeColor,
                background: severity.badgeBg,
                padding: "4px 12px",
                borderRadius: 9999,
              }}
            >
              {severity.stage}
            </span>
            <span style={{ fontSize: 13, color: "#475569" }}>{severity.description}</span>
          </div>
        </div>

        {fev1Delta !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: fev1Delta >= 0 ? "#16a34a" : "#dc2626",
              background: fev1Delta >= 0 ? "#f0fdf4" : "#fef2f2",
              padding: "6px 14px",
              borderRadius: 8,
              border: `1px solid ${fev1Delta >= 0 ? "#bbf7d0" : "#fecaca"}`,
            }}
          >
            {fev1Delta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>
              {fev1Delta >= 0 ? `+${fev1Delta} mL` : `${fev1Delta} mL`} FEV₁ change vs baseline
            </span>
          </div>
        )}
      </div>

      {/* Longitudinal Graph: FEV1 & FVC (Liters) */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
        <p style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
          Longitudinal FEV₁ &amp; FVC Trajectory (Liters)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 15, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
            <Line
              type="monotone"
              dataKey="fev1"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="FEV₁ (L)"
            />
            <Line
              type="monotone"
              dataKey="fvc"
              stroke="#059669"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="FVC (L)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Longitudinal Graph: FEV1/FVC Ratio (%) */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
        <p style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
          FEV₁ / FVC Ratio (%) Progression
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 10, right: 15, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[40, 100]} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
            <Line
              type="monotone"
              dataKey="ratio"
              stroke="#9333ea"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              name="FEV₁/FVC Ratio (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Historical Records Table */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", overflowX: "auto" }}>
        <p style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
          Spirometry Visit History ({sortedRecords.length} visits)
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", color: "#64748b" }}>Test Date</th>
              <th style={{ padding: "8px 12px", color: "#64748b" }}>FEV₁ (L)</th>
              <th style={{ padding: "8px 12px", color: "#64748b" }}>FVC (L)</th>
              <th style={{ padding: "8px 12px", color: "#64748b" }}>Ratio (%)</th>
              <th style={{ padding: "8px 12px", color: "#64748b" }}>DLCO (%)</th>
              <th style={{ padding: "8px 12px", color: "#64748b" }}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((r, i) => {
              const rSev = classifyPftSeverity(r.fev1_fvc_ratio, r.fev1);
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.test_date || r.created_at || "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{r.fev1 ?? "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{r.fvc ?? "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{r.fev1_fvc_ratio ? `${r.fev1_fvc_ratio}%` : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{r.dlco ? `${r.dlco}%` : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: rSev.badgeColor, background: rSev.badgeBg, padding: "2px 8px", borderRadius: 6 }}>
                      {rSev.stage}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
