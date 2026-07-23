import { z } from "zod";
import {
  sputumColourCopdValues,
  sputumVolumeCopdValues,
  sputumColourBronchValues,
  sputumVolumeBronchValues,
  effectiveDashboardValues,
} from "@o2plus/types";

// Re-export constants for backward compatibility with apps/web
export {
  sputumColourCopdValues,
  sputumVolumeCopdValues,
  sputumColourBronchValues,
  sputumVolumeBronchValues,
  effectiveDashboardValues,
};

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const asthmaDiseaseFields = {
  rescue_inhaler_puffs: z.number().int().min(0).nullable().optional(),
  night_waking: z.boolean().nullable().optional(),
  pefr_lpm: z.number().positive().nullable().optional(),
  pefr_reading: z.number().positive().nullable().optional(),
  pefr_personal_best: z.number().positive().nullable().optional(),
  controller_taken: z.boolean().nullable().optional(),
  asthma_control_responses: z.array(z.boolean()).length(4).nullable().optional(),
  asthma_control_yes_count: z.number().int().min(0).max(4).nullable().optional(),
  asthma_control_status: z.enum(["well_controlled", "partly_controlled", "poorly_controlled"]).nullable().optional(),
};

const copdDiseaseFields = {
  sputum_colour: z.enum(sputumColourCopdValues).nullable().optional(),
  sputum_volume: z.enum(sputumVolumeCopdValues).nullable().optional(),
  energy_level: z.number().int().min(0).max(10).nullable().optional(),
  sleep_disturbed: z.boolean().nullable().optional(),
  wheezing: z.boolean().nullable().optional(),
  step_count_today: z.number().int().min(0).nullable().optional(),
  // Alert engine inputs — required for full COPD alert logic
  exercise_tolerance_good: z.boolean().nullable().optional(),
  exercise_tolerance: z.boolean().nullable().optional(),
  cough_frequency: z.number().int().min(0).max(4).nullable().optional(),
  chest_heaviness: z.number().int().min(0).max(10).nullable().optional(),
  haemoptysis_volume: z.enum(["none", "streaks", "cup", "massive"]).nullable().optional(),
};

const bronchiectasisDiseaseFields = {
  sputum_colour: z.enum(sputumColourBronchValues).nullable().optional(),
  sputum_volume: z.enum(sputumVolumeBronchValues).nullable().optional(),
  ease_of_clearance: z.number().int().min(1).max(5).nullable().optional(),
  ease_of_sputum_clearance: z.number().int().min(1).max(5).nullable().optional(),
  feverish_or_temp_gt_102: z.boolean().nullable().optional(),
  recorded_temperature_f: z.number().nullable().optional(),
  malaise: z.boolean().nullable().optional(),
  pedal_edema: z.boolean().nullable().optional(),
  wheezing: z.boolean().nullable().optional(),
  haemoptysis_volume: z.enum(["none", "streaks", "glass", "massive"]).nullable().optional(),
};

const ildDiseaseFields = {
  kbild_responses: z.record(z.string(), z.number().int().min(1).max(7)).nullable().optional(),
  kbild_score: z.number().min(0).max(100).nullable().optional(),
  kbild_answered_count: z.number().int().min(0).max(15).nullable().optional(),
  kbild_previous: z.number().min(0).max(100).nullable().optional(),
  antifibrotic_taken: z.boolean().nullable().optional(),
  rash: z.boolean().nullable().optional(),
  diarrhoea: z.boolean().nullable().optional(),
};

const posticuDiseaseFields = {
  energy_level: z.number().int().min(0).max(10).nullable().optional(),
  sleep_quality: z.number().int().min(0).max(10).nullable().optional(),
  anxiety: z.number().int().min(0).max(10).nullable().optional(),
  confusion: z.boolean().nullable().optional(),
  sputum_colour: z.enum(sputumColourBronchValues).nullable().optional(),
  sputum_volume: z.enum(sputumVolumeBronchValues).nullable().optional(),
  ease_of_clearance: z.number().int().min(1).max(5).nullable().optional(),
  ease_of_sputum_clearance: z.number().int().min(1).max(5).nullable().optional(),
  feverish_or_temp_gt_102: z.boolean().nullable().optional(),
  recorded_temperature_f: z.number().nullable().optional(),
  malaise: z.boolean().nullable().optional(),
  haemoptysis_volume: z.enum(["none", "streaks", "glass", "massive"]).nullable().optional(),
};

const baseLogFields = {
  patient_id: z.string().uuid(),
  log_date: dateStringSchema,
  spo2_rest: z.number().min(0).max(100).nullable().optional(),
  spo2_exertion: z.number().min(0).max(100).nullable().optional(),
  mmrc_today: z.number().int().min(0).max(4).nullable().optional(),
  aqi_value: z.number().int().min(0).nullable().optional(),
  medication_compliance: z.record(z.string(), z.boolean()).nullable().optional(),
  vas_symptoms: z.record(z.string(), z.number().min(0).max(10)).nullable().optional(),
  temperature_f: z.number().nullable().optional(),
  haemoptysis: z.boolean().nullable().optional(),
  heart_rate: z.number().int().min(20).max(250).nullable().optional(),
  respiratory_rate: z.number().int().nullable().optional(),
  pedal_edema: z.boolean().nullable().optional(),
  oxygen_requirement_litres: z.number().nullable().optional(),
  respiratory_support_status: z.enum(["static", "worsening", "improvement"]).nullable().optional(),
  respiratory_support_type: z.string().nullable().optional(),
  step_count_today: z.number().int().min(0).nullable().optional(),
  side_effects: z.array(z.string()).nullable().optional(),
};

export const asthmaLogSchema = z
  .object({
    ...baseLogFields,
    effective_dashboard: z.literal("asthma"),
    ...asthmaDiseaseFields,
  })
  .strict();

export const copdLogSchema = z
  .object({
    ...baseLogFields,
    effective_dashboard: z.literal("copd"),
    ...copdDiseaseFields,
  })
  .strict();

export const bronchiectasisLogSchema = z
  .object({
    ...baseLogFields,
    effective_dashboard: z.literal("bronchiectasis"),
    ...bronchiectasisDiseaseFields,
  })
  .strict();

export const ildLogSchema = z
  .object({
    ...baseLogFields,
    effective_dashboard: z.literal("ild"),
    ...ildDiseaseFields,
  })
  .strict();

export const posticuLogSchema = z
  .object({
    ...baseLogFields,
    effective_dashboard: z.literal("post_icu"),
    ...posticuDiseaseFields,
  })
  .strict();

export const dailyLogSchema = z.discriminatedUnion("effective_dashboard", [
  asthmaLogSchema,
  copdLogSchema,
  bronchiectasisLogSchema,
  ildLogSchema,
  posticuLogSchema,
]);

export type DailyLogPayload = z.infer<typeof dailyLogSchema>;
export type AsthmaDiseaseData = z.infer<typeof asthmaLogSchema>;
export type CopdDiseaseData = z.infer<typeof copdLogSchema>;
export type BronchiectasisDiseaseData = z.infer<typeof bronchiectasisLogSchema>;
export type IldDiseaseData = z.infer<typeof ildLogSchema>;
