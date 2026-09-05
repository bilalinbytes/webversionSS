import { describe, it, expect } from "vitest";

// Re-test Exacerbation evaluation logic
function evaluateExacerbationRisk({
  currentSpo2,
  baselineSpo2 = 96,
  recentMmrc,
  recentPefr,
  baselinePefr,
  nightWaking = false,
  rescuePuffs = 0,
}: {
  currentSpo2?: number | null;
  baselineSpo2?: number | null;
  recentMmrc?: number | null;
  recentPefr?: number | null;
  baselinePefr?: number | null;
  nightWaking?: boolean | null;
  rescuePuffs?: number | null;
}) {
  const factors: Array<{ parameter: string; finding: string; severity: "high" | "moderate" }> = [];

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

  if (typeof recentPefr === "number" && typeof baselinePefr === "number" && baselinePefr > 0) {
    const ratio = recentPefr / baselinePefr;
    if (ratio < 0.6) {
      factors.push({
        parameter: "Peak Expiratory Flow",
        finding: `Severe drop to ${recentPefr} L/min (< 60% of baseline)`,
        severity: "high",
      });
    } else if (ratio < 0.8) {
      factors.push({
        parameter: "Peak Expiratory Flow",
        finding: `Moderate drop to ${recentPefr} L/min (60%–80% of baseline)`,
        severity: "moderate",
      });
    }
  }

  if (typeof recentMmrc === "number" && recentMmrc >= 3) {
    factors.push({
      parameter: "mMRC Breathlessness",
      finding: `Grade ${recentMmrc} limitation`,
      severity: recentMmrc >= 4 ? "high" : "moderate",
    });
  }

  if (nightWaking) {
    factors.push({
      parameter: "Nocturnal Symptoms",
      finding: "Patient reported waking up at night due to wheezing/breathlessness",
      severity: "moderate",
    });
  }

  if (typeof rescuePuffs === "number" && rescuePuffs >= 4) {
    factors.push({
      parameter: "Reliever Inhaler Usage",
      finding: `${rescuePuffs} puffs used in 24 hours (High reliance)`,
      severity: "moderate",
    });
  }

  const hasHighSeverity = factors.some((f) => f.severity === "high");

  if (hasHighSeverity || factors.length >= 2) {
    return {
      riskLevel: "high" as const,
      factors,
      summaryMessage: `High Flare-Up Risk: ${factors.map((f) => f.finding).join(" · ")}`,
    };
  }

  if (factors.length === 1) {
    return {
      riskLevel: "moderate" as const,
      factors,
      summaryMessage: `Moderate Flare Warning: ${factors[0]!.finding}`,
    };
  }

  return {
    riskLevel: "normal" as const,
    factors: [],
    summaryMessage: "Patient respiratory telemetry is stable and within baseline limits.",
  };
}

// Re-test PFT severity classification logic
function classifyPftSeverity(fev1FvcRatio?: number | null, fev1?: number | null, fev1PctPred?: number | null) {
  const ratio = fev1FvcRatio ?? 0;
  const fev1Val = fev1PctPred ?? (fev1 ? (fev1 / 3.0) * 100 : 0);

  if (ratio > 0 && ratio < 70) {
    if (fev1Val >= 80) {
      return {
        stage: "GOLD 1: Mild Obstruction",
        badgeColor: "#15803d",
        description: "Mild airflow limitation (FEV1/FVC < 70%, FEV1 ≥ 80% pred)",
      };
    } else if (fev1Val >= 50) {
      return {
        stage: "GOLD 2: Moderate Obstruction",
        badgeColor: "#b45309",
        description: "Moderate airflow limitation (FEV1 50%–79% pred)",
      };
    } else if (fev1Val >= 30) {
      return {
        stage: "GOLD 3: Severe Obstruction",
        badgeColor: "#c2410c",
        description: "Severe airflow limitation (FEV1 30%–49% pred)",
      };
    } else {
      return {
        stage: "GOLD 4: Very Severe Obstruction",
        badgeColor: "#b91c1c",
        description: "Very severe airflow limitation (FEV1 < 30% pred)",
      };
    }
  }

  if (ratio >= 70) {
    return {
      stage: "Preserved Ratio",
      badgeColor: "#0284c7",
      description: "Normal or Restrictive spirometry pattern (FEV1/FVC ≥ 70%)",
    };
  }

  return {
    stage: "Pending Spirometry",
    badgeColor: "#64748b",
    description: "No spirometry record on file",
  };
}

describe("Exacerbation Risk Detector", () => {
  it("detects critical desaturation below 90% as high risk", () => {
    const result = evaluateExacerbationRisk({ currentSpo2: 88, baselineSpo2: 96 });
    expect(result.riskLevel).toBe("high");
    expect(result.factors[0]?.parameter).toBe("Resting SpO₂");
  });

  it("detects desaturation 3% or more below baseline as high risk", () => {
    const result = evaluateExacerbationRisk({ currentSpo2: 92, baselineSpo2: 96 });
    expect(result.riskLevel).toBe("high");
    expect(result.factors[0]?.finding).toContain("Dropped to 92%");
  });

  it("detects combined moderate factors as high risk", () => {
    const result = evaluateExacerbationRisk({
      recentMmrc: 3,
      nightWaking: true,
      rescuePuffs: 5,
    });
    expect(result.riskLevel).toBe("high");
    expect(result.factors.length).toBe(3);
  });

  it("reports normal status when all vitals are within limits", () => {
    const result = evaluateExacerbationRisk({
      currentSpo2: 98,
      baselineSpo2: 97,
      recentMmrc: 0,
      nightWaking: false,
    });
    expect(result.riskLevel).toBe("normal");
    expect(result.factors).toHaveLength(0);
  });
});

describe("GOLD PFT Spirometry Severity Classification", () => {
  it("classifies GOLD 1 when ratio < 70 and FEV1 >= 80% pred", () => {
    const res = classifyPftSeverity(65, null, 85);
    expect(res.stage).toBe("GOLD 1: Mild Obstruction");
  });

  it("classifies GOLD 2 when ratio < 70 and FEV1 is 60% pred", () => {
    const res = classifyPftSeverity(62, null, 60);
    expect(res.stage).toBe("GOLD 2: Moderate Obstruction");
  });

  it("classifies GOLD 3 when ratio < 70 and FEV1 is 40% pred", () => {
    const res = classifyPftSeverity(58, null, 40);
    expect(res.stage).toBe("GOLD 3: Severe Obstruction");
  });

  it("classifies GOLD 4 when ratio < 70 and FEV1 is 25% pred", () => {
    const res = classifyPftSeverity(55, null, 25);
    expect(res.stage).toBe("GOLD 4: Very Severe Obstruction");
  });

  it("identifies Preserved Ratio when FEV1/FVC >= 70%", () => {
    const res = classifyPftSeverity(78, null, 90);
    expect(res.stage).toBe("Preserved Ratio");
  });
});
