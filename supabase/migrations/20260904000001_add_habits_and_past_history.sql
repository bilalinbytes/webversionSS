-- =============================================================================
-- Migration: 20260904000001_add_habits_and_past_history.sql
-- Description: Add smoking, smoking index, alcohol, and past medical history
-- columns to the patients table.
-- =============================================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS smoking_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS smoking_index TEXT NULL,
  ADD COLUMN IF NOT EXISTS alcohol_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS past_history TEXT NULL,
  ADD COLUMN IF NOT EXISTS past_history_years_ago TEXT NULL;

COMMENT ON COLUMN public.patients.smoking_status IS 'Smoking habit status: Yes or No';
COMMENT ON COLUMN public.patients.smoking_index IS 'Smoking index / pack-years calculation when smoking_status is Yes';
COMMENT ON COLUMN public.patients.alcohol_status IS 'Alcohol consumption status: Yes or No';
COMMENT ON COLUMN public.patients.past_history IS 'Past medical illness, condition, or surgical history details';
COMMENT ON COLUMN public.patients.past_history_years_ago IS 'How many years ago the past medical history occurred';
