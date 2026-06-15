// Auto-generated from Supabase schema. Do not edit manually.
// Regenerate with: Supabase MCP -> generate_typescript_types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          target_patient_id: string | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_patient_id?: string | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_patient_id?: string | null
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          aqi_is_cached: boolean | null
          aqi_value: number | null
          disease_specific_data: Json
          dqi_score: number | null
          fi_score: number | null
          id: string
          is_duplicate_suppressed: boolean | null
          is_outlier_suppressed: boolean | null
          logged_at: string
          medication_compliance: Json | null
          mmrc_today: number | null
          offline_queued_at: string | null
          oxygen_change_direction: string | null
          oxygen_change_litres: number | null
          oxygen_condition_static: boolean | null
          patient_id: string | null
          pedal_edema: boolean | null
          pm10: number | null
          pm25: number | null
          side_effects: Json | null
          spo2_exertion: number | null
          spo2_rest: number | null
          step_count_today: number | null
          submitted_at: string | null
          vas_symptoms: Json | null
        }
        Insert: {
          aqi_is_cached?: boolean | null
          aqi_value?: number | null
          disease_specific_data: Json
          dqi_score?: number | null
          fi_score?: number | null
          id?: string
          is_duplicate_suppressed?: boolean | null
          is_outlier_suppressed?: boolean | null
          logged_at: string
          medication_compliance?: Json | null
          mmrc_today?: number | null
          offline_queued_at?: string | null
          oxygen_change_direction?: string | null
          oxygen_change_litres?: number | null
          oxygen_condition_static?: boolean | null
          patient_id?: string | null
          pedal_edema?: boolean | null
          pm10?: number | null
          pm25?: number | null
          side_effects?: Json | null
          spo2_exertion?: number | null
          spo2_rest?: number | null
          step_count_today?: number | null
          submitted_at?: string | null
          vas_symptoms?: Json | null
        }
        Update: {
          aqi_is_cached?: boolean | null
          aqi_value?: number | null
          disease_specific_data?: Json
          dqi_score?: number | null
          fi_score?: number | null
          id?: string
          is_duplicate_suppressed?: boolean | null
          is_outlier_suppressed?: boolean | null
          logged_at?: string
          medication_compliance?: Json | null
          mmrc_today?: number | null
          offline_queued_at?: string | null
          oxygen_change_direction?: string | null
          oxygen_change_litres?: number | null
          oxygen_condition_static?: boolean | null
          patient_id?: string | null
          pedal_edema?: boolean | null
          pm10?: number | null
          pm25?: number | null
          side_effects?: Json | null
          spo2_exertion?: number | null
          spo2_rest?: number | null
          step_count_today?: number | null
          submitted_at?: string | null
          vas_symptoms?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by_doctor: boolean | null
          alert_type: string
          created_at: string | null
          id: string
          is_suppressed: boolean | null
          log_id: string | null
          patient_id: string | null
          reason_text: string
          score_id: string | null
          suppressed_until: string | null
          triggering_metrics: Json | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by_doctor?: boolean | null
          alert_type: string
          created_at?: string | null
          id?: string
          is_suppressed?: boolean | null
          log_id?: string | null
          patient_id?: string | null
          reason_text: string
          score_id?: string | null
          suppressed_until?: string | null
          triggering_metrics?: Json | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by_doctor?: boolean | null
          alert_type?: string
          created_at?: string | null
          id?: string
          is_suppressed?: boolean | null
          log_id?: string | null
          patient_id?: string | null
          reason_text?: string
          score_id?: string | null
          suppressed_until?: string | null
          triggering_metrics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "disease_alerts_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disease_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disease_alerts_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "red_flag_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_instructions: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          id: string
          instruction_text: string
          patient_id: string | null
          read_by_patient_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          instruction_text: string
          patient_id?: string | null
          read_by_patient_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          instruction_text?: string
          patient_id?: string | null
          read_by_patient_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_instructions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_instructions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string | null
          email: string | null
          expo_push_token: string | null
          hospital: string
          id: string
          name: string
          specialisation: string
          accepts_appointments: boolean
          appointment_consultation_type: string | null
          appointment_available_days: Json | null
          appointment_time_slots: Json | null
          appointment_slot_duration: number | null
          appointment_max_patients_per_slot: number | null
          appointment_preferences_set_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expo_push_token?: string | null
          hospital: string
          id?: string
          name: string
          specialisation: string
          accepts_appointments?: boolean
          appointment_consultation_type?: string | null
          appointment_available_days?: Json | null
          appointment_time_slots?: Json | null
          appointment_slot_duration?: number | null
          appointment_max_patients_per_slot?: number | null
          appointment_preferences_set_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expo_push_token?: string | null
          hospital?: string
          id?: string
          name?: string
          specialisation?: string
          accepts_appointments?: boolean
          appointment_consultation_type?: string | null
          appointment_available_days?: Json | null
          appointment_time_slots?: Json | null
          appointment_slot_duration?: number | null
          appointment_max_patients_per_slot?: number | null
          appointment_preferences_set_at?: string | null
        }
        Relationships: []
      }
      export_records: {
        Row: {
          doctor_id: string | null
          export_type: string | null
          generated_at: string | null
          id: string
          patient_id: string | null
          presigned_url: string | null
          r2_object_key: string | null
          url_expires_at: string | null
        }
        Insert: {
          doctor_id?: string | null
          export_type?: string | null
          generated_at?: string | null
          id?: string
          patient_id?: string | null
          presigned_url?: string | null
          r2_object_key?: string | null
          url_expires_at?: string | null
        }
        Update: {
          doctor_id?: string | null
          export_type?: string | null
          generated_at?: string | null
          id?: string
          patient_id?: string | null
          presigned_url?: string | null
          r2_object_key?: string | null
          url_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string | null
          dose: number | null
          dose_unit: string | null
          drug_name: string
          end_date: string | null
          frequency: string | null
          id: string
          patient_id: string | null
          prescribed_by_doctor_id: string | null
          route: string
          serial_number: number | null
          start_date: string
        }
        Insert: {
          created_at?: string | null
          dose?: number | null
          dose_unit?: string | null
          drug_name: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          patient_id?: string | null
          prescribed_by_doctor_id?: string | null
          route: string
          serial_number?: number | null
          start_date: string
        }
        Update: {
          created_at?: string | null
          dose?: number | null
          dose_unit?: string | null
          drug_name?: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          patient_id?: string | null
          prescribed_by_doctor_id?: string | null
          route?: string
          serial_number?: number | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_prescribed_by_doctor_id_fkey"
            columns: ["prescribed_by_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_baselines: {
        Row: {
          baseline_cough_vas: number | null
          baseline_mmrc: number | null
          baseline_oxygen_flow: number | null
          baseline_spo2: number | null
          patient_id: string
          target_spo2_min: number | null
          updated_at: string | null
        }
        Insert: {
          baseline_cough_vas?: number | null
          baseline_mmrc?: number | null
          baseline_oxygen_flow?: number | null
          baseline_spo2?: number | null
          patient_id: string
          target_spo2_min?: number | null
          updated_at?: string | null
        }
        Update: {
          baseline_cough_vas?: number | null
          baseline_mmrc?: number | null
          baseline_oxygen_flow?: number | null
          baseline_spo2?: number | null
          patient_id?: string
          target_spo2_min?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_baselines_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_diagnoses: {
        Row: {
          comorbidities: Json | null
          comorbidities_other_text: string | null
          created_at: string | null
          diagnosed_at: string | null
          effective_dashboard: string
          id: string
          patient_id: string | null
          post_icu_sub_diagnosis: string | null
          primary_diagnosis: string
        }
        Insert: {
          comorbidities?: Json | null
          comorbidities_other_text?: string | null
          created_at?: string | null
          diagnosed_at?: string | null
          effective_dashboard: string
          id?: string
          patient_id?: string | null
          post_icu_sub_diagnosis?: string | null
          primary_diagnosis: string
        }
        Update: {
          comorbidities?: Json | null
          comorbidities_other_text?: string | null
          created_at?: string | null
          diagnosed_at?: string | null
          effective_dashboard?: string
          id?: string
          patient_id?: string | null
          post_icu_sub_diagnosis?: string | null
          primary_diagnosis?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          alternate_mobile_number: string | null
          created_at: string | null
          date_of_birth: string
          doctor_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          expo_push_token: string | null
          gender: string | null
          id: string
          mobile_number: string
          name: string
          updated_at: string | null
          wants_appointments: boolean | null
          preferred_appointment_time: string | null
          appointment_preference_set_at: string | null
        }
        Insert: {
          address?: string | null
          alternate_mobile_number?: string | null
          created_at?: string | null
          date_of_birth: string
          doctor_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          expo_push_token?: string | null
          gender?: string | null
          id?: string
          mobile_number: string
          name: string
          updated_at?: string | null
          wants_appointments?: boolean | null
          preferred_appointment_time?: string | null
          appointment_preference_set_at?: string | null
        }
        Update: {
          address?: string | null
          alternate_mobile_number?: string | null
          created_at?: string | null
          date_of_birth?: string
          doctor_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          expo_push_token?: string | null
          gender?: string | null
          id?: string
          mobile_number?: string
          name?: string
          updated_at?: string | null
          wants_appointments?: boolean | null
          preferred_appointment_time?: string | null
          appointment_preference_set_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      pft_records: {
        Row: {
          created_at: string | null
          created_by_doctor_id: string | null
          dlco: number | null
          fev1: number | null
          fev1_fvc_ratio: number | null
          fvc: number | null
          id: string
          other_fields: Json | null
          patient_id: string | null
          test_date: string
        }
        Insert: {
          created_at?: string | null
          created_by_doctor_id?: string | null
          dlco?: number | null
          fev1?: number | null
          fev1_fvc_ratio?: number | null
          fvc?: number | null
          id?: string
          other_fields?: Json | null
          patient_id?: string | null
          test_date: string
        }
        Update: {
          created_at?: string | null
          created_by_doctor_id?: string | null
          dlco?: number | null
          fev1?: number | null
          fev1_fvc_ratio?: number | null
          fvc?: number | null
          id?: string
          other_fields?: Json | null
          patient_id?: string | null
          test_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pft_records_created_by_doctor_id_fkey"
            columns: ["created_by_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pft_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      red_flag_scores: {
        Row: {
          computed_at: string | null
          global_score: number
          id: string
          indicator_color: string | null
          log_id: string | null
          patient_id: string | null
          risk_level: string | null
          score_breakdown: Json | null
        }
        Insert: {
          computed_at?: string | null
          global_score: number
          id?: string
          indicator_color?: string | null
          log_id?: string | null
          patient_id?: string | null
          risk_level?: string | null
          score_breakdown?: Json | null
        }
        Update: {
          computed_at?: string | null
          global_score?: number
          id?: string
          indicator_color?: string | null
          log_id?: string | null
          patient_id?: string | null
          risk_level?: string | null
          score_breakdown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "red_flag_scores_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_flag_scores_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      respiratory_support: {
        Row: {
          bipap_all_time: boolean | null
          bipap_enabled: boolean | null
          bipap_epap: number | null
          bipap_ipap: number | null
          bipap_overnight: boolean | null
          bipap_oxygen_litres: number | null
          bipap_pressure_support: number | null
          bipap_requires_oxygen: boolean | null
          bipap_respiratory_rate: number | null
          created_at: string | null
          id: string
          invasive_vent_enabled: boolean | null
          ltot_enabled: boolean | null
          ltot_litres: number | null
          patient_id: string | null
          requires_support: boolean
          trach_for_airway_patency: boolean | null
          trach_oxygen_litres: number | null
          trach_requires_oxygen: boolean | null
          trach_requires_vent: boolean | null
          trach_vent_epap: number | null
          trach_vent_fio2_percent: number | null
          trach_vent_ipap: number | null
          trach_vent_pressure_support: number | null
          trach_vent_respiratory_rate: number | null
          trach_vent_tidal_volume: number | null
          tracheostomy_enabled: boolean | null
          updated_at: string | null
          vent_epap: number | null
          vent_fio2_percent: number | null
          vent_ipap: number | null
          vent_pressure_support: number | null
          vent_respiratory_rate: number | null
        }
        Insert: {
          bipap_all_time?: boolean | null
          bipap_enabled?: boolean | null
          bipap_epap?: number | null
          bipap_ipap?: number | null
          bipap_overnight?: boolean | null
          bipap_oxygen_litres?: number | null
          bipap_pressure_support?: number | null
          bipap_requires_oxygen?: boolean | null
          bipap_respiratory_rate?: number | null
          created_at?: string | null
          id?: string
          invasive_vent_enabled?: boolean | null
          ltot_enabled?: boolean | null
          ltot_litres?: number | null
          patient_id?: string | null
          requires_support?: boolean
          trach_for_airway_patency?: boolean | null
          trach_oxygen_litres?: number | null
          trach_requires_oxygen?: boolean | null
          trach_requires_vent?: boolean | null
          trach_vent_epap?: number | null
          trach_vent_fio2_percent?: number | null
          trach_vent_ipap?: number | null
          trach_vent_pressure_support?: number | null
          trach_vent_respiratory_rate?: number | null
          trach_vent_tidal_volume?: number | null
          tracheostomy_enabled?: boolean | null
          updated_at?: string | null
          vent_epap?: number | null
          vent_fio2_percent?: number | null
          vent_ipap?: number | null
          vent_pressure_support?: number | null
          vent_respiratory_rate?: number | null
        }
        Update: {
          bipap_all_time?: boolean | null
          bipap_enabled?: boolean | null
          bipap_epap?: number | null
          bipap_ipap?: number | null
          bipap_overnight?: boolean | null
          bipap_oxygen_litres?: number | null
          bipap_pressure_support?: number | null
          bipap_requires_oxygen?: boolean | null
          bipap_respiratory_rate?: number | null
          created_at?: string | null
          id?: string
          invasive_vent_enabled?: boolean | null
          ltot_enabled?: boolean | null
          ltot_litres?: number | null
          patient_id?: string | null
          requires_support?: boolean
          trach_for_airway_patency?: boolean | null
          trach_oxygen_litres?: number | null
          trach_requires_oxygen?: boolean | null
          trach_requires_vent?: boolean | null
          trach_vent_epap?: number | null
          trach_vent_fio2_percent?: number | null
          trach_vent_ipap?: number | null
          trach_vent_pressure_support?: number | null
          trach_vent_respiratory_rate?: number | null
          trach_vent_tidal_volume?: number | null
          tracheostomy_enabled?: boolean | null
          updated_at?: string | null
          vent_epap?: number | null
          vent_fio2_percent?: number | null
          vent_ipap?: number | null
          vent_pressure_support?: number | null
          vent_respiratory_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "respiratory_support_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          id: string
          patient_id: string | null
          doctor_id: string | null
          scheduled_at: string
          title: string
          notes: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          patient_id?: string | null
          doctor_id?: string | null
          scheduled_at: string
          title: string
          notes?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          patient_id?: string | null
          doctor_id?: string | null
          scheduled_at?: string
          title?: string
          notes?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_sessions: {
        Row: {
          patient_id: string
          otp_hash: string
          expires_at: string
          attempts: number
        }
        Insert: {
          patient_id: string
          otp_hash: string
          expires_at: string
          attempts?: number
        }
        Update: {
          patient_id?: string
          otp_hash?: string
          expires_at?: string
          attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "otp_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          }
        ]
      }
      patient_login_security: {
        Row: {
          patient_id: string
          pin_hash: string | null
          pin_salt: string | null
          pin_hash_algorithm: string | null
          pin_set_at: string | null
          pin_last_changed_at: string | null
          failed_pin_attempts: number | null
          locked_until: string | null
          last_login_at: string | null
          last_failed_login_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          patient_id: string
          pin_hash?: string | null
          pin_salt?: string | null
          pin_hash_algorithm?: string | null
          pin_set_at?: string | null
          pin_last_changed_at?: string | null
          failed_pin_attempts?: number | null
          locked_until?: string | null
          last_login_at?: string | null
          last_failed_login_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          patient_id?: string
          pin_hash?: string | null
          pin_salt?: string | null
          pin_hash_algorithm?: string | null
          pin_set_at?: string | null
          pin_last_changed_at?: string | null
          failed_pin_attempts?: number | null
          locked_until?: string | null
          last_login_at?: string | null
          last_failed_login_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_login_security_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          }
        ]
      }
      otp_verified_sessions: {
        Row: {
          token: string
          patient_id: string
          created_at: string
          expires_at: string
          used: boolean
        }
        Insert: {
          token?: string
          patient_id: string
          created_at?: string
          expires_at: string
          used?: boolean
        }
        Update: {
          token?: string
          patient_id?: string
          created_at?: string
          expires_at?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "otp_verified_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
