import type { ExportDataBundle, FormattedDailyLogColumnSet, PatientExportRecord } from "../export.types";

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const FIXED_CSV_COLUMNS: Array<{ label: string; key: keyof PatientExportRecord }> = [
  { label: "S No.",                         key: "sno" },
  { label: "File No.",                      key: "fileNo" },
  { label: "UHID",                          key: "uhid" },
  { label: "Patient Name",                  key: "name" },
  { label: "Age",                           key: "age" },
  { label: "Sex",                           key: "sex" },
  { label: "Occupation",                    key: "occupation" },
  { label: "Other Occupation",              key: "otherOccupation" },
  { label: "Significant Exposure",          key: "significantExposure" },
  { label: "Mobile No.",                    key: "mobile" },
  { label: "Alternate Mobile",              key: "alternateMobile" },
  { label: "Date of Enrollment",            key: "dateOfEnroll" },
  { label: "Primary Diagnosis",             key: "primaryDiagnosis" },
  { label: "Disease Subtype",               key: "diseaseSubtype" },
  { label: "Co-morbidities",                key: "comorbidities" },

  // Baseline Physiological Data
  { label: "Baseline SpO2 (%)",             key: "baselineSpo2" },
  { label: "Baseline HR (BPM)",             key: "baselineHr" },
  { label: "Baseline 6MWD (m)",             key: "sixMwd" },
  { label: "Baseline FEV1 (L)",             key: "observedFev" },
  { label: "Baseline FVC (L)",              key: "observedFvc" },
  { label: "Baseline FEV1/FVC (%)",         key: "fev1Fvc" },
  { label: "Baseline FEV1 % Pred",          key: "pctPredictedFev1" },
  { label: "Baseline FVC % Pred",           key: "pctPredictedFvc" },
  { label: "Baseline DLCO (%)",             key: "dlco" },
  { label: "Respiratory Support",           key: "respiratorySupport" },

  // Updated & Longitudinal PFT Progression
  { label: "Latest FEV1 (L)",               key: "latestFev1" },
  { label: "Latest FVC (L)",                key: "latestFvc" },
  { label: "Latest FEV1/FVC (%)",           key: "latestFev1Fvc" },
  { label: "Latest DLCO (%)",               key: "latestDlco" },
  { label: "Longitudinal PFT Progression",  key: "longitudinalPftHistory" },

  // App Engagement & Telemetry Surveillance
  { label: "Days in Period",                key: "totalDaysInPeriod" },
  { label: "Days Logged in App",            key: "daysLogged" },
  { label: "Logging %",                     key: "adherencePct" },
  { label: "Avg Resting SpO2 (%)",          key: "avgSpo2Rest" },
  { label: "Worst Resting SpO2",            key: "worstSpo2" },
  { label: "Avg Exertion SpO2",             key: "avgSpo2Exertion" },
  { label: "Worst Exertion SpO2",           key: "worstSpo2Exertion" },
  { label: "Avg Heart Rate",                key: "avgHeartRate" },
  { label: "Worst Heart Rate",              key: "worstHeartRate" },
  { label: "Avg AQI",                       key: "avgAqi" },
  { label: "Worst AQI",                     key: "worstAqi" },
  { label: "Latest mMRC",                   key: "latestMmrc" },
  { label: "Worst mMRC",                    key: "worstMmrc" },
  { label: "Risk Status",                   key: "riskLevel" },
  { label: "Active Alert",                  key: "alertStatus" },

  // Symptoms Surveillance & Consolidated Logs History
  { label: "Reported Symptoms Summary",     key: "allSymptomsSummary" },
  { label: "Consolidated Daily Logs History", key: "longitudinalLogsHistory" },

  // Medications History & Compliance
  { label: "Active Prescribed Medications", key: "currentMeds" },
  { label: "Newly Added Medications",       key: "newlyAddedMeds" },
  { label: "Discontinued Medications History", key: "discontinuedMedsHistory" },
  { label: "Medication Compliance Rate",    key: "medicationComplianceSummary" },

  // Quality of Life (HRQoL) & Disease-Specific Details
  { label: "Latest KBILD Total Score",      key: "latestKbildScore" },
  { label: "KBILD Subscores & HRQoL Impact", key: "kbildSubscoresInterpretation" },
  { label: "Asthma GINA Control Status",    key: "asthmaControlStatus" },
  { label: "Asthma PEFR & Rescue Puffs",    key: "asthmaPefrRescuePuffs" },
  { label: "COPD Surveillance Metrics",     key: "copdMetricsSummary" },
  { label: "Bronch / Post-ICU Metrics",     key: "bronchPostIcuMetricsSummary" },
];

const DAILY_CSV_FIELD_TEMPLATES: Array<{ suffix: string; getter: (d: FormattedDailyLogColumnSet) => string | number }> = [
  { suffix: "Date",                   getter: (d) => d.logDate },
  { suffix: "AQI",                    getter: (d) => d.aqi },
  { suffix: "SpO2 Rest (%)",          getter: (d) => d.spo2Rest },
  { suffix: "SpO2 Exertion (%)",      getter: (d) => d.spo2Exertion },
  { suffix: "Heart Rate (bpm)",       getter: (d) => d.heartRate },
  { suffix: "Medication Adherence",   getter: (d) => d.medicationAdherence },
  { suffix: "mMRC (0-4)",             getter: (d) => d.mmrc },
  { suffix: "Symptoms Severity",      getter: (d) => d.symptomsVas },
  { suffix: "Drug Side Effects",      getter: (d) => d.sideEffects },
  { suffix: "K-BILD Score",           getter: (d) => d.kbild },
  { suffix: "Asthma Control Score",   getter: (d) => d.asthmaControl },
  { suffix: "Sputum / Hemoptysis",    getter: (d) => d.sputumHemoptysis },
  { suffix: "Disease Specific Data",  getter: (d) => d.diseaseSpecific },
];

export function renderCsvRegistry(bundle: ExportDataBundle): string {
  const maxLogs = bundle.records.reduce((max, r) => Math.max(max, r.dailyLogs?.length ?? 0), 0);

  const headerLabels: string[] = FIXED_CSV_COLUMNS.map((col) => col.label);

  for (let dayIdx = 0; dayIdx < maxLogs; dayIdx++) {
    const logNumber = dayIdx + 1;
    DAILY_CSV_FIELD_TEMPLATES.forEach((tpl) => {
      headerLabels.push(`Log ${logNumber} - ${tpl.suffix}`);
    });
  }

  const headerLine = headerLabels.map(escapeCsvCell).join(",");

  const dataLines = bundle.records.map((record) => {
    const cells: string[] = [];

    // Fixed columns
    FIXED_CSV_COLUMNS.forEach((col) => {
      cells.push(escapeCsvCell(record[col.key]));
    });

    // Dynamic horizontal daily logs
    const patDailyLogs = record.dailyLogs ?? [];
    for (let dayIdx = 0; dayIdx < maxLogs; dayIdx++) {
      const logEntry = patDailyLogs[dayIdx];
      DAILY_CSV_FIELD_TEMPLATES.forEach((tpl) => {
        cells.push(escapeCsvCell(logEntry ? tpl.getter(logEntry) : "—"));
      });
    }

    return cells.join(",");
  });

  const bom = "\uFEFF";
  return bom + [headerLine, ...dataLines].join("\r\n");
}
