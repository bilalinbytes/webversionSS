"use client";

import { AlertTriangle, TrendingDown, BellRing, PhoneCall } from "lucide-react";

export interface FlareRiskFactor {
  parameter: string;
  finding: string;
  severity: "high" | "moderate";
}

export interface ExacerbationAssessment {
  riskLevel: "high" | "moderate" | "normal";
  factors: FlareRiskFactor[];
  summaryMessage: string;
}

export function evaluateExacerbationRisk({
  currentSpo2,
  baselineSpo2 = 96,
  recentMmrc,
  recentPefr,
  baselinePefr,
  nightWaking = false,
  rescuePuffs = 0,
  actScore,
  catScore,
}: {
  currentSpo2?: number | null;
  baselineSpo2?: number | null;
  recentMmrc?: number | null;
  recentPefr?: number | null;
  baselinePefr?: number | null;
  nightWaking?: boolean | null;
  rescuePuffs?: number | null;
  actScore?: number | null;
  catScore?: number | null;
}): ExacerbationAssessment {
  const factors: FlareRiskFactor[] = [];

  // 1. SpO2 desaturation
  if (typeof currentSpo2 === "number") {
    if (currentSpo2 < 90) {
      factors.push({
        parameter: "Resting SpO₂",
        finding: `Critically low at ${currentSpo2}% (< 90%)`,
        severity: "high",
      });
    } else if (typeof baselineSpo2 === "number" && currentSpo2 <= baselineSpo2 - 3) {
      factors.push({
        parameter: "SpO₂ Desaturation",
        finding: `Dropped to ${currentSpo2}% (≥3% below ${baselineSpo2}% baseline)`,
        severity: "high",
      });
    }
  }

  // 2. PEFR Drop
  if (typeof recentPefr === "number" && typeof baselinePefr === "number" && baselinePefr > 0) {
    const ratio = recentPefr / baselinePefr;
    if (ratio < 0.6) {
      factors.push({
        parameter: "Peak Flow (PEFR)",
        finding: `Down to ${recentPefr} L/min (${Math.round((1 - ratio) * 100)}% drop from ${baselinePefr} L/min baseline)`,
        severity: "high",
      });
    } else if (ratio < 0.8) {
      factors.push({
        parameter: "Peak Flow (PEFR)",
        finding: `Moderate drop at ${recentPefr} L/min (${Math.round(ratio * 100)}% of baseline)`,
        severity: "moderate",
      });
    }
  }

  // 3. Night waking
  if (nightWaking) {
    factors.push({
      parameter: "Nocturnal Symptoms",
      finding: "Patient reported waking up with breathlessness/cough",
      severity: "moderate",
    });
  }

  // 4. Rescue puffs escalation
  if (typeof rescuePuffs === "number" && rescuePuffs >= 3) {
    factors.push({
      parameter: "Rescue Inhaler Usage",
      finding: `Frequent reliever usage (${rescuePuffs} puffs/day)`,
      severity: rescuePuffs >= 5 ? "high" : "moderate",
    });
  }

  // 5. mMRC Grade >= 3
  if (typeof recentMmrc === "number" && recentMmrc >= 3) {
    factors.push({
      parameter: "Dyspnea Severity",
      finding: `Severe breathlessness (mMRC Grade ${recentMmrc})`,
      severity: "high",
    });
  }

  // 6. ACT / CAT Score
  if (typeof actScore === "number" && actScore < 15) {
    factors.push({
      parameter: "Asthma Control Test",
      finding: `Uncontrolled Asthma (ACT ${actScore}/25)`,
      severity: "high",
    });
  } else if (typeof catScore === "number" && catScore >= 21) {
    factors.push({
      parameter: "COPD Assessment Test",
      finding: `Very high symptom impact (CAT ${catScore}/40)`,
      severity: "high",
    });
  }

  const highCount = factors.filter((f) => f.severity === "high").length;

  if (highCount > 0 || factors.length >= 2) {
    return {
      riskLevel: "high",
      factors,
      summaryMessage: `High Flare-Up Risk: ${factors.map((f) => f.finding).join(" · ")}`,
    };
  }

  if (factors.length === 1) {
    return {
      riskLevel: "moderate",
      factors,
      summaryMessage: `Moderate Flare Warning: ${factors[0]!.finding}`,
    };
  }

  return {
    riskLevel: "normal",
    factors: [],
    summaryMessage: "Patient respiratory telemetry is stable and within baseline limits.",
  };
}

export function ExacerbationRiskBanner({
  assessment: propAssessment,
  vitals,
  recentLogs,
  onNotifyPatient,
  patientMobile,
}: {
  assessment?: ExacerbationAssessment;
  vitals?: {
    spo2?: number | null;
    mmrc?: number | null;
    aqi?: number | null;
  };
  recentLogs?: Array<any>;
  onNotifyPatient?: () => void;
  patientMobile?: string | null;
}) {
  const assessment: ExacerbationAssessment = propAssessment ?? evaluateExacerbationRisk({
    currentSpo2: vitals?.spo2 ?? (recentLogs?.[0]?.spo2_rest as number | undefined),
    recentMmrc: vitals?.mmrc ?? (recentLogs?.[0]?.mmrc_today as number | undefined),
    recentPefr: (recentLogs?.[0]?.pefr_value as number | undefined),
  });

  if (assessment.riskLevel === "normal") return null;

  const isHigh = assessment.riskLevel === "high";

  return (
    <aside
      aria-label="Clinical flare-up alert"
      style={{
        background: isHigh ? "#fef2f2" : "#fffbeb",
        border: `1px solid ${isHigh ? "#fca5a5" : "#fde68a"}`,
        borderLeft: `5px solid ${isHigh ? "#dc2626" : "#d97706"}`,
        borderRadius: 12,
        padding: "12px 16px",
        marginBottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isHigh ? (
            <AlertTriangle size={18} color="#dc2626" />
          ) : (
            <TrendingDown size={18} color="#d97706" />
          )}
          <span style={{ fontSize: 13.5, fontWeight: 700, color: isHigh ? "#991b1b" : "#92400e" }}>
            {isHigh ? "⚠️ Early Exacerbation / Deterioration Alert" : "⚠️ Moderate Flare-up Warning"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onNotifyPatient && (
            <button
              type="button"
              onClick={onNotifyPatient}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
                padding: "5px 10px",
                borderRadius: 6,
                border: "none",
                background: isHigh ? "#dc2626" : "#d97706",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              <BellRing size={12} /> Auto-Fill Patient Notice
            </button>
          )}
          {patientMobile && (
            <a
              href={`tel:${patientMobile}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
                padding: "5px 10px",
                borderRadius: 6,
                background: isHigh ? "#dc2626" : "#d97706",
                color: "#ffffff",
                textDecoration: "none",
              }}
            >
              <PhoneCall size={12} /> Contact Patient ({patientMobile})
            </a>
          )}
        </div>
      </div>

      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: isHigh ? "#7f1d1d" : "#78350f", lineHeight: 1.5 }}>
        {assessment.factors.map((factor, i) => (
          <li key={i}>
            <strong>{factor.parameter}:</strong> {factor.finding}
          </li>
        ))}
      </ul>
    </aside>
  );
}
