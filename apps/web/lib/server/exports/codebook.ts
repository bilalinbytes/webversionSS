export interface CodebookEntry {
  disease: "ASTHMA" | "COPD" | "ILD" | "BRONCHIECTASIS" | "POST ICU";
  field: string;
  captureSource: string;
  treatment: "First / latest / change / dated history" | "Latest / dated history";
}

export const DISEASE_FIELD_CODEBOOK: CodebookEntry[] = [
  // ── ASTHMA ──────────────────────────────────────────────────────────────────
  {
    disease: "ASTHMA",
    field: "Rescue inhaler puffs",
    captureSource: "Direct mobile-app question",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "ASTHMA",
    field: "PEFR reading",
    captureSource: "Direct mobile-app question",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "ASTHMA",
    field: "Night waking due to asthma",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "ASTHMA",
    field: "Controller inhaler taken",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "ASTHMA",
    field: "PEFR personal best",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "ASTHMA",
    field: "Asthma control Q1–Q4 responses",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },
  {
    disease: "ASTHMA",
    field: "Asthma control yes-count",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "ASTHMA",
    field: "Asthma control status",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },

  // ── COPD ────────────────────────────────────────────────────────────────────
  {
    disease: "COPD",
    field: "Energy level",
    captureSource: "Direct mobile-app question",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "COPD",
    field: "Chest heaviness",
    captureSource: "Direct mobile-app question",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "COPD",
    field: "Sputum colour",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "COPD",
    field: "Sputum volume",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "COPD",
    field: "Sleep disturbed",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "COPD",
    field: "Decreased exercise tolerance",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "COPD",
    field: "Wheezing",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "COPD",
    field: "Step count",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "COPD",
    field: "Exercise tolerance good",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },
  {
    disease: "COPD",
    field: "Cough frequency",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "COPD",
    field: "Haemoptysis volume",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },

  // ── ILD ─────────────────────────────────────────────────────────────────────
  {
    disease: "ILD",
    field: "K-BILD score",
    captureSource: "Direct mobile-app question",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "ILD",
    field: "Antifibrotic medication taken",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "ILD",
    field: "Rash",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "ILD",
    field: "Diarrhoea",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "ILD",
    field: "K-BILD Q1–Q15 responses",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },
  {
    disease: "ILD",
    field: "K-BILD answered count",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "ILD",
    field: "K-BILD previous score",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "First / latest / change / dated history",
  },

  // ── BRONCHIECTASIS ──────────────────────────────────────────────────────────
  {
    disease: "BRONCHIECTASIS",
    field: "Ease of sputum clearance",
    captureSource: "Direct mobile-app question",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "BRONCHIECTASIS",
    field: "Sputum colour",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "BRONCHIECTASIS",
    field: "Sputum volume",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "BRONCHIECTASIS",
    field: "Feverish above 102°F",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "BRONCHIECTASIS",
    field: "Malaise / fatigue",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "BRONCHIECTASIS",
    field: "Pedal edema",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "BRONCHIECTASIS",
    field: "Wheezing",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "BRONCHIECTASIS",
    field: "Recorded temperature",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "BRONCHIECTASIS",
    field: "Haemoptysis volume",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },

  // ── POST ICU ────────────────────────────────────────────────────────────────
  {
    disease: "POST ICU",
    field: "Energy level",
    captureSource: "Direct mobile-app question",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "POST ICU",
    field: "Sleep quality",
    captureSource: "Direct mobile-app question",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "POST ICU",
    field: "Anxiety level",
    captureSource: "Direct mobile-app question",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "POST ICU",
    field: "Feverish above 102°F",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "POST ICU",
    field: "Confusion",
    captureSource: "Direct mobile-app question",
    treatment: "Latest / dated history",
  },
  {
    disease: "POST ICU",
    field: "Sputum colour",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },
  {
    disease: "POST ICU",
    field: "Sputum volume",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },
  {
    disease: "POST ICU",
    field: "Ease of sputum clearance",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "POST ICU",
    field: "Recorded temperature",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "First / latest / change / dated history",
  },
  {
    disease: "POST ICU",
    field: "Malaise",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },
  {
    disease: "POST ICU",
    field: "Haemoptysis volume",
    captureSource: "Supported by app data schema; include only when recorded",
    treatment: "Latest / dated history",
  },
];

export interface ColumnDefinition {
  header: string;
  width: number;
  align: "left" | "center" | "right";
  wrapText?: boolean;
  section: "baseline" | "dashboard" | "doctor" | "disease";
  isNumeric?: boolean;
}

// ── 62 Common Columns (In EXACT order) ──────────────────────────────────────
export const COMMON_EXPORT_COLUMNS: ColumnDefinition[] = [
  // A. Patient identity and baseline (Cols 1-21)
  { header: "S No.", width: 7, align: "center", section: "baseline" },
  { header: "File No.", width: 13, align: "center", section: "baseline" },
  { header: "UHID", width: 14, align: "center", section: "baseline" },
  { header: "Patient Name", width: 22, align: "left", section: "baseline" },
  { header: "Age", width: 7, align: "center", section: "baseline", isNumeric: true },
  { header: "Sex", width: 7, align: "center", section: "baseline" },
  { header: "Occupation", width: 18, align: "left", section: "baseline" },
  { header: "Significant Exposure", width: 22, align: "left", wrapText: true, section: "baseline" },
  { header: "Smoking Status", width: 15, align: "center", section: "baseline" },
  { header: "Smoking Index", width: 16, align: "center", section: "baseline" },
  { header: "Alcohol Status", width: 15, align: "center", section: "baseline" },
  { header: "Past Medical History", width: 26, align: "left", wrapText: true, section: "baseline" },
  { header: "Mobile No.", width: 15, align: "center", section: "baseline" },

  { header: "Date of Enrollment", width: 16, align: "center", section: "baseline" },
  { header: "Primary Diagnosis", width: 26, align: "left", wrapText: true, section: "baseline" },
  { header: "Disease Subtype", width: 24, align: "left", wrapText: true, section: "baseline" },
  { header: "Co-morbidities", width: 26, align: "left", wrapText: true, section: "baseline" },
  { header: "Baseline SpO2 (%)", width: 16, align: "right", section: "baseline", isNumeric: true },
  { header: "Baseline HR (BPM)", width: 16, align: "right", section: "baseline", isNumeric: true },
  { header: "Baseline 6MWD (m)", width: 16, align: "right", section: "baseline", isNumeric: true },
  { header: "Baseline FEV1 (L)", width: 16, align: "right", section: "baseline", isNumeric: true },
  { header: "Baseline FVC (L)", width: 16, align: "right", section: "baseline", isNumeric: true },
  { header: "Baseline FEV1/FVC (%)", width: 18, align: "right", section: "baseline", isNumeric: true },
  { header: "Baseline DLCO (%)", width: 16, align: "right", section: "baseline", isNumeric: true },
  { header: "Respiratory Support", width: 26, align: "left", wrapText: true, section: "baseline" },

  // B. Patient dashboard — longitudinal (Cols 22-52)
  { header: "Reporting period start", width: 18, align: "center", section: "dashboard" },
  { header: "Reporting period end", width: 18, align: "center", section: "dashboard" },
  { header: "Days in period", width: 14, align: "center", section: "dashboard", isNumeric: true },
  { header: "Days logged in app", width: 16, align: "center", section: "dashboard", isNumeric: true },
  { header: "Logging adherence (%)", width: 18, align: "right", section: "dashboard", isNumeric: true },
  { header: "Log date history (YYYY-MM-DD)", width: 32, align: "left", wrapText: true, section: "dashboard" },

  // Resting SpO2
  { header: "Resting SpO2 — first (%)", width: 20, align: "right", section: "dashboard", isNumeric: true },
  { header: "Resting SpO2 — latest (%)", width: 20, align: "right", section: "dashboard", isNumeric: true },
  { header: "Resting SpO2 — change (%)", width: 20, align: "right", section: "dashboard", isNumeric: true },
  { header: "Resting SpO2 — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "dashboard" },

  // Exertion SpO2
  { header: "Exertion SpO2 — first (%)", width: 21, align: "right", section: "dashboard", isNumeric: true },
  { header: "Exertion SpO2 — latest (%)", width: 21, align: "right", section: "dashboard", isNumeric: true },
  { header: "Exertion SpO2 — change (%)", width: 21, align: "right", section: "dashboard", isNumeric: true },
  { header: "Exertion SpO2 — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "dashboard" },

  // Heart rate
  { header: "Heart rate — first (bpm)", width: 19, align: "right", section: "dashboard", isNumeric: true },
  { header: "Heart rate — latest (bpm)", width: 19, align: "right", section: "dashboard", isNumeric: true },
  { header: "Heart rate — change (bpm)", width: 19, align: "right", section: "dashboard", isNumeric: true },
  { header: "Heart rate — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "dashboard" },

  // mMRC
  { header: "mMRC — first", width: 14, align: "right", section: "dashboard", isNumeric: true },
  { header: "mMRC — latest", width: 14, align: "right", section: "dashboard", isNumeric: true },
  { header: "mMRC — change", width: 14, align: "right", section: "dashboard", isNumeric: true },
  { header: "mMRC — dated history (YYYY-MM-DD=value)", width: 34, align: "left", wrapText: true, section: "dashboard" },

  // Oxygen requirement
  { header: "Oxygen requirement — dated history (YYYY-MM-DD=L/min)", width: 38, align: "left", wrapText: true, section: "dashboard" },

  // AQI
  { header: "AQI — first", width: 13, align: "right", section: "dashboard", isNumeric: true },
  { header: "AQI — latest", width: 13, align: "right", section: "dashboard", isNumeric: true },
  { header: "AQI — change", width: 13, align: "right", section: "dashboard", isNumeric: true },
  { header: "AQI — dated history (YYYY-MM-DD=value)", width: 34, align: "left", wrapText: true, section: "dashboard" },

  // Symptoms, side effects, med adherence & daily log history
  { header: "VAS symptoms — dated history (YYYY-MM-DD=symptom:value/10)", width: 44, align: "left", wrapText: true, section: "dashboard" },
  { header: "Side effects — dated history (YYYY-MM-DD=effects)", width: 36, align: "left", wrapText: true, section: "dashboard" },
  { header: "Medication adherence — dated history (YYYY-MM-DD=taken/prescribed, %)", width: 44, align: "left", wrapText: true, section: "dashboard" },
  { header: "Complete patient daily-log history (date-stamped)", width: 56, align: "left", wrapText: true, section: "dashboard" },

  // C. Doctor dashboard — longitudinal (Cols 53-62)
  { header: "Risk level — latest", width: 16, align: "center", section: "doctor" },
  { header: "Risk / alert — dated history (YYYY-MM-DD=status / reason)", width: 42, align: "left", wrapText: true, section: "doctor" },
  { header: "Active prescribed medications", width: 38, align: "left", wrapText: true, section: "doctor" },
  { header: "Medication start / change history (YYYY-MM-DD=medicine, dose, route, frequency)", width: 46, align: "left", wrapText: true, section: "doctor" },
  { header: "Stopped medication history (YYYY-MM-DD=medicine / reason)", width: 40, align: "left", wrapText: true, section: "doctor" },
  { header: "Per-medication adherence history (medicine: days taken / days prescribed, %)", width: 46, align: "left", wrapText: true, section: "doctor" },
  { header: "Doctor instructions — dated history (YYYY-MM-DD=instruction)", width: 42, align: "left", wrapText: true, section: "doctor" },
  { header: "Clinical notes — dated history (YYYY-MM-DD=note)", width: 42, align: "left", wrapText: true, section: "doctor" },
  { header: "Appointment history (YYYY-MM-DD=status, type, notes)", width: 40, align: "left", wrapText: true, section: "doctor" },
  { header: "PFT history (YYYY-MM-DD=FEV1, FVC, ratio, DLCO, 6MWD)", width: 46, align: "left", wrapText: true, section: "doctor" },
];

// ── Asthma Disease Columns ──────────────────────────────────────────────────
export const ASTHMA_EXPORT_COLUMNS: ColumnDefinition[] = [
  ...COMMON_EXPORT_COLUMNS,
  // Direct mobile questions
  { header: "Rescue inhaler puffs [mobile] — first (puffs)", width: 22, align: "right", section: "disease", isNumeric: true },
  { header: "Rescue inhaler puffs [mobile] — latest (puffs)", width: 22, align: "right", section: "disease", isNumeric: true },
  { header: "Rescue inhaler puffs [mobile] — change (puffs)", width: 22, align: "right", section: "disease", isNumeric: true },
  { header: "Rescue inhaler puffs [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "PEFR reading [mobile] — first (L/min)", width: 22, align: "right", section: "disease", isNumeric: true },
  { header: "PEFR reading [mobile] — latest (L/min)", width: 22, align: "right", section: "disease", isNumeric: true },
  { header: "PEFR reading [mobile] — change (L/min)", width: 22, align: "right", section: "disease", isNumeric: true },
  { header: "PEFR reading [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Night waking due to asthma [mobile] — latest", width: 24, align: "center", section: "disease" },
  { header: "Night waking due to asthma [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Controller inhaler taken [mobile] — latest", width: 24, align: "center", section: "disease" },
  { header: "Controller inhaler taken [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  // Schema-supported fields
  { header: "PEFR personal best [schema, when recorded] — first (L/min)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "PEFR personal best [schema, when recorded] — latest (L/min)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "PEFR personal best [schema, when recorded] — change (L/min)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "PEFR personal best [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Asthma control Q1–Q4 responses [schema, when recorded] — latest", width: 32, align: "left", wrapText: true, section: "disease" },
  { header: "Asthma control Q1–Q4 responses [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 44, align: "left", wrapText: true, section: "disease" },

  { header: "Asthma control yes-count [schema, when recorded] — first", width: 25, align: "right", section: "disease", isNumeric: true },
  { header: "Asthma control yes-count [schema, when recorded] — latest", width: 25, align: "right", section: "disease", isNumeric: true },
  { header: "Asthma control yes-count [schema, when recorded] — change", width: 25, align: "right", section: "disease", isNumeric: true },
  { header: "Asthma control yes-count [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Asthma control status [schema, when recorded] — latest", width: 26, align: "center", section: "disease" },
  { header: "Asthma control status [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },
];

// ── COPD Disease Columns ────────────────────────────────────────────────────
export const COPD_EXPORT_COLUMNS: ColumnDefinition[] = [
  ...COMMON_EXPORT_COLUMNS,
  // Direct mobile questions
  { header: "Energy level [mobile] — first (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Energy level [mobile] — latest (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Energy level [mobile] — change (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Energy level [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Chest heaviness [mobile] — first (0–10)", width: 21, align: "right", section: "disease", isNumeric: true },
  { header: "Chest heaviness [mobile] — latest (0–10)", width: 21, align: "right", section: "disease", isNumeric: true },
  { header: "Chest heaviness [mobile] — change (0–10)", width: 21, align: "right", section: "disease", isNumeric: true },
  { header: "Chest heaviness [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Sputum colour [mobile] — latest", width: 20, align: "center", section: "disease" },
  { header: "Sputum colour [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Sputum volume [mobile] — latest", width: 20, align: "center", section: "disease" },
  { header: "Sputum volume [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Sleep disturbed [mobile] — latest", width: 20, align: "center", section: "disease" },
  { header: "Sleep disturbed [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Decreased exercise tolerance [mobile] — latest", width: 26, align: "center", section: "disease" },
  { header: "Decreased exercise tolerance [mobile] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Wheezing [mobile] — latest", width: 18, align: "center", section: "disease" },
  { header: "Wheezing [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  // Schema-supported fields
  { header: "Step count [schema, when recorded] — first (steps)", width: 24, align: "right", section: "disease", isNumeric: true },
  { header: "Step count [schema, when recorded] — latest (steps)", width: 24, align: "right", section: "disease", isNumeric: true },
  { header: "Step count [schema, when recorded] — change (steps)", width: 24, align: "right", section: "disease", isNumeric: true },
  { header: "Step count [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Exercise tolerance good [schema, when recorded] — latest", width: 26, align: "center", section: "disease" },
  { header: "Exercise tolerance good [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Cough frequency [schema, when recorded] — first (0–4)", width: 24, align: "right", section: "disease", isNumeric: true },
  { header: "Cough frequency [schema, when recorded] — latest (0–4)", width: 24, align: "right", section: "disease", isNumeric: true },
  { header: "Cough frequency [schema, when recorded] — change (0–4)", width: 24, align: "right", section: "disease", isNumeric: true },
  { header: "Cough frequency [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Haemoptysis volume [schema, when recorded] — latest", width: 24, align: "center", section: "disease" },
  { header: "Haemoptysis volume [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },
];

// ── ILD Disease Columns ─────────────────────────────────────────────────────
export const ILD_EXPORT_COLUMNS: ColumnDefinition[] = [
  ...COMMON_EXPORT_COLUMNS,
  // Direct mobile questions
  { header: "K-BILD score [mobile] — first (0–100)", width: 22, align: "right", section: "disease", isNumeric: true },
  { header: "K-BILD score [mobile] — latest (0–100)", width: 22, align: "right", section: "disease", isNumeric: true },
  { header: "K-BILD score [mobile] — change (0–100)", width: 22, align: "right", section: "disease", isNumeric: true },
  { header: "K-BILD score [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Antifibrotic medication taken [mobile] — latest", width: 26, align: "center", section: "disease" },
  { header: "Antifibrotic medication taken [mobile] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Rash [mobile] — latest", width: 16, align: "center", section: "disease" },
  { header: "Rash [mobile] — dated history (YYYY-MM-DD=value)", width: 34, align: "left", wrapText: true, section: "disease" },

  { header: "Diarrhoea [mobile] — latest", width: 18, align: "center", section: "disease" },
  { header: "Diarrhoea [mobile] — dated history (YYYY-MM-DD=value)", width: 34, align: "left", wrapText: true, section: "disease" },

  // Schema-supported fields
  { header: "K-BILD Q1–Q15 responses [schema, when recorded] — latest", width: 32, align: "left", wrapText: true, section: "disease" },
  { header: "K-BILD Q1–Q15 responses [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 44, align: "left", wrapText: true, section: "disease" },

  { header: "K-BILD answered count [schema, when recorded] — first", width: 25, align: "right", section: "disease", isNumeric: true },
  { header: "K-BILD answered count [schema, when recorded] — latest", width: 25, align: "right", section: "disease", isNumeric: true },
  { header: "K-BILD answered count [schema, when recorded] — change", width: 25, align: "right", section: "disease", isNumeric: true },
  { header: "K-BILD answered count [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "K-BILD previous score [schema, when recorded] — first (0–100)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "K-BILD previous score [schema, when recorded] — latest (0–100)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "K-BILD previous score [schema, when recorded] — change (0–100)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "K-BILD previous score [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },
];

// ── Bronchiectasis Disease Columns ──────────────────────────────────────────
export const BRONCHIECTASIS_EXPORT_COLUMNS: ColumnDefinition[] = [
  ...COMMON_EXPORT_COLUMNS,
  // Direct mobile questions
  { header: "Ease of sputum clearance [mobile] — first (1–5)", width: 24, align: "right", section: "disease", isNumeric: true },
  { header: "Ease of sputum clearance [mobile] — latest (1–5)", width: 24, align: "right", section: "disease", isNumeric: true },
  { header: "Ease of sputum clearance [mobile] — change (1–5)", width: 24, align: "right", section: "disease", isNumeric: true },
  { header: "Ease of sputum clearance [mobile] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Sputum colour [mobile] — latest", width: 20, align: "center", section: "disease" },
  { header: "Sputum colour [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Sputum volume [mobile] — latest", width: 20, align: "center", section: "disease" },
  { header: "Sputum volume [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Feverish above 102°F [mobile] — latest", width: 22, align: "center", section: "disease" },
  { header: "Feverish above 102°F [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Malaise / fatigue [mobile] — latest", width: 20, align: "center", section: "disease" },
  { header: "Malaise / fatigue [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Pedal edema [mobile] — latest", width: 18, align: "center", section: "disease" },
  { header: "Pedal edema [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Wheezing [mobile] — latest", width: 18, align: "center", section: "disease" },
  { header: "Wheezing [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  // Schema-supported fields
  { header: "Recorded temperature [schema, when recorded] — first (°F)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "Recorded temperature [schema, when recorded] — latest (°F)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "Recorded temperature [schema, when recorded] — change (°F)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "Recorded temperature [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Haemoptysis volume [schema, when recorded] — latest", width: 24, align: "center", section: "disease" },
  { header: "Haemoptysis volume [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },
];

// ── Post ICU Disease Columns ────────────────────────────────────────────────
export const POST_ICU_EXPORT_COLUMNS: ColumnDefinition[] = [
  ...COMMON_EXPORT_COLUMNS,
  // Direct mobile questions
  { header: "Energy level [mobile] — first (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Energy level [mobile] — latest (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Energy level [mobile] — change (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Energy level [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Sleep quality [mobile] — first (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Sleep quality [mobile] — latest (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Sleep quality [mobile] — change (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Sleep quality [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Anxiety level [mobile] — first (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Anxiety level [mobile] — latest (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Anxiety level [mobile] — change (0–10)", width: 20, align: "right", section: "disease", isNumeric: true },
  { header: "Anxiety level [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Feverish above 102°F [mobile] — latest", width: 22, align: "center", section: "disease" },
  { header: "Feverish above 102°F [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Confusion [mobile] — latest", width: 18, align: "center", section: "disease" },
  { header: "Confusion [mobile] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  // Schema-supported fields
  { header: "Sputum colour [schema, when recorded] — latest", width: 22, align: "center", section: "disease" },
  { header: "Sputum colour [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Sputum volume [schema, when recorded] — latest", width: 22, align: "center", section: "disease" },
  { header: "Sputum volume [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Ease of sputum clearance [schema, when recorded] — first (1–5)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "Ease of sputum clearance [schema, when recorded] — latest (1–5)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "Ease of sputum clearance [schema, when recorded] — change (1–5)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "Ease of sputum clearance [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Recorded temperature [schema, when recorded] — first (°F)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "Recorded temperature [schema, when recorded] — latest (°F)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "Recorded temperature [schema, when recorded] — change (°F)", width: 26, align: "right", section: "disease", isNumeric: true },
  { header: "Recorded temperature [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },

  { header: "Malaise [schema, when recorded] — latest", width: 20, align: "center", section: "disease" },
  { header: "Malaise [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 36, align: "left", wrapText: true, section: "disease" },

  { header: "Haemoptysis volume [schema, when recorded] — latest", width: 24, align: "center", section: "disease" },
  { header: "Haemoptysis volume [schema, when recorded] — dated history (YYYY-MM-DD=value)", width: 38, align: "left", wrapText: true, section: "disease" },
];

export const REQUIRED_SHEET_NAMES = [
  "Read Me",
  "All Patients",
  "Asthma",
  "COPD",
  "ILD",
  "Bronchiectasis",
  "Post ICU",
  "Disease Field Codebook",
] as const;

export function validateWorkbookStructure(sheets: { name: string; columns: string[] }[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Check exact 8 sheet names
  const actualNames = sheets.map((s) => s.name);
  for (const req of REQUIRED_SHEET_NAMES) {
    if (!actualNames.includes(req)) {
      errors.push(`Missing required sheet: "${req}"`);
    }
  }

  // 2. Check column count and names for each sheet
  const expectedColumnMap: Record<string, ColumnDefinition[]> = {
    "All Patients": COMMON_EXPORT_COLUMNS,
    Asthma: ASTHMA_EXPORT_COLUMNS,
    COPD: COPD_EXPORT_COLUMNS,
    ILD: ILD_EXPORT_COLUMNS,
    Bronchiectasis: BRONCHIECTASIS_EXPORT_COLUMNS,
    "Post ICU": POST_ICU_EXPORT_COLUMNS,
  };

  for (const [sheetName, expectedCols] of Object.entries(expectedColumnMap)) {
    const foundSheet = sheets.find((s) => s.name === sheetName);
    if (!foundSheet) continue;

    if (foundSheet.columns.length !== expectedCols.length) {
      errors.push(
        `Sheet "${sheetName}" column count mismatch: expected ${expectedCols.length}, found ${foundSheet.columns.length}`,
      );
    }

    expectedCols.forEach((exp, idx) => {
      const actual = foundSheet.columns[idx];
      if (actual !== exp.header) {
        errors.push(
          `Sheet "${sheetName}" column [${idx + 1}] mismatch: expected "${exp.header}", found "${actual ?? "MISSING"}"`,
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
