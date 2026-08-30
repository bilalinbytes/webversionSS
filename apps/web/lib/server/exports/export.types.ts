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

export interface FormattedDailyLogColumnSet {
  logDate: string;
  aqi: number | string;
  spo2Rest: number | string;
  spo2Exertion: number | string;
  heartRate: number | string;
  medicationAdherence: string;
  mmrc: number | string;
  symptomsVas: string;
  sideEffects: string;
  kbild: string;
  asthmaControl: string;
  sputumHemoptysis: string;
  diseaseSpecific: string;
}

export interface PatientExportRecord {
  sno: number;
  fileNo: string;
  uhid: string;
  name: string;
  age: number | string;
  sex: "M" | "F" | "Other" | string;
  occupation: string;
  otherOccupation?: string;
  significantExposure?: string;
  mobile: string;
  alternateMobile?: string;
  dateOfEnroll: string;

  // Diagnosis & Clinical Details
  diseaseCategory?: string;
  primaryDiagnosis: string;
  diseaseSubtype?: string;
  histopathology: string;
  completeDiag: string;
  effectiveDashboard: "ild" | "asthma" | "copd" | "bronchiectasis" | "post_icu" | "general" | string;
  typeOfConnective: string;
  comorbidities: string;
  smoker: string;
  symptomatic: string;

  // Baseline Physiology
  baselineSpo2: string;
  baselineHr: string;
  sixMwd: string;
  observedFev: string;
  observedFvc: string;
  pctPredictedFev1: string;
  pctPredictedFvc: string;
  fev1Fvc: string;
  dlco: string;
  respiratorySupport: string;

  // Updated & Longitudinal PFT Values
  latestFev1?: string;
  latestFvc?: string;
  latestFev1Fvc?: string;
  latestDlco?: string;
  longitudinalPftHistory?: string;

  // App Engagement & Telemetry Surveillance
  totalDaysInPeriod?: number;
  daysLogged?: number;
  adherencePct: string;
  avgSpo2Rest?: string;
  worstSpo2: number | string;
  avgSpo2Exertion?: string;
  worstSpo2Exertion?: string;
  avgHeartRate?: string;
  worstHeartRate?: string;
  avgAqi?: string;
  worstAqi?: string;
  latestMmrc?: string;
  worstMmrc: number | string;
  worstRiskScore: number | string;
  riskLevel: "Stable" | "Moderate" | "High" | "Critical";
  alertStatus: string;
  totalLogs: number;

  // Consolidated Symptoms Surveillance & Daily Logs History
  allSymptomsSummary?: string;
  longitudinalLogsHistory?: string;

  // Medications History & Adherence
  currentMeds: string;
  newlyAddedMeds?: string;
  discontinuedMedsHistory?: string;
  medicationComplianceSummary?: string;

  // Quality of Life (HRQoL) & Disease-Specific Details
  latestKbildScore?: string;
  kbildSubscoresInterpretation?: string;
  asthmaControlStatus?: string;
  asthmaPefrRescuePuffs?: string;
  copdMetricsSummary?: string;
  bronchPostIcuMetricsSummary?: string;

  dailyLogs?: FormattedDailyLogColumnSet[];
}

export interface SymptomTrendPoint {
  date: string;
  val: number;
}

export interface DynamicSymptomSeries {
  symptomName: string;
  points: SymptomTrendPoint[];
  currentSeverity: number;
  isResolved: boolean;
}

export interface MedicationPrescribedAdherence {
  drugName: string;
  route: string;
  dose: string;
  frequency: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Discontinued" | "Modified";
  daysTaken: number;
  daysPrescribed: number;
  adherencePct: string;
}

export interface MultiPftProgressionPoint {
  testDate: string;
  fev1?: number | null;
  fvc?: number | null;
  fev1Pct?: number | null;
  fvcPct?: number | null;
  fev1FvcRatio?: number | null;
  dlco?: number | null;
  sixMwd?: number | null;
  baselineSpo2?: number | null;
  baselineHr?: number | null;
}

export interface DetailedLogRecord {
  patientName?: string;
  uhid?: string;
  date: string;
  spo2Rest: number | string;
  spo2Walk: number | string;
  heartRate?: number | string;
  mmrc: number | string;
  aqi: number | string;
  vasSymptoms: string;
  vasMap?: Record<string, number>;
  medicationCompliance: string;
  medicationComplianceMap?: Record<string, boolean>;
  riskScore: number | string;
  clinicalNotes: string;
  diseaseSpecificData?: Record<string, unknown>;
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

// ── Track-Specific Specialized Data Structures ─────────────────────────────

export interface IldTrackRecord {
  sno: number;
  uhid: string;
  name: string;
  age: number | string;
  sex: string;
  ildSubtype: string;
  logDate: string;
  spo2Rest: number | string;
  spo2Exertion: number | string;
  heartRate: number | string;
  mmrc: number | string;
  aqi: number | string;
  medicationAdherence: string;
  // 15 Individual KBILD Question Responses
  kbildQ1_breathlessStairs: string;
  kbildQ2_chestTight: string;
  kbildQ3_worryComplaint: string;
  kbildQ4_avoidBreathless: string;
  kbildQ5_inControl: string;
  kbildQ6_feelingDown: string;
  kbildQ7_airHunger: string;
  kbildQ8_anxious: string;
  kbildQ9_wheeze: string;
  kbildQ10_gettingWorse: string;
  kbildQ11_interferedTasks: string;
  kbildQ12_expectWorse: string;
  kbildQ13_carryGroceries: string;
  kbildQ14_endOfLife: string;
  kbildQ15_financial: string;
  // Calculated Scores
  kbildTotalScore: number | string;
  kbildPsychologicalSubscore: number | string;
  kbildBreathlessSubscore: number | string;
  kbildChestSubscore: number | string;
  // Clinical Interpretation
  kbildInterpretation: string;
  clinicalRiskLevel: string;
  alertFlag: string;
}

export interface AsthmaTrackRecord {
  sno: number;
  uhid: string;
  name: string;
  age: number | string;
  sex: string;
  logDate: string;
  spo2Rest: number | string;
  heartRate: number | string;
  mmrc: number | string;
  aqi: number | string;
  medicationAdherence: string;
  // Individual Assessment Responses
  daytimeSymptoms: string;
  nightWaking: string;
  relieverUse: string;
  activityLimitation: string;
  rescuePuffsCount: number | string;
  pefrReading: number | string;
  pefrPctPersonalBest: string;
  inhalerAdherence: string;
  triggersReported: string;
  // Calculated Score
  asthmaControlScore: number | string;
  // Clinical Interpretation
  ginaClassification: string;
  clinicalRiskLevel: string;
  actionRecommendation: string;
}

export interface CopdTrackRecord {
  sno: number;
  uhid: string;
  name: string;
  age: number | string;
  sex: string;
  copdStage: string;
  logDate: string;
  spo2Rest: number | string;
  spo2Exertion: number | string;
  heartRate: number | string;
  mmrc: number | string;
  aqi: number | string;
  medicationAdherence: string;
  // Individual Assessment Responses
  sputumVolume: string;
  sputumColour: string;
  sputumPurulence: string;
  hemoptysisPresent: string;
  hemoptysisVolume: string;
  rescueInhalerPuffs: number | string;
  energyLevel: number | string;
  dyspneaExertion: number | string;
  feverRecorded: string;
  // Calculated Score
  cardinalSymptomsCount: number | string;
  // Clinical Interpretation
  copdExacerbationType: string;
  clinicalRiskLevel: string;
  actionRecommendation: string;
}

export interface BronchTrackRecord {
  sno: number;
  uhid: string;
  name: string;
  age: number | string;
  sex: string;
  etiology: string;
  logDate: string;
  spo2Rest: number | string;
  heartRate: number | string;
  mmrc: number | string;
  aqi: number | string;
  medicationAdherence: string;
  // Individual Assessment Responses
  airwayClearanceDone: string;
  clearanceTechnique: string;
  easeOfClearance: number | string;
  sputumVolume: string;
  sputumColour: string;
  hemoptysisPresent: string;
  hemoptysisSeverity: string;
  antibioticCourseActive: string;
  temperatureF: string;
  // Calculated Score
  flareSeverityIndex: number | string;
  // Clinical Interpretation
  flareRiskStatus: string;
  clinicalRiskLevel: string;
  actionRecommendation: string;
}

export interface PostIcuTrackRecord {
  sno: number;
  uhid: string;
  name: string;
  age: number | string;
  sex: string;
  icuDischargeDate: string;
  logDate: string;
  spo2Rest: number | string;
  spo2Exertion: number | string;
  heartRate: number | string;
  mmrc: number | string;
  aqi: number | string;
  medicationAdherence: string;
  // Individual Assessment Responses
  functionalMobilityLevel: string;
  walkDistanceMeters: number | string;
  icuMuscleWeakness: number | string;
  fatigueVas: number | string;
  dyspneaExertion: number | string;
  sleepQuality: number | string;
  nutritionIntake: string;
  mentalClarity: string;
  // Calculated Scores
  functionalRecoveryIndex: number | string;
  sarcopeniaFatigueScore: number | string;
  // Clinical Interpretation
  picsRecoveryTrajectory: string;
  clinicalRiskLevel: string;
  actionRecommendation: string;
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

  // Track-Specific Populated Collections
  ildTrackRecords?: IldTrackRecord[];
  asthmaTrackRecords?: AsthmaTrackRecord[];
  copdTrackRecords?: CopdTrackRecord[];
  bronchTrackRecords?: BronchTrackRecord[];
  postIcuTrackRecords?: PostIcuTrackRecord[];

  // Single Patient detailed data for multi-sheet workbook
  singlePatientLogs?: DetailedLogRecord[];
  singlePatientAlerts?: DetailedAlertRecord[];
  singlePatientMeds?: DetailedMedicationRecord[];
  singlePatientPfts?: DetailedPftRecord[];
  singlePatientUhid?: string;
  
  // Enhanced Surveillance & Clinical Parity Structures
  rawDoctorInstructions?: Array<{ instructionText: string; createdAt: string }>;
  prescribedMedsWithAdherence?: MedicationPrescribedAdherence[];
  dynamicSymptomsSeries?: DynamicSymptomSeries[];
  multiPftsProgression?: MultiPftProgressionPoint[];
  adherenceStats?: {
    totalDays: number;
    loggedDays: number;
    pct: string;
  };

  // Multi-patient detailed logs
  allPatientLogs?: DetailedLogRecord[];
}

export interface ExportResult {
  filename: string;
  mimeType: string;
  buffer: Buffer | Uint8Array | string;
}
