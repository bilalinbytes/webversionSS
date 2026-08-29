-- -----------------------------------------------------------------------------
-- Migration: 20260830000000_prevent_duplicate_daily_logs.sql
-- Description: Enforce unique daily log per patient per calendar day to eliminate
-- race condition duplicate submissions on retries or concurrent network requests.
-- -----------------------------------------------------------------------------

-- 1. Unique functional index ensuring 1 daily log per patient per calendar date
CREATE UNIQUE INDEX IF NOT EXISTS daily_logs_patient_calendar_date_idx
  ON public.daily_logs (patient_id, ((logged_at AT TIME ZONE 'UTC')::date));

-- 2. Performance compound indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS daily_logs_patient_logged_at_desc_idx
  ON public.daily_logs (patient_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS disease_alerts_patient_active_idx
  ON public.disease_alerts (patient_id, acknowledged_by_doctor, is_suppressed);

CREATE INDEX IF NOT EXISTS pft_records_patient_test_date_idx
  ON public.pft_records (patient_id, test_date DESC);
