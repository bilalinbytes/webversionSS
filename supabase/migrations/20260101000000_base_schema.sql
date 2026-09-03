-- =============================================================================
-- Migration: 20260101000000_base_schema.sql
-- Description: Complete base schema for O2Plus Digital Health Platform.
-- Covers all core clinical, doctor, patient, daily log, and surveillance tables.
-- Safe, idempotent creation using CREATE TABLE IF NOT EXISTS.
-- =============================================================================

-- 1. Doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  hospital TEXT NOT NULL,
  specialisation TEXT NOT NULL,
  expo_push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  mobile_number TEXT NOT NULL,
  alternate_mobile_number TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  expo_push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Patient diagnoses table
CREATE TABLE IF NOT EXISTS public.patient_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  primary_diagnosis TEXT NOT NULL,
  effective_dashboard TEXT NOT NULL,
  post_icu_sub_diagnosis TEXT,
  comorbidities JSONB DEFAULT '[]'::jsonb,
  comorbidities_other_text TEXT,
  diagnosed_at DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Daily logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  offline_queued_at TIMESTAMPTZ,
  is_duplicate_suppressed BOOLEAN DEFAULT false,
  is_outlier_suppressed BOOLEAN DEFAULT false,
  spo2_rest NUMERIC,
  spo2_exertion NUMERIC,
  mmrc_today INTEGER,
  aqi_value INTEGER,
  pm25 NUMERIC,
  pm10 NUMERIC,
  aqi_is_cached BOOLEAN DEFAULT false,
  vas_symptoms JSONB DEFAULT '{}'::jsonb,
  pedal_edema BOOLEAN DEFAULT false,
  medication_compliance JSONB DEFAULT '{}'::jsonb,
  side_effects JSONB DEFAULT '[]'::jsonb,
  oxygen_condition_static BOOLEAN,
  oxygen_change_direction TEXT,
  oxygen_change_litres NUMERIC,
  step_count_today INTEGER,
  dqi_score NUMERIC,
  fi_score NUMERIC,
  disease_specific_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Red flag scores table
CREATE TABLE IF NOT EXISTS public.red_flag_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  log_id UUID REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  global_score NUMERIC NOT NULL,
  risk_level TEXT,
  indicator_color TEXT,
  score_breakdown JSONB DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Disease alerts table
CREATE TABLE IF NOT EXISTS public.disease_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  log_id UUID REFERENCES public.daily_logs(id) ON DELETE SET NULL,
  score_id UUID REFERENCES public.red_flag_scores(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  reason_text TEXT NOT NULL,
  triggering_metrics JSONB,
  acknowledged_by_doctor BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  is_suppressed BOOLEAN DEFAULT false,
  suppressed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Medications table
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  prescribed_by_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  drug_name TEXT NOT NULL,
  dose NUMERIC,
  dose_unit TEXT,
  route TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  serial_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PFT records table
CREATE TABLE IF NOT EXISTS public.pft_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  test_date DATE NOT NULL,
  fev1 NUMERIC,
  fvc NUMERIC,
  fev1_fvc_ratio NUMERIC,
  dlco NUMERIC,
  other_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Respiratory support table
CREATE TABLE IF NOT EXISTS public.respiratory_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  requires_support BOOLEAN NOT NULL DEFAULT false,
  ltot_enabled BOOLEAN DEFAULT false,
  ltot_litres NUMERIC,
  bipap_enabled BOOLEAN DEFAULT false,
  bipap_overnight BOOLEAN DEFAULT false,
  bipap_all_time BOOLEAN DEFAULT false,
  bipap_requires_oxygen BOOLEAN DEFAULT false,
  bipap_oxygen_litres NUMERIC,
  bipap_ipap NUMERIC,
  bipap_epap NUMERIC,
  bipap_pressure_support NUMERIC,
  bipap_respiratory_rate NUMERIC,
  invasive_vent_enabled BOOLEAN DEFAULT false,
  vent_ipap NUMERIC,
  vent_epap NUMERIC,
  vent_pressure_support NUMERIC,
  vent_respiratory_rate NUMERIC,
  vent_fio2_percent NUMERIC,
  tracheostomy_enabled BOOLEAN DEFAULT false,
  trach_for_airway_patency BOOLEAN DEFAULT false,
  trach_requires_oxygen BOOLEAN DEFAULT false,
  trach_oxygen_litres NUMERIC,
  trach_requires_vent BOOLEAN DEFAULT false,
  trach_vent_ipap NUMERIC,
  trach_vent_epap NUMERIC,
  trach_vent_pressure_support NUMERIC,
  trach_vent_respiratory_rate NUMERIC,
  trach_vent_tidal_volume NUMERIC,
  trach_vent_fio2_percent NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Doctor instructions table
CREATE TABLE IF NOT EXISTS public.doctor_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  instruction_text TEXT NOT NULL,
  read_by_patient_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Patient baselines table
CREATE TABLE IF NOT EXISTS public.patient_baselines (
  patient_id UUID PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  baseline_spo2 NUMERIC,
  baseline_mmrc INTEGER,
  baseline_oxygen_flow NUMERIC,
  baseline_cough_vas NUMERIC,
  target_spo2_min NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT,
  actor_role TEXT,
  action TEXT,
  target_patient_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Export records table
CREATE TABLE IF NOT EXISTS public.export_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  export_type TEXT,
  r2_object_key TEXT,
  presigned_url TEXT,
  url_expires_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Security tables
CREATE TABLE IF NOT EXISTS public.patient_login_security (
  patient_id UUID PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  pin_hash TEXT,
  pin_salt TEXT,
  pin_hash_algorithm TEXT,
  pin_set_at TIMESTAMPTZ,
  pin_last_changed_at TIMESTAMPTZ,
  failed_pin_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_failed_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.otp_sessions (
  patient_id UUID PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.otp_verified_sessions (
  token TEXT PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false
);

-- Enable RLS across all tables
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flag_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pft_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respiratory_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_login_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verified_sessions ENABLE ROW LEVEL SECURITY;
