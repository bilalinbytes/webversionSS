import { describe, it, expect } from "vitest";
import { computeRedFlagScore } from "../src/red-flag-score";
import { runAlertEngine } from "../src/alert-engine";
import type { DailyLogInput, PatientBaseline } from "../src/types";

// ─── Shared test fixtures ────────────────────────────────────────────────────

/** A completely normal log — no flags should trigger */
const normalLog: DailyLogInput = {
  patient_id: "test-patient-001",
  log_date: "2026-07-23",
  spo2_rest: 96,
  spo2_exertion: 92,
  mmrc_today: 1,
  aqi_value: 80,
  medication_compliance: { pirfenidone: true, prednisolone: true },
  vas_symptoms: { breathlessness: 2, cough: 1, wheeze: 0, fatigue: 2 },
  disease_specific_data: null,
  temperature_f: 98.6,
  haemoptysis: false,
  heart_rate: 78,
  respiratory_rate: 16,
  pedal_oedema: false,
  oxygen_requirement_litres: null,
  side_effects: [],
};

const normalBaseline: PatientBaseline = {
  baseline_spo2: 96,
  baseline_mmrc: 1,
  baseline_oxygen_litres: null,
  primary_diagnosis: "ild",
  effective_dashboard: "ild",
};

// ─── computeRedFlagScore ─────────────────────────────────────────────────────

describe("computeRedFlagScore — auto-triggers", () => {
  it("triggers score 10 when SpO2 < 85", () => {
    const log: DailyLogInput = { ...normalLog, spo2_rest: 84 };
    const result = computeRedFlagScore(log, normalBaseline);
    expect(result.global_score).toBe(10);
    expect(result.auto_triggered).toBe(true);
    expect(result.risk_level).toBe("critical");
    expect(result.indicator_color).toBe("red");
    expect(result.auto_trigger_reason).toContain("SpO2 below 85%");
  });

  it("triggers score 10 exactly at SpO2 = 84 (boundary)", () => {
    const result = computeRedFlagScore({ ...normalLog, spo2_rest: 84 }, normalBaseline);
    expect(result.global_score).toBe(10);
    expect(result.auto_triggered).toBe(true);
  });

  it("does NOT auto-trigger at SpO2 = 85 (boundary)", () => {
    const result = computeRedFlagScore({ ...normalLog, spo2_rest: 85 }, normalBaseline);
    expect(result.auto_triggered).toBe(false);
  });

  it("triggers score 10 when haemoptysis is true", () => {
    const log: DailyLogInput = { ...normalLog, haemoptysis: true };
    const result = computeRedFlagScore(log, normalBaseline);
    expect(result.global_score).toBe(10);
    expect(result.auto_triggered).toBe(true);
    expect(result.auto_trigger_reason).toContain("Haemoptysis");
  });

  it("triggers score 10 when respiratory rate > 30", () => {
    const log: DailyLogInput = { ...normalLog, respiratory_rate: 31 };
    const result = computeRedFlagScore(log, normalBaseline);
    expect(result.global_score).toBe(10);
    expect(result.auto_triggered).toBe(true);
    expect(result.auto_trigger_reason).toContain("Respiratory rate above 30");
  });

  it("does NOT auto-trigger at respiratory rate = 30 (boundary)", () => {
    const result = computeRedFlagScore({ ...normalLog, respiratory_rate: 30 }, normalBaseline);
    expect(result.auto_triggered).toBe(false);
  });
});

describe("computeRedFlagScore — asthma PEFR auto-trigger", () => {
  const asthmaBaseline: PatientBaseline = {
    ...normalBaseline,
    primary_diagnosis: "asthma",
    effective_dashboard: "asthma",
  };

  it("triggers score 9 when PEFR < 60% of personal best", () => {
    const log: DailyLogInput = {
      ...normalLog,
      disease_specific_data: {
        pefr_lpm: 200,
        pefr_personal_best: 400, // 200/400 = 50% < 60%
        rescue_inhaler_puffs: 2,
        night_waking: false,
        controller_taken: true,
        asthma_control_responses: [false, false, false, false],
      },
    };
    const result = computeRedFlagScore(log, asthmaBaseline);
    expect(result.global_score).toBe(9);
    expect(result.auto_triggered).toBe(true);
    expect(result.auto_trigger_reason).toContain("PEFR below 60%");
  });

  it("does NOT auto-trigger when PEFR = 60% of personal best (boundary)", () => {
    const log: DailyLogInput = {
      ...normalLog,
      disease_specific_data: {
        pefr_lpm: 240,
        pefr_personal_best: 400, // 240/400 = 60% — not below threshold
        rescue_inhaler_puffs: 2,
        night_waking: false,
        controller_taken: true,
        asthma_control_responses: [false, false, false, false],
      },
    };
    const result = computeRedFlagScore(log, asthmaBaseline);
    expect(result.auto_triggered).toBe(false);
  });
});

describe("computeRedFlagScore — SpO2 point scoring", () => {
  it("adds 4 points for SpO2 89–91%", () => {
    // Use COPD baseline — ILD baseline would add extra disease-specific SpO2-drop points
    const copdBaseline: PatientBaseline = { ...normalBaseline, primary_diagnosis: "copd", effective_dashboard: "copd" };
    const result = computeRedFlagScore({ ...normalLog, spo2_rest: 90 }, copdBaseline);
    // baseline score is 1, so 1 + 4 = 5
    expect(result.global_score).toBe(5);
    expect(result.auto_triggered).toBe(false);
    expect(result.score_breakdown.some((b) => b.factor.includes("89-91"))).toBe(true);
  });

  it("adds 6 points for SpO2 ≤ 88%", () => {
    const copdBaseline: PatientBaseline = { ...normalBaseline, primary_diagnosis: "copd", effective_dashboard: "copd" };
    const result = computeRedFlagScore({ ...normalLog, spo2_rest: 88 }, copdBaseline);
    // 1 + 6 = 7
    expect(result.global_score).toBe(7);
    expect(result.score_breakdown.some((b) => b.factor.includes("88%"))).toBe(true);
  });

  it("does not add SpO2 points for SpO2 = 92 (normal range)", () => {
    const copdBaseline: PatientBaseline = { ...normalBaseline, primary_diagnosis: "copd", effective_dashboard: "copd" };
    const result = computeRedFlagScore({ ...normalLog, spo2_rest: 92 }, copdBaseline);
    expect(result.global_score).toBe(1); // baseline only
  });
});

describe("computeRedFlagScore — common factors", () => {
  it("adds 2 points when mMRC increases by 1 grade from baseline", () => {
    // baseline mmrc = 1, today = 2 → increase of 1
    const result = computeRedFlagScore({ ...normalLog, mmrc_today: 2 }, normalBaseline);
    expect(result.global_score).toBe(3); // 1 + 2
    expect(result.score_breakdown.some((b) => b.factor.includes("mMRC"))).toBe(true);
  });

  it("adds 1 point when AQI > 200", () => {
    const result = computeRedFlagScore({ ...normalLog, aqi_value: 201 }, normalBaseline);
    expect(result.global_score).toBe(2); // 1 + 1
    expect(result.score_breakdown.some((b) => b.factor.includes("AQI"))).toBe(true);
  });

  it("does NOT add AQI point at AQI = 200 (boundary)", () => {
    const result = computeRedFlagScore({ ...normalLog, aqi_value: 200 }, normalBaseline);
    expect(result.global_score).toBe(1); // no AQI penalty
  });

  it("adds 1 point when a medication is missed", () => {
    const log: DailyLogInput = {
      ...normalLog,
      medication_compliance: { pirfenidone: false, prednisolone: true },
    };
    const result = computeRedFlagScore(log, normalBaseline);
    expect(result.global_score).toBe(2); // 1 + 1
    expect(result.score_breakdown.some((b) => b.factor.includes("medication"))).toBe(true);
  });

  it("adds 2 points when any VAS symptom > 7", () => {
    const log: DailyLogInput = {
      ...normalLog,
      vas_symptoms: { breathlessness: 8 },
    };
    const result = computeRedFlagScore(log, normalBaseline);
    expect(result.global_score).toBe(3); // 1 + 2
  });

  it("does NOT add VAS points when all symptoms ≤ 7", () => {
    const log: DailyLogInput = { ...normalLog, vas_symptoms: { breathlessness: 7 } };
    const result = computeRedFlagScore(log, normalBaseline);
    expect(result.global_score).toBe(1);
  });
});

describe("computeRedFlagScore — disease-specific: asthma", () => {
  const asthmaBaseline: PatientBaseline = {
    ...normalBaseline,
    primary_diagnosis: "asthma",
    effective_dashboard: "asthma",
  };

  it("adds 3 points for night waking", () => {
    const log: DailyLogInput = {
      ...normalLog,
      disease_specific_data: { night_waking: true, rescue_inhaler_puffs: 0, controller_taken: true, asthma_control_responses: null },
    };
    const result = computeRedFlagScore(log, asthmaBaseline);
    expect(result.global_score).toBe(4); // 1 + 3
    expect(result.score_breakdown.some((b) => b.factor.includes("Night waking"))).toBe(true);
  });

  it("adds 3 points when rescue inhaler puffs > 4", () => {
    const log: DailyLogInput = {
      ...normalLog,
      disease_specific_data: { rescue_inhaler_puffs: 5, night_waking: false, controller_taken: true, asthma_control_responses: null },
    };
    const result = computeRedFlagScore(log, asthmaBaseline);
    expect(result.global_score).toBe(4); // 1 + 3
  });

  it("does NOT add rescue inhaler points at exactly 4 puffs (boundary)", () => {
    const log: DailyLogInput = {
      ...normalLog,
      disease_specific_data: { rescue_inhaler_puffs: 4, night_waking: false, controller_taken: true, asthma_control_responses: null },
    };
    const result = computeRedFlagScore(log, asthmaBaseline);
    expect(result.global_score).toBe(1);
  });
});

describe("computeRedFlagScore — disease-specific: bronchiectasis", () => {
  const bronchBaseline: PatientBaseline = {
    ...normalBaseline,
    primary_diagnosis: "bronchiectasis",
    effective_dashboard: "bronchiectasis",
  };

  it("adds 4 points for dark green sputum", () => {
    const log: DailyLogInput = {
      ...normalLog,
      disease_specific_data: { sputum_colour: "dark_green", sputum_volume: "usual", malaise: false, pedal_oedema: false, wheezing: false },
    };
    const result = computeRedFlagScore(log, bronchBaseline);
    expect(result.global_score).toBe(5); // 1 + 4
    expect(result.score_breakdown.some((b) => b.factor.includes("Dark green"))).toBe(true);
  });

  it("adds 2 points for malaise", () => {
    const log: DailyLogInput = {
      ...normalLog,
      disease_specific_data: { sputum_colour: "clear", sputum_volume: "usual", malaise: true, pedal_oedema: false, wheezing: false },
    };
    const result = computeRedFlagScore(log, bronchBaseline);
    expect(result.global_score).toBe(3); // 1 + 2
  });
});

describe("computeRedFlagScore — disease-specific: ILD", () => {
  const ildBaseline: PatientBaseline = {
    ...normalBaseline,
    primary_diagnosis: "ild",
    effective_dashboard: "ild",
    baseline_cough_vas: 2,
    baseline_spo2: 96,
  };

  it("adds 4 points when mMRC ≥ 4 (unable to walk across room)", () => {
    const result = computeRedFlagScore({ ...normalLog, mmrc_today: 4 }, ildBaseline);
    // mMRC increase from baseline(1) to 4 = +3 grades → +2 common points
    // mMRC ≥ 4 ILD rule → +4 disease-specific points
    expect(result.score_breakdown.some((b) => b.factor.includes("Unable to walk"))).toBe(true);
  });

  it("adds 3 points when cough VAS increased by ≥ 3 from baseline", () => {
    const log: DailyLogInput = {
      ...normalLog,
      vas_symptoms: { cough: 5 }, // baseline_cough_vas = 2 → increase of 3
      disease_specific_data: { kbild_score: 50, antifibrotic_taken: true, rash: false, diarrhoea: false },
    };
    const result = computeRedFlagScore(log, ildBaseline);
    expect(result.score_breakdown.some((b) => b.factor.includes("Sudden cough increase"))).toBe(true);
  });

  it("adds 3 points when SpO2 drops > 3% from baseline", () => {
    // baseline 96, today 92 → drop of 4 > 3
    const result = computeRedFlagScore({ ...normalLog, spo2_rest: 92 }, ildBaseline);
    expect(result.score_breakdown.some((b) => b.factor.includes("SpO2 dropped"))).toBe(true);
  });
});

describe("computeRedFlagScore — risk bands", () => {
  it("scores 1 (min) → low risk, green indicator", () => {
    const result = computeRedFlagScore(normalLog, normalBaseline);
    expect(result.global_score).toBe(1);
    expect(result.risk_level).toBe("low");
    expect(result.indicator_color).toBe("green");
  });

  it("scores moderate risk, yellow indicator with AQI + missed medication", () => {
    // Use COPD baseline to avoid ILD disease-specific points
    const copdBaseline: PatientBaseline = { ...normalBaseline, primary_diagnosis: "copd", effective_dashboard: "copd" };
    // AQI > 200 (+1) + missed medication (+1) + mMRC+1 (+2) = 4 common points → total 5 = moderate
    const log: DailyLogInput = {
      ...normalLog,
      aqi_value: 250,
      mmrc_today: 2,
      medication_compliance: { med: false },
    };
    const result = computeRedFlagScore(log, copdBaseline);
    expect(result.risk_level).toBe("moderate");
    expect(result.indicator_color).toBe("yellow");
    expect(result.global_score).toBeGreaterThanOrEqual(4);
    expect(result.global_score).toBeLessThanOrEqual(6);
  });

  it("score is capped at 10 when multiple factors combine above 10", () => {
    const log: DailyLogInput = {
      ...normalLog,
      spo2_rest: 88,          // +6
      mmrc_today: 3,           // +2 (increase from baseline 1)
      aqi_value: 250,          // +1
      medication_compliance: { med: false }, // +1
      vas_symptoms: { breathlessness: 9 },   // +2
      haemoptysis: false,
      respiratory_rate: 16,
    };
    const result = computeRedFlagScore(log, normalBaseline);
    expect(result.global_score).toBeLessThanOrEqual(10);
  });
});

// ─── runAlertEngine ──────────────────────────────────────────────────────────

describe("runAlertEngine — dispatches to correct disease engine", () => {
  it("returns a green alert for a fully normal asthma log", () => {
    const asthmaBaseline: PatientBaseline = {
      ...normalBaseline,
      primary_diagnosis: "asthma",
      effective_dashboard: "asthma",
    };
    const log: DailyLogInput = {
      ...normalLog,
      disease_specific_data: {
        rescue_inhaler_puffs: 0,
        night_waking: false,
        controller_taken: true,
        pefr_lpm: 380,
        pefr_personal_best: 400,
        asthma_control_responses: [false, false, false, false],
      },
    };
    const result = runAlertEngine(log, [], asthmaBaseline);
    expect(result.alert_type).toBe("green");
    expect(result.reason_text.trim().length).toBeGreaterThan(0);
  });

  it("returns a red alert when haemoptysis is true (asthma)", () => {
    const asthmaBaseline: PatientBaseline = {
      ...normalBaseline,
      primary_diagnosis: "asthma",
      effective_dashboard: "asthma",
    };
    const result = runAlertEngine({ ...normalLog, haemoptysis: true }, [], asthmaBaseline);
    expect(result.alert_type).toBe("red");
  });

  it("maps post_icu to bronchiectasis alert engine", () => {
    const posticuBaseline: PatientBaseline = {
      ...normalBaseline,
      primary_diagnosis: "post_icu",
      effective_dashboard: "post_icu",
    };
    // Should not throw — post_icu routes through bronchiectasis engine
    const result = runAlertEngine(normalLog, [], posticuBaseline);
    expect(["green", "yellow", "red"]).toContain(result.alert_type);
    expect(result.reason_text.trim().length).toBeGreaterThan(0);
  });

  it("alert reason_text is never empty (invariant check)", () => {
    const dashboards = ["asthma", "copd", "bronchiectasis", "ild", "post_icu"] as const;
    for (const dashboard of dashboards) {
      const baseline: PatientBaseline = {
        ...normalBaseline,
        primary_diagnosis: dashboard === "post_icu" ? "post_icu" : dashboard,
        effective_dashboard: dashboard,
      };
      const result = runAlertEngine(normalLog, [], baseline);
      expect(result.reason_text.trim().length).toBeGreaterThan(0);
      expect(result.suppression_key.trim().length).toBeGreaterThan(0);
    }
  });
});
