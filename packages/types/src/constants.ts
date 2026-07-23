/**
 * Application-level constants — disease lists, medication routes, sputum
 * descriptors, and any other string union arrays that are referenced across
 * multiple packages.
 *
 * These live here (in @o2plus/types) rather than in a separate @o2plus/constants
 * package because constants are typed data — they belong alongside the types
 * that describe them.
 *
 * IMPORTANT: These are the single source of truth for enum values used in:
 *   - @o2plus/validation Zod schemas
 *   - API route handlers (apps/web/app/api/)
 *   - Mobile form rendering (apps/mobile/)
 *   - @saans/scoring-engine type guards
 */

// ── Disease / Diagnosis ───────────────────────────────────────────────────────

export const diagnosisValues = [
  "asthma",
  "copd",
  "ild",
  "bronchiectasis",
  "post_icu",
] as const;

export const postIcuSubDiagnosisValues = [
  "asthma",
  "copd",
  "ild",
  "bronchiectasis",
  "post_infection",
] as const;

export const effectiveDashboardValues = [
  "asthma",
  "copd",
  "bronchiectasis",
  "ild",
  "post_icu",
] as const;

// ── Medications ───────────────────────────────────────────────────────────────

export const medicationRouteValues = [
  "inj",
  "tablet",
  "capsule",
  "nebulisation",
  "inhaler",
  "nasal_spray",
] as const;

// ── COPD sputum descriptors ───────────────────────────────────────────────────

export const sputumColourCopdValues = [
  "clear",
  "white",
  "yellow",
  "green",
  "dark_green",
  "brown",
  "blood_streaked",
] as const;

export const sputumVolumeCopdValues = [
  "none",
  "less_than_usual",
  "usual",
  "large_amount",
] as const;

// ── Bronchiectasis sputum descriptors ────────────────────────────────────────

export const sputumColourBronchValues = [
  "clear",
  "pale_yellow",
  "yellow",
  "light_green",
  "dark_green",
  "brown",
  "blood_streaked",
] as const;

export const sputumVolumeBronchValues = [
  "none",
  "less_than_usual",
  "usual",
  "more_than_usual",
  "much_more_than_usual",
] as const;

// ── Haemoptysis volume (shared by COPD + Bronchiectasis) ─────────────────────

export const haemoptysisVolumeValues = [
  "none",
  "streaks",
  "cup",
  "massive",
] as const;

export const haemoptysisVolumeBronchValues = [
  "none",
  "streaks",
  "glass",
  "massive",
] as const;

// ── Derived types from const arrays ──────────────────────────────────────────

export type DiagnosisValue = (typeof diagnosisValues)[number];
export type PostIcuSubDiagnosisValue = (typeof postIcuSubDiagnosisValues)[number];
export type EffectiveDashboardValue = (typeof effectiveDashboardValues)[number];
export type MedicationRouteValue = (typeof medicationRouteValues)[number];
