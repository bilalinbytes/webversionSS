/**
 * Domain row and insert types — thin aliases over the auto-generated
 * Database type so the rest of the codebase never imports database.types.ts
 * directly. When the schema changes and database.types.ts is regenerated,
 * only this file needs updating.
 */
import type { Database } from "./database.types";

// ── Row types (use when reading from Supabase) ────────────────────────────────
export type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type PatientDiagnosis =
  Database["public"]["Tables"]["patient_diagnoses"]["Row"];
export type RespSupport =
  Database["public"]["Tables"]["respiratory_support"]["Row"];
export type PftRecord = Database["public"]["Tables"]["pft_records"]["Row"];
export type Medication = Database["public"]["Tables"]["medications"]["Row"];
export type PatientBaseline =
  Database["public"]["Tables"]["patient_baselines"]["Row"];
export type DailyLog = Database["public"]["Tables"]["daily_logs"]["Row"];
export type RedFlagScore =
  Database["public"]["Tables"]["red_flag_scores"]["Row"];
export type DiseaseAlert =
  Database["public"]["Tables"]["disease_alerts"]["Row"];
export type DoctorInstruction =
  Database["public"]["Tables"]["doctor_instructions"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type ExportRecord =
  Database["public"]["Tables"]["export_records"]["Row"];

// ── Insert types (use when writing to Supabase) ───────────────────────────────
export type DoctorInsert = Database["public"]["Tables"]["doctors"]["Insert"];
export type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
export type MedicationInsert =
  Database["public"]["Tables"]["medications"]["Insert"];
export type DailyLogInsert =
  Database["public"]["Tables"]["daily_logs"]["Insert"];
export type PatientDiagnosisInsert =
  Database["public"]["Tables"]["patient_diagnoses"]["Insert"];
export type RespSupportInsert =
  Database["public"]["Tables"]["respiratory_support"]["Insert"];
