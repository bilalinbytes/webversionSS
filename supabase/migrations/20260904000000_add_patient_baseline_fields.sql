-- =============================================================================
-- Migration: 20260904000000_add_patient_baseline_fields.sql
-- Description: Add native occupation and significant_exposure baseline columns
-- to the patients table for complete research export and clinical history.
-- =============================================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS occupation TEXT NULL,
  ADD COLUMN IF NOT EXISTS significant_exposure TEXT NULL;

COMMENT ON COLUMN public.patients.occupation IS 'Patient occupation or occupational history';
COMMENT ON COLUMN public.patients.significant_exposure IS 'Significant environmental or occupational exposures relevant to respiratory disease';
