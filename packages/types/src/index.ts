/**
 * @o2plus/types — Single source of truth for all TypeScript types,
 * interfaces, and application constants across web and mobile.
 *
 * Import from this package everywhere. Never import from
 * apps/web/lib/types.ts or apps/web/lib/database.types.ts directly.
 */

// Database — auto-generated Supabase schema
export type { Database, Json } from "./database.types";

// Domain row/insert types
export type {
  Doctor,
  Patient,
  PatientDiagnosis,
  RespSupport,
  PftRecord,
  Medication,
  PatientBaseline,
  DailyLog,
  RedFlagScore,
  DiseaseAlert,
  DoctorInstruction,
  AuditLog,
  ExportRecord,
  DoctorInsert,
  PatientInsert,
  MedicationInsert,
  DailyLogInsert,
  PatientDiagnosisInsert,
  RespSupportInsert,
} from "./domain";

// Patient DTO
export type { PatientData } from "./patient";

// Application constants (single source of truth)
export {
  diagnosisValues,
  postIcuSubDiagnosisValues,
  effectiveDashboardValues,
  medicationRouteValues,
  sputumColourCopdValues,
  sputumVolumeCopdValues,
  sputumColourBronchValues,
  sputumVolumeBronchValues,
  haemoptysisVolumeValues,
  haemoptysisVolumeBronchValues,
} from "./constants";
export type {
  DiagnosisValue,
  PostIcuSubDiagnosisValue,
  EffectiveDashboardValue,
  MedicationRouteValue,
} from "./constants";

// UI data contracts (shared between web and mobile)
export type { PatientProfile, PatientHomeData } from "./ui";

// Scoring engine types — re-exported for convenience so consumers only need
// @o2plus/types and not a separate @saans/scoring-engine import for types.
export type {
  RiskLevel,
  IndicatorColor,
  AlertType,
  EffectiveDashboard,
  PrimaryDiagnosis,
  SymptomKey,
  AsthmaControlClassification,
  AsthmaDiseaseSpecificData,
  CopdDiseaseSpecificData,
  BronchiectasisDiseaseSpecificData,
  IldDiseaseSpecificData,
  DiseaseSpecificData,
  DailyLogInput,
  PreviousLog,
  PatientBaseline as ScoringPatientBaseline,
  ScoreBreakdownItem,
  RedFlagScoreResult,
  AlertEngineResult,
} from "@saans/scoring-engine";
