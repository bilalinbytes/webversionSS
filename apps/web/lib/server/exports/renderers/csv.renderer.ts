import type { ExportDataBundle, PatientExportRecord } from "../export.types";

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function renderCsvRegistry(bundle: ExportDataBundle): string {
  const headers: Array<{ label: string; key: keyof PatientExportRecord }> = [
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

  const headerLine = headers.map((h) => escapeCsvCell(h.label)).join(",");
  const dataLines = bundle.records.map((record) =>
    headers.map((h) => escapeCsvCell(record[h.key])).join(","),
  );

  const bom = "\uFEFF";
  return bom + [headerLine, ...dataLines].join("\r\n");
}
