export type ExportScope =
  | "all_patients"
  | "selected_patients"
  | "single_patient"
  | "disease_specific"
  | "date_wise"
  | "daily"
  | "weekly"
  | "bi_weekly"
  | "monthly"
  | "combined";

export type ExportFileFormat = "excel" | "csv" | "pdf";

export interface ExportRequestPayload {
  export_type: ExportScope | string;
  format?: ExportFileFormat;
  patient_ids?: string[];
  patient_id?: string;
  disease_filter?: string;
  start_date?: string;
  end_date?: string;
}

export interface PatientExportRecord {
  sno: number;
  fileNo: string;
  uhid: string;
  mobile: string;
  name: string;
  age: number | string;
  sex: "M" | "F" | "Other" | string;
  occupation: string;
  smoker: string;
  symptomatic: string;
  dateOfEnroll: string;
  histopathology: string;
  completeDiag: string;
  typeOfConnective: string;
  comorbidities: string;
  sixMwd: string;
  fev1Fvc: string;
  observedFev: string;
  pctPredictedFev1: string;
  observedFvc: string;
  pctPredictedFvc: string;
  dlco: string;
  baselineSpo2: string;
  baselineHr: string;
  worstSpo2: number | string;
  worstMmrc: number | string;
  worstRiskScore: number | string;
  riskLevel: "Stable" | "Moderate" | "High" | "Critical";
  alertStatus: string;
  totalLogs: number;
  adherencePct: string;
  currentMeds: string;
  respiratorySupport: string;
}

export interface DetailedLogRecord {
  date: string;
  spo2Rest: number | string;
  spo2Walk: number | string;
  mmrc: number | string;
  aqi: number | string;
  vasSymptoms: string;
  medicationCompliance: string;
  riskScore: number | string;
  clinicalNotes: string;
}

export interface DetailedAlertRecord {
  date: string;
  alertType: string;
  severity: string;
  status: string;
  reason: string;
}

export interface DetailedMedicationRecord {
  drugName: string;
  route: string;
  dose: string;
  frequency: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Discontinued";
}

export interface DetailedPftRecord {
  testDate: string;
  fev1FvcRatio: string;
  observedFev: string;
  pctPredictedFev1: string;
  observedFvc: string;
  pctPredictedFvc: string;
  dlco: string;
  sixMwd: string;
  baselineSpo2: string;
  baselineHr: string;
}

export interface ExportDataBundle {
  records: PatientExportRecord[];
  scope: ExportScope | string;
  format: ExportFileFormat;
  doctorName: string;
  doctorHospital?: string;
  diseaseFilter?: string;
  startDate?: string;
  endDate?: string;
  // Single Patient detailed data for multi-sheet workbook
  singlePatientLogs?: DetailedLogRecord[];
  singlePatientAlerts?: DetailedAlertRecord[];
  singlePatientMeds?: DetailedMedicationRecord[];
  singlePatientPfts?: DetailedPftRecord[];
  singlePatientUhid?: string;
}

export interface ExportResult {
  filename: string;
  mimeType: string;
  buffer: Buffer | Uint8Array | string;
}
