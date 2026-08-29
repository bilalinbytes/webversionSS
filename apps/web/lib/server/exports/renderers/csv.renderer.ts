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
  { label: "S No.",               key: "sno" },
  { label: "File No.",            key: "fileNo" },
  { label: "UHID",                key: "uhid" },
  { label: "Mobile No.",          key: "mobile" },
  { label: "Name",                key: "name" },
  { label: "Age",                 key: "age" },
  { label: "Sex",                 key: "sex" },
  { label: "Occupation",          key: "occupation" },
  { label: "Smoker",              key: "smoker" },
  { label: "Symptomatic",         key: "symptomatic" },
  { label: "Date of Enroll",      key: "dateOfEnroll" },
  { label: "Histopathology",      key: "histopathology" },
  { label: "Complete diag",       key: "completeDiag" },
  { label: "Type of connective",  key: "typeOfConnective" },
  { label: "Co-morbidities",      key: "comorbidities" },
  { label: "6MWD",                key: "sixMwd" },
  { label: "FEV1/FVC",            key: "fev1Fvc" },
  { label: "observed FEV",        key: "observedFev" },
  { label: "% predicted FEV1",    key: "pctPredictedFev1" },
  { label: "Observed FVC",        key: "observedFvc" },
  { label: "% predicted FVC",     key: "pctPredictedFvc" },
  { label: "Dlco",                key: "dlco" },
  { label: "Baseline SpO2 (%)",   key: "baselineSpo2" },
  { label: "Baseline HR (bpm)",   key: "baselineHr" },
  { label: "Worst SpO2 (%)",      key: "worstSpo2" },
  { label: "Worst mMRC (0-4)",    key: "worstMmrc" },
  { label: "Worst Risk Score",    key: "worstRiskScore" },
  { label: "Risk Level",          key: "riskLevel" },
  { label: "Alert Status",        key: "alertStatus" },
  { label: "Total Logs",          key: "totalLogs" },
  { label: "Adherence %",         key: "adherencePct" },
  { label: "Current Meds",        key: "currentMeds" },
  { label: "Respiratory Support", key: "respiratorySupport" },
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
