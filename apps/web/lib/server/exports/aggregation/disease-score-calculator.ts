import type {
  IldTrackRecord,
  AsthmaTrackRecord,
  CopdTrackRecord,
  BronchTrackRecord,
  PostIcuTrackRecord,
  PatientExportRecord,
} from "../export.types";
import { toTitleCase, formatDateDDMMYYYY, safeValue } from "./clinical-metrics";

const KBILD_OPTION_LABELS: Record<string, string[]> = {
  frequency: [
    "Every time (1)",
    "Most times (2)",
    "Several times (3)",
    "Sometimes (4)",
    "Occasionally (5)",
    "Rarely (6)",
    "Never (7)",
  ],
  time: [
    "All of the time (1)",
    "Most of the time (2)",
    "A good bit of the time (3)",
    "Some of the time (4)",
    "A little of the time (5)",
    "Hardly any of the time (6)",
    "None of the time (7)",
  ],
  financial: [
    "A significant amount (1)",
    "A large amount (2)",
    "A considerable amount (3)",
    "A reasonable amount (4)",
    "A small amount (5)",
    "Hardly at all (6)",
    "Not at all (7)",
  ],
};

function formatKbildResponse(val: unknown, type: "frequency" | "time" | "financial" = "frequency"): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "number" && val >= 1 && val <= 7) {
    const list: string[] = KBILD_OPTION_LABELS[type] ?? KBILD_OPTION_LABELS.frequency ?? [];
    return list[val - 1] ?? `Score ${val}/7`;
  }
  return String(val);
}

// ── 1. ILD Clinical Track Processor ─────────────────────────────────────────

export function processIldLogEntry(
  patient: PatientExportRecord,
  log: Record<string, unknown>,
  sno: number,
): IldTrackRecord {
  const raw = log as Record<string, unknown>;
  const ds = (raw["disease_specific_data"] ?? {}) as Record<string, unknown>;
  const logDate = formatDateDDMMYYYY(String(raw["logged_at"] ?? ""));

  const kResponses = (ds["kbild_responses"] ?? raw["kbild_responses"] ?? {}) as Record<string, unknown>;
  const kArray = Array.isArray(kResponses) ? kResponses : [];

  const getQ = (idx: number, key: string, type: "frequency" | "time" | "financial" = "frequency"): string => {
    const val = kArray[idx] ?? kResponses[key] ?? kResponses[`q${idx + 1}`] ?? ds[key] ?? raw[key];
    return formatKbildResponse(val, type);
  };

  const parseScore = (val: unknown): number => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const match = val.match(/\((\d)\)/);
      if (match) return Number(match[1]);
      const n = Number(val);
      if (!isNaN(n)) return n;
    }
    return 4; // Mid-scale default
  };

  const q1 = getQ(0, "kbild_q1_stairs", "frequency");
  const q2 = getQ(1, "kbild_q2_chest_tight", "time");
  const q3 = getQ(2, "kbild_q3_worry", "frequency");
  const q4 = getQ(3, "kbild_q4_avoid_breathless", "frequency");
  const q5 = getQ(4, "kbild_q5_in_control", "time");
  const q6 = getQ(5, "kbild_q6_feeling_down", "frequency");
  const q7 = getQ(6, "kbild_q7_air_hunger", "frequency");
  const q8 = getQ(7, "kbild_q8_anxious", "frequency");
  const q9 = getQ(8, "kbild_q9_wheeze", "frequency");
  const q10 = getQ(9, "kbild_q10_getting_worse", "time");
  const q11 = getQ(10, "kbild_q11_interfered_tasks", "frequency");
  const q12 = getQ(11, "kbild_q12_expect_worse", "frequency");
  const q13 = getQ(12, "kbild_q13_carry_groceries", "time");
  const q14 = getQ(13, "kbild_q14_end_of_life", "frequency");
  const q15 = getQ(14, "kbild_q15_financial", "financial");

  // Calculate KBILD Total & Sub-domain scores
  const allQs = [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14, q15].map(parseScore);
  const rawSum = allQs.reduce((a, b) => a + b, 0);
  
  // Normalized 0-100 score: (sum - 15) / (105 - 15) * 100
  let totalScore: number =
    typeof ds["kbild_score"] === "number"
      ? ds["kbild_score"]
      : typeof raw["kbild_score"] === "number"
        ? raw["kbild_score"]
        : Math.round(((rawSum - 15) / 90) * 100);

  // Domain subscores (0-100)
  const psychQs = [q3, q6, q8, q10, q12, q14, q15].map(parseScore);
  const psychScore = Math.round(((psychQs.reduce((a, b) => a + b, 0) - 7) / 42) * 100);

  const breathQs = [q1, q4, q11, q13].map(parseScore);
  const breathScore = Math.round(((breathQs.reduce((a, b) => a + b, 0) - 4) / 24) * 100);

  const chestQs = [q2, q5, q7, q9].map(parseScore);
  const chestScore = Math.round(((chestQs.reduce((a, b) => a + b, 0) - 4) / 24) * 100);

  // Clinical Interpretation
  let interpretation = "Good / Excellent HRQoL (High Quality of Life)";
  if (totalScore < 50) {
    interpretation = "Severe HRQoL Impairment (High Disease Burden)";
  } else if (totalScore < 70) {
    interpretation = "Moderate HRQoL Impairment";
  }

  const spo2Ex = Number(raw["spo2_exertion"]);
  const spo2Rest = Number(raw["spo2_rest"]);
  let alertFlag = "Stable";
  if (spo2Rest < 90 || (Number.isFinite(spo2Ex) && spo2Ex < 88)) {
    alertFlag = "Critical Desaturation Alert";
  } else if (Number.isFinite(spo2Ex) && spo2Rest - spo2Ex >= 4) {
    alertFlag = "Exertional Desaturation Drop (≥4%)";
  }

  // Medication adherence
  let medAdh = "—";
  if (raw["medication_compliance"] && typeof raw["medication_compliance"] === "object") {
    const entries = Object.entries(raw["medication_compliance"] as Record<string, boolean>);
    if (entries.length > 0) {
      const taken = entries.filter(([, v]) => v === true).length;
      medAdh = `${taken}/${entries.length} Doses Taken (${Math.round((taken / entries.length) * 100)}%)`;
    }
  }

  return {
    sno,
    uhid: patient.uhid,
    name: patient.name,
    age: patient.age,
    sex: patient.sex,
    ildSubtype: patient.completeDiag || patient.primaryDiagnosis || "ILD / Fibrosis",
    logDate,
    spo2Rest: safeValue(raw["spo2_rest"]),
    spo2Exertion: safeValue(raw["spo2_exertion"]),
    heartRate: safeValue(raw["heart_rate"]),
    mmrc: safeValue(raw["mmrc_today"]),
    aqi: safeValue(raw["aqi_value"]),
    medicationAdherence: medAdh,
    kbildQ1_breathlessStairs: q1,
    kbildQ2_chestTight: q2,
    kbildQ3_worryComplaint: q3,
    kbildQ4_avoidBreathless: q4,
    kbildQ5_inControl: q5,
    kbildQ6_feelingDown: q6,
    kbildQ7_airHunger: q7,
    kbildQ8_anxious: q8,
    kbildQ9_wheeze: q9,
    kbildQ10_gettingWorse: q10,
    kbildQ11_interferedTasks: q11,
    kbildQ12_expectWorse: q12,
    kbildQ13_carryGroceries: q13,
    kbildQ14_endOfLife: q14,
    kbildQ15_financial: q15,
    kbildTotalScore: totalScore,
    kbildPsychologicalSubscore: psychScore,
    kbildBreathlessSubscore: breathScore,
    kbildChestSubscore: chestScore,
    kbildInterpretation: interpretation,
    clinicalRiskLevel: patient.riskLevel,
    alertFlag,
  };
}

// ── 2. Asthma Clinical Track Processor ──────────────────────────────────────

export function processAsthmaLogEntry(
  patient: PatientExportRecord,
  log: Record<string, unknown>,
  sno: number,
): AsthmaTrackRecord {
  const raw = log as Record<string, unknown>;
  const ds = (raw["disease_specific_data"] ?? {}) as Record<string, unknown>;
  const logDate = formatDateDDMMYYYY(String(raw["logged_at"] ?? ""));

  const parseYesNo = (val: unknown): string => {
    if (val === true || val === "true" || val === "yes" || val === 1) return "Yes";
    if (val === false || val === "false" || val === "no" || val === 0) return "No";
    return "—";
  };

  const day = parseYesNo(ds["asthma_daytime_symptoms"] ?? raw["daytime_symptoms"] ?? raw["asthma_daytime_symptoms"]);
  const night = parseYesNo(ds["asthma_night_waking"] ?? raw["night_waking"] ?? raw["asthma_night_waking"]);
  const reliever = parseYesNo(ds["asthma_reliever_use"] ?? raw["reliever_use"] ?? raw["asthma_reliever_use"]);
  const activity = parseYesNo(ds["asthma_activity_limitation"] ?? raw["activity_limitation"] ?? raw["asthma_activity_limitation"]);

  // Calculate GINA criteria affirmative responses (0 - 4)
  let yesCount = 0;
  if (day === "Yes") yesCount++;
  if (night === "Yes") yesCount++;
  if (reliever === "Yes") yesCount++;
  if (activity === "Yes") yesCount++;

  let ginaClassification = "Well Controlled (0/4)";
  let actionRecommendation = "Maintain current maintenance controller therapy";

  if (yesCount >= 3) {
    ginaClassification = `Poorly Controlled / Uncontrolled (${yesCount}/4)`;
    actionRecommendation = "Urgent clinical review: Step-up controller assessment indicated";
  } else if (yesCount >= 1) {
    ginaClassification = `Partially Controlled (${yesCount}/4)`;
    actionRecommendation = "Review inhaler adherence, technique, and allergen trigger avoidance";
  }

  const pefr = raw["pefr_lpm"] ?? ds["pefr_lpm"] ?? raw["pefr_reading"] ?? ds["pefr_reading"];
  const rescuePuffs = raw["rescue_inhaler_puffs"] ?? ds["rescue_inhaler_puffs"] ?? "0";

  let pefrPct = "—";
  if (pefr && typeof pefr === "number") {
    const personalBest = Number(patient.fev1Fvc) || 450;
    pefrPct = `${Math.round((pefr / personalBest) * 100)}%`;
  }

  const triggers = Array.isArray(ds["triggers"]) ? ds["triggers"].join(", ") : (typeof ds["triggers"] === "string" ? ds["triggers"] : "None reported");

  // Medication adherence
  let medAdh = "—";
  if (raw["medication_compliance"] && typeof raw["medication_compliance"] === "object") {
    const entries = Object.entries(raw["medication_compliance"] as Record<string, boolean>);
    if (entries.length > 0) {
      const taken = entries.filter(([, v]) => v === true).length;
      medAdh = `${taken}/${entries.length} Doses Taken (${Math.round((taken / entries.length) * 100)}%)`;
    }
  }

  return {
    sno,
    uhid: patient.uhid,
    name: patient.name,
    age: patient.age,
    sex: patient.sex,
    logDate,
    spo2Rest: safeValue(raw["spo2_rest"]),
    heartRate: safeValue(raw["heart_rate"]),
    mmrc: safeValue(raw["mmrc_today"]),
    aqi: safeValue(raw["aqi_value"]),
    medicationAdherence: medAdh,
    daytimeSymptoms: day,
    nightWaking: night,
    relieverUse: reliever,
    activityLimitation: activity,
    rescuePuffsCount: safeValue(rescuePuffs),
    pefrReading: safeValue(pefr),
    pefrPctPersonalBest: pefrPct,
    inhalerAdherence: ds["inhaler_technique_verified"] ? "Verified Correct" : "Standard",
    triggersReported: triggers,
    asthmaControlScore: `${yesCount}/4 Criteria`,
    ginaClassification,
    clinicalRiskLevel: patient.riskLevel,
    actionRecommendation,
  };
}

// ── 3. COPD Clinical Track Processor ────────────────────────────────────────

export function processCopdLogEntry(
  patient: PatientExportRecord,
  log: Record<string, unknown>,
  sno: number,
): CopdTrackRecord {
  const raw = log as Record<string, unknown>;
  const ds = (raw["disease_specific_data"] ?? {}) as Record<string, unknown>;
  const logDate = formatDateDDMMYYYY(String(raw["logged_at"] ?? ""));

  const sputumVol = toTitleCase(String(ds["copd_sputum_volume"] ?? raw["sputum_volume"] ?? "None"));
  const sputumColour = toTitleCase(String(ds["copd_sputum_colour"] ?? raw["sputum_colour"] ?? "Clear"));
  const isPurulent = ds["copd_purulence"] === true || sputumColour.toLowerCase().includes("green") || sputumColour.toLowerCase().includes("yellow");
  
  const hemoptysis = ds["copd_hemoptysis"] === true || raw["haemoptysis"] === true;
  const hemoptysisVol = hemoptysis ? toTitleCase(String(ds["copd_hemoptysis_volume"] ?? raw["haemoptysis_volume"] ?? "Streaks")) : "None";

  const energy = ds["copd_energy_level"] ?? raw["energy_level"] ?? 5;
  const dyspneaExertion = ds["dyspnea_exertion"] ?? raw["mmrc_today"] ?? 1;
  const fever = ds["copd_fever"] === true || raw["fever"] === true ? "Yes" : "No";
  const rescuePuffs = ds["copd_rescue_inhaler_puffs"] ?? raw["rescue_inhaler_puffs"] ?? 0;

  // Anthonisen Criteria Count: 1) Increased dyspnea, 2) Increased volume, 3) Increased purulence
  let cardinalCount = 0;
  const mmrcNum = Number(raw["mmrc_today"]);
  if (mmrcNum >= 2) cardinalCount++;
  if (sputumVol.toLowerCase().includes("tablespoon") || sputumVol.toLowerCase().includes("cup") || sputumVol.toLowerCase().includes("large")) cardinalCount++;
  if (isPurulent) cardinalCount++;

  let exacerbationType = "Stable Baseline COPD";
  let actionRec = "Continue standard maintenance bronchodilator & inhaled steroid regimen";

  if (hemoptysis) {
    exacerbationType = "Red-Flag Hemoptysis Alert";
    actionRec = "Immediate clinical examination / bronchoscopy evaluation recommended";
  } else if (cardinalCount === 3) {
    exacerbationType = "Type 1 Severe Exacerbation (All 3 Cardinal Symptoms)";
    actionRec = "Initiate oral antibiotics and systemic corticosteroid burst therapy per GOLD guideline";
  } else if (cardinalCount === 2) {
    exacerbationType = "Type 2 Moderate Exacerbation (2 Cardinal Symptoms)";
    actionRec = "Step-up nebulized bronchodilators; assess for antibiotic need";
  } else if (cardinalCount === 1) {
    exacerbationType = "Type 3 Mild Exacerbation (1 Cardinal Symptom)";
    actionRec = "Increase rescue bronchodilator frequency and monitor vitals closely";
  }

  // Medication adherence
  let medAdh = "—";
  if (raw["medication_compliance"] && typeof raw["medication_compliance"] === "object") {
    const entries = Object.entries(raw["medication_compliance"] as Record<string, boolean>);
    if (entries.length > 0) {
      const taken = entries.filter(([, v]) => v === true).length;
      medAdh = `${taken}/${entries.length} Doses Taken (${Math.round((taken / entries.length) * 100)}%)`;
    }
  }

  return {
    sno,
    uhid: patient.uhid,
    name: patient.name,
    age: patient.age,
    sex: patient.sex,
    copdStage: patient.completeDiag || "COPD GOLD Stage",
    logDate,
    spo2Rest: safeValue(raw["spo2_rest"]),
    spo2Exertion: safeValue(raw["spo2_exertion"]),
    heartRate: safeValue(raw["heart_rate"]),
    mmrc: safeValue(raw["mmrc_today"]),
    aqi: safeValue(raw["aqi_value"]),
    medicationAdherence: medAdh,
    sputumVolume: sputumVol,
    sputumColour,
    sputumPurulence: isPurulent ? "Yes (Purulent)" : "No (Mucoid)",
    hemoptysisPresent: hemoptysis ? "Yes" : "No",
    hemoptysisVolume: hemoptysisVol,
    rescueInhalerPuffs: safeValue(rescuePuffs),
    energyLevel: safeValue(energy),
    dyspneaExertion: safeValue(dyspneaExertion),
    feverRecorded: fever,
    cardinalSymptomsCount: `${cardinalCount}/3 Cardinal Criteria`,
    copdExacerbationType: exacerbationType,
    clinicalRiskLevel: patient.riskLevel,
    actionRecommendation: actionRec,
  };
}

// ── 4. Bronchiectasis Clinical Track Processor ──────────────────────────────

export function processBronchLogEntry(
  patient: PatientExportRecord,
  log: Record<string, unknown>,
  sno: number,
): BronchTrackRecord {
  const raw = log as Record<string, unknown>;
  const ds = (raw["disease_specific_data"] ?? {}) as Record<string, unknown>;
  const logDate = formatDateDDMMYYYY(String(raw["logged_at"] ?? ""));

  const clearanceDone = ds["airway_clearance_completed"] === true || ds["act_done"] === true || raw["airway_clearance_completed"] === true ? "Yes" : "No";
  const technique = toTitleCase(String(ds["airway_clearance_technique"] ?? ds["clearance_device"] ?? "Active Cycle of Breathing (ACBT)"));
  const easeOfClearance = ds["ease_of_clearance"] ?? raw["ease_of_clearance"] ?? 3;

  const sputumVol = toTitleCase(String(ds["bronch_sputum_volume"] ?? raw["sputum_volume"] ?? "Usual"));
  const sputumColour = toTitleCase(String(ds["bronch_sputum_colour"] ?? raw["sputum_colour"] ?? "Clear"));
  
  const hemoptysis = ds["hemoptysis_present"] === true || raw["haemoptysis"] === true;
  const hemoptysisSev = hemoptysis ? toTitleCase(String(ds["hemoptysis_severity"] ?? raw["haemoptysis_volume"] ?? "Streaks")) : "None";
  
  const abx = ds["antibiotic_usage"] === true || raw["antibiotics_active"] === true ? "Yes (Active Course)" : "No";
  const temp = raw["temperature_f"] ? `${raw["temperature_f"]}°F` : (ds["fever"] === true ? "Fever Reported" : "Normal");

  let flareRisk = "Stable Maintenance Phase";
  let actionRec = "Continue daily ACT airway clearance routines and postural drainage";

  if (hemoptysis && (hemoptysisSev.includes("Cup") || hemoptysisSev.includes("Massive"))) {
    flareRisk = "Severe Hemoptysis Alert (High Acuity)";
    actionRec = "Emergency hospital transfer for bronchial artery embolization review";
  } else if (sputumColour.toLowerCase().includes("green") || sputumVol.toLowerCase().includes("large")) {
    flareRisk = "Acute Infective Exacerbation (Pseudomonas / Bacterial Flare)";
    actionRec = "Collect sputum culture and start targeted antipseudomonal / broad-spectrum therapy";
  } else if (clearanceDone === "No") {
    flareRisk = "Sub-optimal Clearance Compliance Risk";
    actionRec = "Re-educate on ACT techniques and oscillatory PEP device use";
  }

  // Medication adherence
  let medAdh = "—";
  if (raw["medication_compliance"] && typeof raw["medication_compliance"] === "object") {
    const entries = Object.entries(raw["medication_compliance"] as Record<string, boolean>);
    if (entries.length > 0) {
      const taken = entries.filter(([, v]) => v === true).length;
      medAdh = `${taken}/${entries.length} Doses Taken (${Math.round((taken / entries.length) * 100)}%)`;
    }
  }

  return {
    sno,
    uhid: patient.uhid,
    name: patient.name,
    age: patient.age,
    sex: patient.sex,
    etiology: patient.completeDiag || "Non-CF Bronchiectasis",
    logDate,
    spo2Rest: safeValue(raw["spo2_rest"]),
    heartRate: safeValue(raw["heart_rate"]),
    mmrc: safeValue(raw["mmrc_today"]),
    aqi: safeValue(raw["aqi_value"]),
    medicationAdherence: medAdh,
    airwayClearanceDone: clearanceDone,
    clearanceTechnique: technique,
    easeOfClearance: safeValue(easeOfClearance),
    sputumVolume: sputumVol,
    sputumColour,
    hemoptysisPresent: hemoptysis ? "Yes" : "No",
    hemoptysisSeverity: hemoptysisSev,
    antibioticCourseActive: abx,
    temperatureF: temp,
    flareSeverityIndex: sputumColour.includes("Green") ? "High (Purulent)" : "Low (Mucoid)",
    flareRiskStatus: flareRisk,
    clinicalRiskLevel: patient.riskLevel,
    actionRecommendation: actionRec,
  };
}

// ── 5. Post-ICU Recovery Clinical Track Processor ───────────────────────────

export function processPostIcuLogEntry(
  patient: PatientExportRecord,
  log: Record<string, unknown>,
  sno: number,
): PostIcuTrackRecord {
  const raw = log as Record<string, unknown>;
  const ds = (raw["disease_specific_data"] ?? {}) as Record<string, unknown>;
  const logDate = formatDateDDMMYYYY(String(raw["logged_at"] ?? ""));

  const mobility = toTitleCase(String(ds["functional_mobility_level"] ?? ds["mobility"] ?? "Independent Walking"));
  const walkMeters = ds["distance_walked_meters"] ?? ds["walk_distance"] ?? raw["six_minute_walk_distance"] ?? 150;
  const weakness = ds["icu_weakness_score"] ?? ds["muscle_weakness"] ?? 2;
  const fatigue = ds["fatigue_score"] ?? raw["vas_fatigue"] ?? 3;
  const dyspneaExertion = ds["dyspnea_on_exertion"] ?? raw["mmrc_today"] ?? 1;
  const sleep = ds["sleep_quality"] ?? 7;
  const nutrition = toTitleCase(String(ds["nutrition_intake"] ?? "Adequate"));
  const mental = toTitleCase(String(ds["mental_clarity_delirium"] ?? ds["cognition"] ?? "Clear"));

  // Functional Recovery Index (0 - 100)
  // Higher mobility, distance, sleep, and nutrition increase index; high weakness/fatigue decrease index
  let mobilityScore = 25;
  if (mobility.toLowerCase().includes("independent")) mobilityScore = 40;
  else if (mobility.toLowerCase().includes("assisted")) mobilityScore = 25;
  else if (mobility.toLowerCase().includes("chair")) mobilityScore = 15;
  else mobilityScore = 5;

  const recoveryIndex = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        mobilityScore +
          Math.min(30, Number(walkMeters) / 10) +
          (10 - Number(weakness)) * 1.5 +
          (10 - Number(fatigue)) * 1.5,
      ),
    ),
  );

  let picsTrajectory = "Accelerated Recovery / High Functional Independence (≥75)";
  let actionRec = "Progress active cardiopulmonary rehabilitation and resistance pacing";

  if (recoveryIndex < 45 || Number(weakness) >= 7) {
    picsTrajectory = "Severe Post-Intensive Care Syndrome (PICS / Severe ICU Weakness)";
    actionRec = "Multidisciplinary physical therapy, nutritional supplementation, and respiratory muscle training required";
  } else if (recoveryIndex < 75) {
    picsTrajectory = "Steady Rehabilitation / Moderate Care Needs";
    actionRec = "Continue guided home walking exercises and energy conservation techniques";
  }

  // Medication adherence
  let medAdh = "—";
  if (raw["medication_compliance"] && typeof raw["medication_compliance"] === "object") {
    const entries = Object.entries(raw["medication_compliance"] as Record<string, boolean>);
    if (entries.length > 0) {
      const taken = entries.filter(([, v]) => v === true).length;
      medAdh = `${taken}/${entries.length} Doses Taken (${Math.round((taken / entries.length) * 100)}%)`;
    }
  }

  return {
    sno,
    uhid: patient.uhid,
    name: patient.name,
    age: patient.age,
    sex: patient.sex,
    icuDischargeDate: patient.dateOfEnroll,
    logDate,
    spo2Rest: safeValue(raw["spo2_rest"]),
    spo2Exertion: safeValue(raw["spo2_exertion"]),
    heartRate: safeValue(raw["heart_rate"]),
    mmrc: safeValue(raw["mmrc_today"]),
    aqi: safeValue(raw["aqi_value"]),
    medicationAdherence: medAdh,
    functionalMobilityLevel: mobility,
    walkDistanceMeters: safeValue(walkMeters),
    icuMuscleWeakness: safeValue(weakness),
    fatigueVas: safeValue(fatigue),
    dyspneaExertion: safeValue(dyspneaExertion),
    sleepQuality: safeValue(sleep),
    nutritionIntake: nutrition,
    mentalClarity: mental,
    functionalRecoveryIndex: recoveryIndex,
    sarcopeniaFatigueScore: safeValue(weakness),
    picsRecoveryTrajectory: picsTrajectory,
    clinicalRiskLevel: patient.riskLevel,
    actionRecommendation: actionRec,
  };
}
