-- Add appointment preference fields to doctors table
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS accepts_appointments BOOLEAN DEFAULT true;

ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS appointment_consultation_type VARCHAR(20) DEFAULT 'both',
ADD COLUMN IF NOT EXISTS appointment_available_days JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS appointment_time_slots JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS appointment_slot_duration INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS appointment_max_patients_per_slot INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS appointment_preferences_set_at TIMESTAMP NULL;

-- Add appointment preference fields to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS wants_appointments BOOLEAN NULL,
ADD COLUMN IF NOT EXISTS preferred_appointment_time VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS appointment_preference_set_at TIMESTAMP NULL;

-- Add comments
COMMENT ON COLUMN doctors.accepts_appointments IS 'Whether doctor accepts appointment requests from patients through the app';
COMMENT ON COLUMN doctors.appointment_consultation_type IS 'Allowed consultation type: online, offline, or both';
COMMENT ON COLUMN doctors.appointment_available_days IS 'Array of weekday keys when doctor accepts appointments';
COMMENT ON COLUMN doctors.appointment_time_slots IS 'Object keyed by weekday with start/end times';
COMMENT ON COLUMN doctors.appointment_slot_duration IS 'Appointment slot duration in minutes';
COMMENT ON COLUMN doctors.appointment_max_patients_per_slot IS 'Maximum patients allowed per slot';
COMMENT ON COLUMN doctors.appointment_preferences_set_at IS 'Timestamp when doctor configured appointment settings';
COMMENT ON COLUMN patients.wants_appointments IS 'Whether patient wants to book appointments through the app (set on first login)';
COMMENT ON COLUMN patients.preferred_appointment_time IS 'Patient preferred appointment time (morning, afternoon, evening, flexible)';
COMMENT ON COLUMN patients.appointment_preference_set_at IS 'Timestamp when patient set their appointment preference';
