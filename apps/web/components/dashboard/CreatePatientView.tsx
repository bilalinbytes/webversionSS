"use client";

import { useState, useEffect } from "react";
import { Check, AlertCircle, ChevronRight, Loader2, User, Stethoscope, Wind, Activity, Pill } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { MedicationAutocompleteInput } from "@/components/clinical/MedicationAutocompleteInput";
import styles from "./CreatePatientView.module.css";
// import { z } from "zod"; // Not needed directly here if not validating client-side

export type FormData = {
  name: string;
  age: string;
  gender: "Male" | "Female" | "Other" | "";
  mobile_number: string;
  alternate_mobile: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;

  // Occupation and Exposure details
  occupation: string;
  other_occupation: string;
  significant_exposure: string;

  // Personal Habits & Past Medical History
  smoking: "Yes" | "No" | "";
  smoking_index: string;
  alcohol: "Yes" | "No" | "";
  past_history_selected: boolean;
  past_history_text: string;
  past_history_years_ago: string;

  // Clinical diagnosis
  disease_category: "ILD" | "OAD" | "Bronchiectasis" | "Post ICU Recovery" | "";
  // ILD sub-fields
  ild_subtype: string;
  ild_other_text: string;
  is_fibrotic: boolean | null;
  // OAD sub-fields
  oad_diagnosis: string;
  oad_other_text: string;
  // Bronchiectasis sub-fields
  bronchiectasis_cause: string;
  bronchiectasis_other_text: string;
  // Post ICU sub-fields
  posticu_cause: string;
  posticu_other_text: string;

  // Legacy fields kept for API compatibility
  primary_diagnosis: "asthma" | "copd" | "ild" | "bronchiectasis" | "post_icu" | "";
  post_icu_sub_diagnosis: "asthma" | "copd" | "ild" | "bronchiectasis" | "post_infection" | null;
  comorbidities: string[];
  comorbidities_other_text: string | null;
  diagnosed_at: string | null;

  respiratory_support: {
    requires_support: boolean;
    ltot_enabled: boolean;
    ltot_litres: number | null;
    bipap_enabled: boolean;
    bipap_overnight: boolean;
    bipap_all_time: boolean;
    bipap_requires_oxygen: boolean;
    bipap_oxygen_litres: number | null;
    bipap_ipap: number | null;
    bipap_epap: number | null;
    bipap_pressure_support: number | null;
    bipap_respiratory_rate: number | null;
    invasive_vent_enabled: boolean;
    vent_ipap: number | null;
    vent_epap: number | null;
    vent_pressure_support: number | null;
    vent_respiratory_rate: number | null;
    vent_fio2_percent: number | null;
    tracheostomy_enabled: boolean;
    trach_for_airway_patency: boolean;
    trach_requires_oxygen: boolean;
    trach_oxygen_litres: number | null;
    trach_requires_vent: boolean;
    trach_vent_ipap: number | null;
    trach_vent_epap: number | null;
    trach_vent_pressure_support: number | null;
    trach_vent_respiratory_rate: number | null;
    trach_vent_tidal_volume: number | null;
    trach_vent_fio2_percent: number | null;
  };

  pft_records: Array<{
    _clientId: number;
    test_date: string;
    fvc: number | null;
    fev1: number | null;
    fev1_fvc_ratio: number | null;
    dlco: number | null;
    fev1_pct_pred?: string | null;
    fvc_pct_pred?: string | null;
    six_mwd?: string | null;
    min_spo2?: string | null;
    max_spo2?: string | null;
    baseline_spo2?: string | null;
    baseline_heart_rate?: string | null;
  }>;

  baseline_spo2: string;
  baseline_heart_rate: string;

  medications: Array<{
    _clientId: number;
    route: "inj" | "tablet" | "capsule" | "nebulisation" | "inhaler" | "nasal_spray";
    drug_name: string;
    dose: number | null;
    dose_unit: string | null;
    frequency: string;
    start_date: string;
    end_date: string | null;
    prescription_date: string | null;
    patient_instruction?: string | null;
  }>;
};

const INIT_FORM_DATA: FormData = {
  name: "", age: "", gender: "", mobile_number: "", alternate_mobile: "", emergency_contact_name: "", emergency_contact_phone: "",
  occupation: "", other_occupation: "", significant_exposure: "",
  smoking: "", smoking_index: "", alcohol: "", past_history_selected: false, past_history_text: "", past_history_years_ago: "",
  disease_category: "",
  ild_subtype: "", ild_other_text: "", is_fibrotic: null,
  oad_diagnosis: "", oad_other_text: "",
  bronchiectasis_cause: "", bronchiectasis_other_text: "",
  posticu_cause: "", posticu_other_text: "",
  primary_diagnosis: "", post_icu_sub_diagnosis: null, comorbidities: [], comorbidities_other_text: null, diagnosed_at: null,
  respiratory_support: {
    requires_support: false,
    ltot_enabled: false, ltot_litres: null,
    bipap_enabled: false, bipap_overnight: false, bipap_all_time: false, bipap_requires_oxygen: false, bipap_oxygen_litres: null, bipap_ipap: null, bipap_epap: null, bipap_pressure_support: null, bipap_respiratory_rate: null,
    invasive_vent_enabled: false, vent_ipap: null, vent_epap: null, vent_pressure_support: null, vent_respiratory_rate: null, vent_fio2_percent: null,
    tracheostomy_enabled: false, trach_for_airway_patency: false, trach_requires_oxygen: false, trach_oxygen_litres: null, trach_requires_vent: false, trach_vent_ipap: null, trach_vent_epap: null, trach_vent_pressure_support: null, trach_vent_respiratory_rate: null, trach_vent_tidal_volume: null, trach_vent_fio2_percent: null,
  },
  pft_records: [],
  baseline_spo2: "",
  baseline_heart_rate: "",
  medications: []
};

export function parseAddressToFormFields(_rawAddress: string | null | undefined): Record<string, never> {
  return {};
}

function buildCombinedAddress(_data: FormData): string {
  return "";
}

const STEPS = [
  { label: "Basic Info", sub: "Name, mobile, age" },
  { label: "Diagnosis", sub: "Category + subtype" },
  { label: "Co-morbidities", sub: "Associated conditions" },
  { label: "PFT Records", sub: "Lung function tests" },
  { label: "Respiratory Support", sub: "LTOT / BiPAP / Vent" },
  { label: "Medications", sub: "Active prescriptions" },
  { label: "Review & Create", sub: "Preview before saving" },
];

const GENDER_OPTIONS: Array<FormData["gender"]> = ["Male", "Female", "Other"];

function Field({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.req}> *</span>}
      </label>
      {children}
      {error && (
        <span className={styles.fieldError}>
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  );
}

// -- Step 1: Basic Info --------------------------------------------------------
function StepBasicInfo({ data, update, errors, isEdit }: { data: FormData; update: (d: Partial<FormData>) => void; errors: Record<string, string>, isEdit?: boolean }) {
  const updateField = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    update({ [key]: val } as Pick<FormData, K>);
  };

  const mobileValid = /^[6-9]\d{9}$/.test(data.mobile_number);
  const altMobileValid = !data.alternate_mobile || /^[6-9]\d{9}$/.test(data.alternate_mobile);

  // Real-time duplicate check when mobile reaches 10 digits
  const [duplicateCheck, setDuplicateCheck] = useState<"idle" | "checking" | "duplicate" | "available">("idle");
  useEffect(() => {
    if (!mobileValid || isEdit) { setDuplicateCheck("idle"); return; }
    setDuplicateCheck("checking");
    const timer = setTimeout(async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const normalized = `+91${data.mobile_number}`;
        const { data: existing } = await supabase
          .from("patients")
          .select("id")
          .eq("mobile_number", normalized)
          .maybeSingle();
        setDuplicateCheck(existing ? "duplicate" : "available");
      } catch {
        setDuplicateCheck("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [data.mobile_number, mobileValid, isEdit]);

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Patient Basic Information</h2>
        <p className={styles.stepDesc}>Enter the patient&apos;s essential details. All fields marked <span style={{ color: "#c94d49" }}>*</span> are required before you can proceed.</p>
      </div>
      <div className={styles.card}>
        <p className={styles.cardTitle}>Personal Details</p>
        <div className={styles.grid2}>
          <Field label="Full Name" required error={errors["name"]}>
            <input
              className={`${styles.input} ${errors["name"] ? styles.inputError : data.name.trim() ? styles.inputValid : ""}`}
              placeholder="e.g. Priya Krishnamurthy"
              value={data.name}
              onChange={e => { updateField("name", e.target.value); }}
            />
          </Field>
          <div className={styles.personalStack}>
            <Field label="Sex" required error={errors["gender"]}>
              <div className={styles.radioGroup}>
                {GENDER_OPTIONS.map((g) => (
                  <label key={g} className={styles.radioItem}>
                    <input type="radio" name="gender" value={g} checked={data.gender === g} onChange={() => updateField("gender", g)} className={styles.radioInput} />
                    <span className={styles.radioLabel}>{g}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Age (years)" required error={errors["age"]}>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                max={120}
                className={`${styles.input} ${errors["age"] ? styles.inputError : (data.age && Number(data.age) > 0) ? styles.inputValid : ""}`}
                placeholder="e.g. 52"
                value={data.age}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "");
                  if (v === "" || (Number(v) >= 1 && Number(v) <= 120)) updateField("age", v);
                }}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Contact Details</p>
        <p className={styles.cardSub}>The patient logs in using their mobile number. This must be correct - they cannot log in without it.</p>
        <div className={styles.grid2}>
          <Field label="Mobile Number" required error={errors["mobile_number"] || errors["global_mobile"]}>
            <div style={{ position: "relative" }}>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                className={`${styles.input} ${errors["mobile_number"] || errors["global_mobile"] || duplicateCheck === "duplicate"
                    ? styles.inputError
                    : duplicateCheck === "available"
                      ? styles.inputValid
                      : mobileValid
                        ? styles.inputValid
                        : ""
                  }`}
                placeholder="10-digit number (e.g. 9876543210)"
                value={data.mobile_number}
                disabled={isEdit}
                onChange={e => { updateField("mobile_number", e.target.value.replace(/\D/g, "").slice(0, 10)); setDuplicateCheck("idle"); }}
              />
              {duplicateCheck === "checking" && (
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#888" }}>checking...</span>
              )}
              {duplicateCheck === "available" && (
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#2d7a38", fontSize: 12 }}>OK</span>
              )}
            </div>
            {duplicateCheck === "duplicate" && (
              <span className={styles.fieldError} style={{ color: "#c94d49", fontWeight: 600 }}>
                <AlertCircle size={11} /> Patient already registered with this number
              </span>
            )}
            {duplicateCheck !== "duplicate" && !errors["mobile_number"] && !errors["global_mobile"] && data.mobile_number.length > 0 && !mobileValid && (
              <span className={styles.fieldError} style={{ color: "#ef9f27" }}>
                <AlertCircle size={11} /> Must be 10 digits starting with 6-9
              </span>
            )}
            {duplicateCheck === "available" && (
              <span style={{ fontSize: 11, color: "#2d7a38", marginTop: 3, display: "block" }}>
                Available - patient will log in with +91{data.mobile_number}
              </span>
            )}
          </Field>
          <Field label="Alternate Mobile (Caretaker)" error={errors["alternate_mobile"]}>
            <input
              className={`${styles.input} ${errors["alternate_mobile"] ? styles.inputError : (data.alternate_mobile && altMobileValid) ? styles.inputValid : ""}`}
              placeholder="Optional - caretaker&apos;s number"
              value={data.alternate_mobile}
              maxLength={10}
              onChange={e => updateField("alternate_mobile", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>
      </div>

      {/* Occupation & Environmental Exposure (3-Box System) */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>Occupation &amp; Significant Illness Exposure</p>
        <p className={styles.cardSub}>Occupational history and environmental exposures relevant to respiratory disease assessment.</p>
        <div className={styles.grid2}>
          {/* Box 1: Occupation Dropdown */}
          <Field label="Occupation (व्यवसाय)">
            <select
              className={styles.select}
              value={data.occupation}
              onChange={(e) => updateField("occupation", e.target.value)}
            >
              <option value="">-- Select Occupation --</option>
              {OCCUPATION_OPTIONS.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>
          </Field>

          {/* Box 2: Other Occupation Text (Visible when Other is selected) */}
          {data.occupation === "Other" && (
            <Field label="Other Occupation (अन्य व्यवसाय)">
              <input
                className={`${styles.input} ${data.other_occupation.trim() ? styles.inputValid : ""}`}
                placeholder="Type specific occupation..."
                value={data.other_occupation}
                onChange={(e) => updateField("other_occupation", e.target.value)}
              />
            </Field>
          )}

          {/* Box 3: Significant Exposure Related to Illness */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Significant Exposure Related to Illness (संबंधित एक्सपोजर / जोखिम)">
              <textarea
                className={styles.textarea}
                rows={2}
                placeholder="e.g. Biomass fuel smoke (chulha), Pigeon/bird exposure, Silica/sand dust, Chemical fumes, Grain dust, Textile fibers, Molds..."
                value={data.significant_exposure}
                onChange={(e) => updateField("significant_exposure", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Personal Habits & Past Medical History (Doctor Dashboard) */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>Personal Habits &amp; Past Medical History</p>
        <p className={styles.cardSub}>Smoking habits, alcohol consumption, and relevant past illness or surgical history.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 1. Smoking */}
          <div style={{ padding: "14px", borderRadius: 8, background: "var(--med-surface-alt, #f8fafc)", border: "1px solid var(--med-border-subtle, #e2e8f0)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--med-text-primary, #0f172a)" }}>1. Smoking (धूम्रपान)</span>
                <p style={{ fontSize: 11.5, color: "var(--med-text-muted, #64748b)", margin: "2px 0 0" }}>Does the patient currently or previously smoke?</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["No", "Yes"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`${styles.diagCatBtn} ${data.smoking === opt ? styles.diagCatBtnActive : ""}`}
                    style={data.smoking === opt ? { background: opt === "Yes" ? "#dc2626" : "#1e6091", color: "#ffffff", borderColor: opt === "Yes" ? "#b91c1c" : "#1e6091" } : {}}
                    onClick={() => {
                      updateField("smoking", opt);
                      if (opt === "No") updateField("smoking_index", "");
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {data.smoking === "Yes" && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--med-border-strong, #cbd5e1)" }}>
                <Field label="Smoking Index (धूम्रपान सूचकांक / Pack-Years)">
                  <input
                    className={`${styles.input} ${data.smoking_index.trim() ? styles.inputValid : ""}`}
                    placeholder="e.g. 200 (cigarettes/day × years) or 10 pack-years..."
                    value={data.smoking_index}
                    onChange={(e) => updateField("smoking_index", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* 2. Alcohol */}
          <div style={{ padding: "14px", borderRadius: 8, background: "var(--med-surface-alt, #f8fafc)", border: "1px solid var(--med-border-subtle, #e2e8f0)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--med-text-primary, #0f172a)" }}>2. Alcohol (शराब / मदिरापान)</span>
                <p style={{ fontSize: 11.5, color: "var(--med-text-muted, #64748b)", margin: "2px 0 0" }}>Does the patient consume alcohol?</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["No", "Yes"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`${styles.diagCatBtn} ${data.alcohol === opt ? styles.diagCatBtnActive : ""}`}
                    style={data.alcohol === opt ? { background: opt === "Yes" ? "#d97706" : "#1e6091", color: "#ffffff", borderColor: opt === "Yes" ? "#b45309" : "#1e6091" } : {}}
                    onClick={() => updateField("alcohol", opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Past history of */}
          <div style={{ padding: "14px", borderRadius: 8, background: "var(--med-surface-alt, #f8fafc)", border: "1px solid var(--med-border-subtle, #e2e8f0)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--med-text-primary, #0f172a)" }}>3. Past History of (पूर्व बीमारी का इतिहास)</span>
                <p style={{ fontSize: 11.5, color: "var(--med-text-muted, #64748b)", margin: "2px 0 0" }}>Significant past medical illness, hospitalization, TB, or surgery?</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={`${styles.diagCatBtn} ${!data.past_history_selected ? styles.diagCatBtnActive : ""}`}
                  style={!data.past_history_selected ? { background: "#1e6091", color: "#ffffff", borderColor: "#1e6091" } : {}}
                  onClick={() => {
                    updateField("past_history_selected", false);
                    updateField("past_history_text", "");
                    updateField("past_history_years_ago", "");
                  }}
                >
                  No
                </button>
                <button
                  type="button"
                  className={`${styles.diagCatBtn} ${data.past_history_selected ? styles.diagCatBtnActive : ""}`}
                  style={data.past_history_selected ? { background: "#0284c7", color: "#ffffff", borderColor: "#0284c7" } : {}}
                  onClick={() => updateField("past_history_selected", true)}
                >
                  Yes
                </button>
              </div>
            </div>

            {data.past_history_selected && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--med-border-strong, #cbd5e1)", display: "grid", gridTemplateColumns: "1fr 180px", gap: 12 }}>
                <Field label="Past History of (पूर्व बीमारी का विवरण)">
                  <input
                    className={`${styles.input} ${data.past_history_text.trim() ? styles.inputValid : ""}`}
                    placeholder="e.g. Pulmonary Tuberculosis, Pneumonia, CABG, COVID-19 ARDS..."
                    value={data.past_history_text}
                    onChange={(e) => updateField("past_history_text", e.target.value)}
                  />
                </Field>
                <Field label="How Many Years Back (कितने वर्ष पूर्व)">
                  <input
                    className={`${styles.input} ${data.past_history_years_ago.trim() ? styles.inputValid : ""}`}
                    placeholder="e.g. 5 or 5 years back"
                    value={data.past_history_years_ago}
                    onChange={(e) => updateField("past_history_years_ago", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


export const OCCUPATION_OPTIONS = [
  "Teacher",
  "Engineer",
  "Doctor / Healthcare Worker",
  "Farmer / Agricultural Worker",
  "Housewife / Homemaker",
  "Cook / Kitchen Staff",
  "Desktop / IT Employee",
  "Bank Employee",
  "Construction Worker / Mason",
  "Industrial / Factory Worker",
  "Driver / Transport Worker",
  "Textile / Tailor Worker",
  "Miner / Quarry Worker",
  "Security Guard",
  "Business / Merchant",
  "Student",
  "Retired",
  "Other",
];

// -- Step 2: Diagnosis ---------------------------------------------------------
const ILD_SUBTYPES = [
  "Idiopathic pulmonary fibrosis",
  "Hypersensitivity pneumonitis",
  "Idiopathic NSIP",
  "CTD-ILD",
  "IPAF",
  "Sarcoidosis",
  "Occupational ILD",
  "COP",
  "RB-ILD",
  "DIP",
  "AIP",
  "Idiopathic pleuro-parenchymal fibroelastosis",
  "LIP",
  "LCH",
  "LAM",
  "Eosinophilic pneumonia",
  "Others",
];

const OAD_DIAGNOSES = [
  "COPD",
  "Asthma",
  "Asthma-COPD Overlap (ACO)",
  "Bronchiolitis Obliterans",
  "Other OAD",
];

const BRONCHIECTASIS_CAUSES = [
  "Post-infectious",
  "Cystic Fibrosis related",
  "ABPA related",
  "Primary Ciliary Dyskinesia",
  "Idiopathic",
  "Other",
];

const POSTICU_CAUSES = [
  "ILD",
  "Obstructive Airway Disease",
  "Bronchiectasis",
  "Other cause",
];

const COMORBIDITIES = [
  "Diabetes Mellitus",
  "Hypertension",
  "GERD",
  "Obstructive Sleep Apnea",
  "Coronary Artery Disease",
  "Pulmonary Hypertension",
  "Hypothyroidism",
  "Osteoporosis",
  "Depression",
  "Anxiety",
  "Chronic Kidney Disease (CKD)",
  "Chronic Liver Disease (CLD)",
  "Past history of Pulmonary TB",
  "Hepatitis B",
  "Hepatitis C",
  "HIV",
  "Allergic Rhinitis",
  "ABPA",
  "CCPA",
  "Others",
];

type DiseaseCategory = FormData["disease_category"];

function getDiagnosisSummary(data: FormData): string {
  if (!data.disease_category) return "None selected";
  const parts: string[] = [data.disease_category];
  if (data.disease_category === "ILD") {
    if (data.ild_subtype) parts.push(data.ild_subtype === "Others" ? (data.ild_other_text || "Others") : data.ild_subtype);
    if (data.is_fibrotic === true) parts.push("Fibrotic");
    if (data.is_fibrotic === false) parts.push("Non-Fibrotic");
  } else if (data.disease_category === "OAD") {
    if (data.oad_diagnosis) parts.push(data.oad_diagnosis === "Other OAD" ? (data.oad_other_text || "Other OAD") : data.oad_diagnosis);
  } else if (data.disease_category === "Bronchiectasis") {
    if (data.bronchiectasis_cause) parts.push(data.bronchiectasis_cause === "Other" ? (data.bronchiectasis_other_text || "Other") : data.bronchiectasis_cause);
  } else if (data.disease_category === "Post ICU Recovery") {
    if (data.posticu_cause) parts.push(data.posticu_cause === "Other cause" ? (data.posticu_other_text || "Other") : data.posticu_cause);
  }
  return parts.join(" / ");
}

function getEffectiveDashboard(data: FormData): string {
  switch (data.disease_category) {
    case "ILD": return "ild";
    case "OAD": {
      const d = data.oad_diagnosis.toLowerCase();
      // Bronchiolitis Obliterans - asthma dashboard
      if (d.includes("bronchiolitis")) return "asthma";
      // Asthma-COPD Overlap (ACO) - copd dashboard
      if (d.includes("overlap") || d.includes("aco") || (d.includes("asthma") && d.includes("copd"))) return "copd";
      // Pure asthma
      if (d.includes("asthma") && !d.includes("copd")) return "asthma";
      // COPD and everything else
      return "copd";
    }
    case "Bronchiectasis": return "bronchiectasis";
    case "Post ICU Recovery": return "post_icu";
    default: return "ild";
  }
}

function StepDiagnosis({ data, update, errors }: { data: FormData; update: (d: Partial<FormData>) => void; errors: Record<string, string> }) {
  const toggleComorbid = (item: string) => {
    let next = [...data.comorbidities];
    if (next.includes(item)) {
      next = next.filter(i => i !== item);
      if (item === "Others") update({ comorbidities_other_text: null });
    } else {
      next.push(item);
    }
    update({ comorbidities: next });
  };

  function selectCategory(cat: DiseaseCategory) {
    update({
      disease_category: cat,
      ild_subtype: "", ild_other_text: "", is_fibrotic: null,
      oad_diagnosis: "", oad_other_text: "",
      bronchiectasis_cause: "", bronchiectasis_other_text: "",
      posticu_cause: "", posticu_other_text: "",
      // Also sync legacy field
      primary_diagnosis: cat === "ILD" ? "ild" : cat === "OAD" ? (() => {
        const d = (data.oad_diagnosis ?? "").toLowerCase();
        if (d.includes("bronchiolitis")) return "asthma";
        if (d.includes("overlap") || d.includes("aco") || (d.includes("asthma") && d.includes("copd"))) return "copd";
        if (d.includes("asthma") && !d.includes("copd")) return "asthma";
        return "copd";
      })() : cat === "Bronchiectasis" ? "bronchiectasis" : cat === "Post ICU Recovery" ? "post_icu" : "",
    });
  }

  const summary = getDiagnosisSummary(data);

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Clinical Diagnosis</h2>
        <p className={styles.stepDesc}>Select the primary disease category and specify the diagnosis.</p>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Disease Category</p>
        <div className={styles.diagCatGrid}>
          {(["ILD", "OAD", "Bronchiectasis", "Post ICU Recovery"] as DiseaseCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.diagCatBtn} ${data.disease_category === cat ? styles.diagCatActive : ""}`}
              onClick={() => selectCategory(cat)}
            >
              {cat === "OAD" ? "Obstructive Airway Disease (OAD)" : cat}
            </button>
          ))}
        </div>
        {errors["primary_diagnosis"] && <p className={styles.fieldError} style={{ marginTop: 8 }}><AlertCircle size={11} /> {errors["primary_diagnosis"]}</p>}
      </div>

      {/* ILD sub-fields */}
      {data.disease_category === "ILD" && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>ILD Details</p>
          <div className={styles.grid2}>
            <Field label="ILD Sub-type">
              <select className={styles.select} value={data.ild_subtype} onChange={e => update({ ild_subtype: e.target.value, ild_other_text: "" })}>
                <option value="">- Select sub-type -</option>
                {ILD_SUBTYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {data.ild_subtype === "Others" && (
              <Field label="Specify ILD type">
                <input className={styles.input} placeholder="Enter ILD type" value={data.ild_other_text} onChange={e => update({ ild_other_text: e.target.value })} />
              </Field>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Fibrotic ILD?">
              <div className={styles.radioGroup}>
                {([true, false] as const).map(val => (
                  <label key={String(val)} className={styles.radioItem}>
                    <input type="radio" className={styles.radioInput} name="isFibrotic" checked={data.is_fibrotic === val} onChange={() => update({ is_fibrotic: val })} />
                    <span className={styles.radioLabel}>{val ? "Yes" : "No"}</span>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </div>
      )}

      {/* OAD sub-fields */}
      {data.disease_category === "OAD" && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>OAD Details</p>
          <div className={styles.grid2}>
            <Field label="Specific Diagnosis">
              <select className={styles.select} value={data.oad_diagnosis} onChange={e => update({ oad_diagnosis: e.target.value, oad_other_text: "" })}>
                <option value="">- Select diagnosis -</option>
                {OAD_DIAGNOSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {data.oad_diagnosis === "Other OAD" && (
              <Field label="Specify OAD diagnosis">
                <input className={styles.input} placeholder="Enter diagnosis" value={data.oad_other_text} onChange={e => update({ oad_other_text: e.target.value })} />
              </Field>
            )}
          </div>
        </div>
      )}

      {/* Bronchiectasis sub-fields */}
      {data.disease_category === "Bronchiectasis" && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Bronchiectasis Details</p>
          <div className={styles.grid2}>
            <Field label="Cause">
              <select className={styles.select} value={data.bronchiectasis_cause} onChange={e => update({ bronchiectasis_cause: e.target.value, bronchiectasis_other_text: "" })}>
                <option value="">- Select cause -</option>
                {BRONCHIECTASIS_CAUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {data.bronchiectasis_cause === "Other" && (
              <Field label="Specify cause">
                <input className={styles.input} placeholder="Enter cause" value={data.bronchiectasis_other_text} onChange={e => update({ bronchiectasis_other_text: e.target.value })} />
              </Field>
            )}
          </div>
        </div>
      )}

      {/* Post ICU sub-fields */}
      {data.disease_category === "Post ICU Recovery" && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Post ICU Recovery Details</p>
          <p className={styles.cardSub}>Specific diagnosis secondary to respiratory cause</p>
          <div className={styles.grid2}>
            <Field label="Cause">
              <select className={styles.select} value={data.posticu_cause} onChange={e => update({ posticu_cause: e.target.value, posticu_other_text: "" })}>
                <option value="">- Select cause -</option>
                {POSTICU_CAUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {data.posticu_cause === "Other cause" && (
              <Field label="Specify cause">
                <input className={styles.input} placeholder="Enter cause" value={data.posticu_other_text} onChange={e => update({ posticu_other_text: e.target.value })} />
              </Field>
            )}
          </div>
        </div>
      )}

      {/* Diagnosis summary */}
      {data.disease_category && (
        <div className={styles.summaryCard}>
          <Check size={14} color="var(--med-blue-600)" />
          <div>
            <p className={styles.summaryLabel}>Diagnosis Summary</p>
            <p className={styles.summaryValue}>{summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Step 3: Co-morbidities ----------------------------------------------------
function StepComorbidities({ data, update }: { data: FormData; update: (d: Partial<FormData>) => void }) {
  const isNone = data.comorbidities.includes("None");

  const toggleNone = () => {
    // If None is already selected or nothing selected, deselect
    if (data.comorbidities.includes("None")) {
      update({ comorbidities: [] });
    } else {
      // Select None, clear everything else
      update({ comorbidities: ["None"], comorbidities_other_text: null });
    }
  };

  const toggleComorbid = (item: string) => {
    // Clicking any real condition removes "None"
    let next = [...data.comorbidities].filter(i => i !== "None");
    if (next.includes(item)) {
      next = next.filter(i => i !== item);
      if (item === "Others") update({ comorbidities_other_text: null });
    } else {
      next.push(item);
    }
    update({ comorbidities: next });
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Co-morbidities</h2>
        <p className={styles.stepDesc}>Select all associated conditions that apply to this patient.</p>
      </div>
      <div className={styles.card}>
        <p className={styles.cardTitle}>Associated Conditions</p>
        <p className={styles.cardSub}>Select all that apply</p>

        {/* NONE option - shown prominently at top */}
        <button
          type="button"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderRadius: 8, marginBottom: 12,
            border: isNone ? "1.5px solid var(--med-blue-600)" : "1.5px solid #d1d5db",
            background: isNone ? "#f0fdf4" : "#fff",
            color: isNone ? "var(--med-blue-600)" : "#374151",
            fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", width: "100%", textAlign: "left",
          }}
          onClick={toggleNone}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            border: isNone ? "1.5px solid var(--med-blue-600)" : "1.5px solid #9ca3af",
            background: isNone ? "var(--med-blue-600)" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {isNone && <Check size={11} strokeWidth={3} color="white" />}
          </div>
          None - No co-morbidities
        </button>

        {/* Condition list - greyed when None is selected */}
        <div className={styles.comorbidGrid} style={{ opacity: isNone ? 0.4 : 1, pointerEvents: isNone ? "none" : "auto" }}>
          {COMORBIDITIES.map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.comorbidItem} ${data.comorbidities.includes(item) ? styles.comorbidActive : ""}`}
              onClick={() => toggleComorbid(item)}
            >
              <div className={`${styles.cbBox} ${data.comorbidities.includes(item) ? styles.cbChecked : ""}`}>
                {data.comorbidities.includes(item) && <Check size={9} strokeWidth={3} color="white" />}
              </div>
              {item}
            </button>
          ))}
        </div>
        {data.comorbidities.includes("Others") && (
          <div style={{ marginTop: 16 }}>
            <Field label="Specify other condition" error={undefined}>
              <input className={styles.input} placeholder="Enter condition name" value={data.comorbidities_other_text || ""} onChange={e => update({ comorbidities_other_text: e.target.value || null })} />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Step 4: PFT Records -------------------------------------------------------
function flag(val: number | null, threshold: number) {
  return val !== null && val < threshold;
}

function StepPFT({ data, update, errors, isEdit }: { data: FormData; update: (d: Partial<FormData>) => void; errors: Record<string, string>; isEdit?: boolean }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    date: "", fvc: "", fev1: "", ratio: "", dlco: "",
    fev1_pct_pred: "", fvc_pct_pred: "", six_mwd: "", min_spo2: "", max_spo2: "",
  });

  const saveRecord = () => {
    if (!draft.date) return;
    const rec = {
      _clientId: Date.now(),
      test_date: draft.date,
      fvc: draft.fvc !== "" ? parseFloat(draft.fvc) : null,
      fev1: draft.fev1 !== "" ? parseFloat(draft.fev1) : null,
      fev1_fvc_ratio: draft.ratio !== "" ? parseFloat(draft.ratio) : null,
      dlco: draft.dlco !== "" ? parseFloat(draft.dlco) : null,
      // Extra fields stored in other_fields
      fev1_pct_pred: draft.fev1_pct_pred || null,
      fvc_pct_pred: draft.fvc_pct_pred || null,
      six_mwd: draft.six_mwd || null,
      min_spo2: draft.min_spo2 || null,
      max_spo2: draft.max_spo2 || null,
    };
    update({ pft_records: [...data.pft_records, rec] });
    setDraft({ date: "", fvc: "", fev1: "", ratio: "", dlco: "", fev1_pct_pred: "", fvc_pct_pred: "", six_mwd: "", min_spo2: "", max_spo2: "" });
    setAdding(false);
  };

  const removeRow = (id: number) => update({ pft_records: data.pft_records.filter(r => r._clientId !== id) });

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>PFT &amp; Baseline Vitals</h2>
        <p className={styles.stepDesc}>Record baseline vitals and optional pulmonary function / spirometry results.</p>
      </div>

      {/* Card 1: Baseline Vitals */}
      <div className={styles.card} style={{ marginBottom: 18 }}>
        <div className={styles.cardTitleRow}>
          <div>
            <p className={styles.cardTitle} style={{ margin: 0 }}>
              Patient Baseline Vitals
            </p>
            <p className={styles.cardSub} style={{ margin: "4px 0 0" }}>
              {isEdit
                ? "Existing baseline values are displayed below (edit only if updated vitals are needed)."
                : "Required for daily vitals drop calculations and alert monitoring."}
            </p>
          </div>
          {isEdit ? (
            <span className={styles.reviewBadge} style={{ background: "#f1f5f9", color: "#475569" }}>
              Recorded Baseline
            </span>
          ) : (
            <span className={styles.reviewBadge} style={{ background: "#fee2e2", color: "#b91c1c" }}>
              * Required
            </span>
          )}
        </div>

        <div className={styles.grid2}>
          <Field label="Baseline SpO2 (%)" required={!isEdit} error={errors["baseline_spo2"]}>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={`${styles.input} ${isEdit ? styles.subtleValueInput : ""} ${errors["baseline_spo2"] ? styles.inputError : ""}`}
                placeholder="96"
                value={data.baseline_spo2}
                onChange={(e) => update({ baseline_spo2: e.target.value })}
              />
              <span className={styles.subtleRefTag}>% SpO₂</span>
            </div>
          </Field>
          <Field label="Baseline Heart Rate (bpm)" required={!isEdit} error={errors["baseline_heart_rate"]}>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min="20"
                max="250"
                step="1"
                className={`${styles.input} ${isEdit ? styles.subtleValueInput : ""} ${errors["baseline_heart_rate"] ? styles.inputError : ""}`}
                placeholder="78"
                value={data.baseline_heart_rate}
                onChange={(e) => update({ baseline_heart_rate: e.target.value })}
              />
              <span className={styles.subtleRefTag}>bpm</span>
            </div>
          </Field>
        </div>
      </div>

      {/* Card 2: PFT Records */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <div>
            <p className={styles.cardTitle} style={{ margin: 0 }}>
              Pulmonary Function Tests ({data.pft_records.length} entries)
            </p>
            <p className={styles.cardSub} style={{ margin: "4px 0 0" }}>
              Optional — spirometry, DLCO, and 6-minute walk test records.
            </p>
          </div>
          {!adding && (
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => setAdding(true)}
            >
              + Add PFT Record
            </button>
          )}
        </div>

        {adding && (
          <div className={styles.addRowForm}>
            <p className={styles.addRowTitle}>New PFT Record</p>
            <div className={styles.addRowGrid}>
              <Field label="Test Date" required>
                <input
                  type="date"
                  className={styles.input}
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </Field>
              <Field label="FEV1/FVC (%)">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="e.g. 75.0"
                  value={draft.ratio}
                  onChange={(e) => setDraft({ ...draft, ratio: e.target.value })}
                />
              </Field>
              <Field label="FEV1 (Liters)">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="e.g. 2.4"
                  value={draft.fev1}
                  onChange={(e) => {
                    const val = e.target.value;
                    const f1 = parseFloat(val);
                    const fc = parseFloat(draft.fvc);
                    let ratio = draft.ratio;
                    if (!isNaN(f1) && !isNaN(fc) && fc > 0) {
                      ratio = ((f1 / fc) * 100).toFixed(1);
                    }
                    setDraft({ ...draft, fev1: val, ratio });
                  }}
                />
              </Field>
              <Field label="FEV1 (% Predicted)">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="-"
                  value={draft.fev1_pct_pred}
                  onChange={(e) => setDraft({ ...draft, fev1_pct_pred: e.target.value })}
                />
              </Field>
              <Field label="FVC (Liters)">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="e.g. 3.2"
                  value={draft.fvc}
                  onChange={(e) => {
                    const val = e.target.value;
                    const fc = parseFloat(val);
                    const f1 = parseFloat(draft.fev1);
                    let ratio = draft.ratio;
                    if (!isNaN(f1) && !isNaN(fc) && fc > 0) {
                      ratio = ((f1 / fc) * 100).toFixed(1);
                    }
                    setDraft({ ...draft, fvc: val, ratio });
                  }}
                />
              </Field>
              <Field label="FVC (% Predicted)">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="-"
                  value={draft.fvc_pct_pred}
                  onChange={(e) => setDraft({ ...draft, fvc_pct_pred: e.target.value })}
                />
              </Field>
              <Field label="DLCO (% Predicted)">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="-"
                  value={draft.dlco}
                  onChange={(e) => setDraft({ ...draft, dlco: e.target.value })}
                />
              </Field>
              <Field label="6MWD (m)">
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  className={styles.input}
                  placeholder="-"
                  value={draft.six_mwd}
                  onChange={(e) => setDraft({ ...draft, six_mwd: e.target.value })}
                />
              </Field>
              <Field label="Baseline SpO2 (%)">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="-"
                  value={draft.max_spo2}
                  onChange={(e) => setDraft({ ...draft, max_spo2: e.target.value })}
                />
              </Field>
              <Field label="Minimum SpO2 (%)">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="-"
                  value={draft.min_spo2}
                  onChange={(e) => setDraft({ ...draft, min_spo2: e.target.value })}
                />
              </Field>
            </div>
            <div className={styles.addRowActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={saveRecord}
                disabled={!draft.date}
              >
                Add Record
              </button>
            </div>
          </div>
        )}

        {data.pft_records.length === 0 ? (
          <div className={styles.emptyPftState}>
            <Activity size={22} className={styles.emptyPftIcon} />
            <p className={styles.emptyPftTitle}>No PFT Records Added</p>
            <p className={styles.emptyPftSub}>
              Pulmonary function tests are optional. Click &quot;+ Add PFT Record&quot; to log spirometry or DLCO test results.
            </p>
          </div>
        ) : (
          <div className={styles.medTableWrap}>
            <table className={styles.medTable}>
              <thead>
                <tr>
                  <th>Test Date</th>
                  <th>FEV1/FVC %</th>
                  <th>FEV1 (L)</th>
                  <th>FEV1 %pred</th>
                  <th>FVC (L)</th>
                  <th>FVC %pred</th>
                  <th>DLCO %</th>
                  <th>6MWD</th>
                  <th>Baseline SpO2</th>
                  <th>Min SpO2</th>
                  <th style={{ width: 44, textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {data.pft_records.map((r) => {
                  const ext = r as typeof r & {
                    fev1_pct_pred?: string | null;
                    fvc_pct_pred?: string | null;
                    six_mwd?: string | null;
                    min_spo2?: string | null;
                    max_spo2?: string | null;
                    baseline_spo2?: string | null;
                  };
                  return (
                    <tr key={r._clientId}>
                      <td className={styles.medDateText}>{r.test_date}</td>
                      <td className={flag(r.fev1_fvc_ratio, 70) ? styles.abnormal : ""}>
                        {r.fev1_fvc_ratio !== null ? `${r.fev1_fvc_ratio}%` : "—"}
                      </td>
                      <td className={flag(r.fev1, 0.8) ? styles.abnormal : ""}>
                        {r.fev1 !== null ? `${r.fev1} L` : "—"}
                      </td>
                      <td>{ext.fev1_pct_pred ? `${ext.fev1_pct_pred}%` : "—"}</td>
                      <td className={flag(r.fvc, 0.8) ? styles.abnormal : ""}>
                        {r.fvc !== null ? `${r.fvc} L` : "—"}
                      </td>
                      <td>{ext.fvc_pct_pred ? `${ext.fvc_pct_pred}%` : "—"}</td>
                      <td className={flag(r.dlco, 60) ? styles.abnormal : ""}>
                        {r.dlco !== null ? `${r.dlco}%` : "—"}
                      </td>
                      <td>{ext.six_mwd ? `${ext.six_mwd} m` : "—"}</td>
                      <td>{ext.max_spo2 || ext.baseline_spo2 ? `${ext.max_spo2 || ext.baseline_spo2}%` : "—"}</td>
                      <td>{ext.min_spo2 ? `${ext.min_spo2}%` : "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className={styles.removeMedBtn}
                          onClick={() => removeRow(r._clientId)}
                          title="Remove record"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Step 4: Respiratory Support -----------------------------------------------
function StepRespSupport({ data, update }: { data: FormData; update: (d: Partial<FormData>) => void }) {
  const rs = data.respiratory_support;
  const updateRS = (updates: Partial<typeof rs>) => update({ respiratory_support: { ...rs, ...updates } });

  const [activeTab, setActiveTab] = useState("LTOT");
  const TABS = ["LTOT", "BiPAP / NIV", "Invasive Vent", "Tracheostomy"];

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Respiratory Support</h2>
      </div>
      <div className={styles.card}>
        <p className={styles.cardTitle}>Does this patient require respiratory support?</p>
        <div className={styles.radioGroup} style={{ marginTop: 12 }}>
          {["Yes", "No"].map((v) => (
            <label key={v} className={`${styles.radioItem} ${styles.radioLarge}`}>
              <input type="radio" value={v} checked={rs.requires_support === (v === "Yes")}
                onChange={() => updateRS({ requires_support: v === "Yes" })} className={styles.radioInput} />
              <span className={styles.radioLabel}>{v}</span>
            </label>
          ))}
        </div>

        {rs.requires_support && (
          <div style={{ marginTop: 24 }}>
            <div className={styles.tabRow}>
              {TABS.map((t) => (
                <button key={t} type="button" className={`${styles.tabBtn} ${activeTab === t ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab(t)}>
                  {t}
                </button>
              ))}
            </div>

            {activeTab === "LTOT" && (
              <div style={{ marginTop: 16 }}>
                <label className={styles.radioItem} style={{ marginBottom: 16 }}>
                  <input type="checkbox" checked={rs.ltot_enabled} onChange={e => updateRS({ ltot_enabled: e.target.checked })} />
                  <span className={styles.radioLabel}>Enable LTOT</span>
                </label>
                {rs.ltot_enabled && (
                  <div className={styles.grid2}>
                    <Field label="O2 Litres"><input type="number" step="0.5" className={styles.input} value={rs.ltot_litres ?? ""} onChange={e => updateRS({ ltot_litres: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                  </div>
                )}
              </div>
            )}

            {activeTab === "BiPAP / NIV" && (
              <div style={{ marginTop: 16 }}>
                <label className={styles.radioItem} style={{ marginBottom: 16 }}>
                  <input type="checkbox" checked={rs.bipap_enabled} onChange={e => updateRS({ bipap_enabled: e.target.checked })} />
                  <span className={styles.radioLabel}>Enable BiPAP</span>
                </label>
                {rs.bipap_enabled && (
                  <div className={styles.grid2}>
                    <Field label="Requires Oxygen?">
                      <input type="checkbox" checked={rs.bipap_requires_oxygen} onChange={e => updateRS({ bipap_requires_oxygen: e.target.checked })} />
                    </Field>
                    {rs.bipap_requires_oxygen && <Field label="O2 Litres"><input type="number" step="0.5" className={styles.input} value={rs.bipap_oxygen_litres ?? ""} onChange={e => updateRS({ bipap_oxygen_litres: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>}
                    <Field label="IPAP"><input type="number" className={styles.input} value={rs.bipap_ipap ?? ""} onChange={e => updateRS({ bipap_ipap: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                    <Field label="EPAP"><input type="number" className={styles.input} value={rs.bipap_epap ?? ""} onChange={e => updateRS({ bipap_epap: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                    <Field label="Pressure Support"><input type="number" className={styles.input} value={rs.bipap_pressure_support ?? ""} onChange={e => updateRS({ bipap_pressure_support: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                    <Field label="Respiratory Rate"><input type="number" className={styles.input} value={rs.bipap_respiratory_rate ?? ""} onChange={e => updateRS({ bipap_respiratory_rate: e.target.value !== "" ? parseInt(e.target.value) : null })} /></Field>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Invasive Vent" && (
              <div style={{ marginTop: 16 }}>
                <label className={styles.radioItem} style={{ marginBottom: 16 }}>
                  <input type="checkbox" checked={rs.invasive_vent_enabled} onChange={e => updateRS({ invasive_vent_enabled: e.target.checked })} />
                  <span className={styles.radioLabel}>Enable Invasive Vent</span>
                </label>
                {rs.invasive_vent_enabled && (
                  <div className={styles.grid2}>
                    <Field label="IPAP"><input type="number" className={styles.input} value={rs.vent_ipap ?? ""} onChange={e => updateRS({ vent_ipap: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                    <Field label="EPAP"><input type="number" className={styles.input} value={rs.vent_epap ?? ""} onChange={e => updateRS({ vent_epap: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                    <Field label="Pressure Support"><input type="number" className={styles.input} value={rs.vent_pressure_support ?? ""} onChange={e => updateRS({ vent_pressure_support: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                    <Field label="Respiratory Rate"><input type="number" className={styles.input} value={rs.vent_respiratory_rate ?? ""} onChange={e => updateRS({ vent_respiratory_rate: e.target.value !== "" ? parseInt(e.target.value) : null })} /></Field>
                    <Field label="FiO2 %"><input type="number" className={styles.input} value={rs.vent_fio2_percent ?? ""} onChange={e => updateRS({ vent_fio2_percent: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Tracheostomy" && (
              <div style={{ marginTop: 16 }}>
                <label className={styles.radioItem} style={{ marginBottom: 16 }}>
                  <input type="checkbox" checked={rs.tracheostomy_enabled} onChange={e => updateRS({ tracheostomy_enabled: e.target.checked })} />
                  <span className={styles.radioLabel}>Enable Tracheostomy</span>
                </label>
                {rs.tracheostomy_enabled && (
                  <div className={styles.grid2}>
                    <Field label="For airway patency?"><input type="checkbox" checked={rs.trach_for_airway_patency} onChange={e => updateRS({ trach_for_airway_patency: e.target.checked })} /></Field>
                    <Field label="Requires Oxygen?"><input type="checkbox" checked={rs.trach_requires_oxygen} onChange={e => updateRS({ trach_requires_oxygen: e.target.checked })} /></Field>
                    {rs.trach_requires_oxygen && <Field label="O2 Litres"><input type="number" step="0.5" className={styles.input} value={rs.trach_oxygen_litres ?? ""} onChange={e => updateRS({ trach_oxygen_litres: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>}
                    <Field label="Requires Vent?"><input type="checkbox" checked={rs.trach_requires_vent} onChange={e => updateRS({ trach_requires_vent: e.target.checked })} /></Field>
                    {rs.trach_requires_vent && (
                      <>
                        <Field label="Vent IPAP"><input type="number" className={styles.input} value={rs.trach_vent_ipap ?? ""} onChange={e => updateRS({ trach_vent_ipap: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                        <Field label="Vent EPAP"><input type="number" className={styles.input} value={rs.trach_vent_epap ?? ""} onChange={e => updateRS({ trach_vent_epap: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                        <Field label="Pressure Support"><input type="number" className={styles.input} value={rs.trach_vent_pressure_support ?? ""} onChange={e => updateRS({ trach_vent_pressure_support: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                        <Field label="Respiratory Rate"><input type="number" className={styles.input} value={rs.trach_vent_respiratory_rate ?? ""} onChange={e => updateRS({ trach_vent_respiratory_rate: e.target.value !== "" ? parseInt(e.target.value) : null })} /></Field>
                        <Field label="Tidal Volume"><input type="number" className={styles.input} value={rs.trach_vent_tidal_volume ?? ""} onChange={e => updateRS({ trach_vent_tidal_volume: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                        <Field label="FiO2 %"><input type="number" className={styles.input} value={rs.trach_vent_fio2_percent ?? ""} onChange={e => updateRS({ trach_vent_fio2_percent: e.target.value !== "" ? parseFloat(e.target.value) : null })} /></Field>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// -- Step 5: Medications -------------------------------------------------------
const RTE_OPTS = [
  { v: "inj", l: "Injection" }, { v: "tablet", l: "Tablet" }, { v: "capsule", l: "Capsule" },
  { v: "nebulisation", l: "Nebulisation" }, { v: "inhaler", l: "Inhaler" }, { v: "nasal_spray", l: "Nasal Spray" }
];
const FREQUENCY_OPTS = ["OD", "BD", "TDS", "Once a week", "Once in 15 days", "Once a month", "Every 6 months"];
const PATIENT_INSTRUCTION_WORD_LIMIT = 50;

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function StepMedications({ data, update }: { data: FormData; update: (d: Partial<FormData>) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ route: "tablet", name: "", dose: "", unit: "mg", frequency: "OD", start: "", end: "", durationDays: "", ongoing: false, prescriptionDate: new Date().toISOString().split("T")[0] as string, patientInstruction: "" });

  const handleDurationChange = (daysStr: string) => {
    const days = parseInt(daysStr, 10);
    if (!isNaN(days) && days > 0 && draft.start) {
      const d = new Date(draft.start);
      d.setDate(d.getDate() + days);
      setDraft({ ...draft, durationDays: daysStr, end: d.toISOString().split('T')[0]!, ongoing: false });
    } else {
      setDraft({ ...draft, durationDays: daysStr });
    }
  };

  const handleStartChange = (start: string) => {
    let nextEnd = draft.end;
    const days = parseInt(draft.durationDays, 10);
    if (!isNaN(days) && days > 0 && start) {
      const d = new Date(start);
      d.setDate(d.getDate() + days);
      nextEnd = d.toISOString().split('T')[0]!;
    }
    setDraft({ ...draft, start, end: nextEnd, ongoing: nextEnd ? false : draft.ongoing });
  };

  const saveMed = () => {
    if (!draft.name || !draft.start) return;
    if (countWords(draft.patientInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT) return;
    const r = {
      _clientId: Date.now(),
      route: draft.route as FormData["medications"][number]["route"],
      drug_name: draft.name,
      dose: draft.dose !== "" ? parseFloat(draft.dose) : null,
      dose_unit: draft.unit,
      frequency: draft.frequency,
      start_date: draft.start,
      end_date: draft.ongoing ? null : (draft.end || null),
      prescription_date: draft.prescriptionDate || draft.start,
      patient_instruction: draft.patientInstruction.trim() || null,
    };
    update({ medications: [...data.medications, r] });
    setDraft({ route: "tablet", name: "", dose: "", unit: "mg", frequency: "OD", start: "", end: "", durationDays: "", ongoing: false, prescriptionDate: new Date().toISOString().split("T")[0] as string, patientInstruction: "" });
    setAdding(false);
  };

  const removeMed = (id: number) => update({ medications: data.medications.filter(m => m._clientId !== id) });

  const toggleDiscontinueMed = (id: number) => {
    const today = new Date().toISOString().split("T")[0]!;
    update({
      medications: data.medications.map(m => {
        if (m._clientId !== id) return m;
        const isDiscontinued = Boolean(m.end_date && m.end_date <= today);
        return {
          ...m,
          end_date: isDiscontinued ? null : today,
        };
      })
    });
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Medications</h2>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <p className={styles.cardTitle}>Active Prescriptions</p>
          {!adding && <button type="button" className={styles.btnOutline} onClick={() => setAdding(true)}>+ Add Medication</button>}
        </div>

        {adding && (
          <div className={styles.addRowForm}>
            <p className={styles.addRowTitle}>New Medication</p>
            <div className={styles.addMedGrid}>
              <Field label="Medication Type" required>
                <select className={styles.select} value={draft.route} onChange={e => setDraft({ ...draft, route: e.target.value })}>
                  {RTE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Drug Name" required>
                <MedicationAutocompleteInput
                  value={draft.name}
                  placeholder="e.g. Foracort, Budecort"
                  className={styles.input}
                  onChange={(val) => setDraft({ ...draft, name: val })}
                  onSelectPreset={(preset) => {
                    const updates: Partial<typeof draft> = { name: preset.name };
                    if (RTE_OPTS.some(o => o.v === preset.defaultRoute)) {
                      updates.route = preset.defaultRoute;
                    }
                    setDraft({ ...draft, ...updates });
                  }}
                />
              </Field>
              <Field label="Dose">
                <input type="number" step="0.1" className={styles.input} value={draft.dose} onChange={e => setDraft({ ...draft, dose: e.target.value })} />
              </Field>
              <Field label="Unit">
                <select className={styles.select} value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })}>
                  {["mg", "mcg", "ml", "puffs", "units", "other"].map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Frequency" required>
                <select className={styles.select} value={draft.frequency} onChange={e => setDraft({ ...draft, frequency: e.target.value })}>
                  {FREQUENCY_OPTS.map(frequency => <option key={frequency}>{frequency}</option>)}
                </select>
              </Field>
              <Field label="Prescription Date" required>
                <input type="date" className={styles.input} value={draft.prescriptionDate} onChange={e => setDraft({ ...draft, prescriptionDate: e.target.value })} />
              </Field>
              <Field label="Start Date" required>
                <input type="date" className={styles.input} value={draft.start} onChange={e => handleStartChange(e.target.value)} />
              </Field>
              <Field label="Duration (days)">
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  className={styles.input}
                  value={draft.durationDays}
                  onChange={e => handleDurationChange(e.target.value)}
                />
              </Field>
              <div className={styles.field}>
                <label className={styles.label}>End Date</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="date" className={styles.input} value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} disabled={draft.ongoing} />
                  <label style={{ display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={draft.ongoing} onChange={e => setDraft({ ...draft, ongoing: e.target.checked })} /> Ongoing
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.instructionField}>
              <div className={styles.instructionHeader}>
                <label className={styles.label} htmlFor="patient-instruction">Patient Instructions</label>
                <span className={countWords(draft.patientInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT ? styles.wordCountError : styles.wordCount}>
                  {countWords(draft.patientInstruction)}/{PATIENT_INSTRUCTION_WORD_LIMIT} words
                </span>
              </div>
              <textarea
                id="patient-instruction"
                className={styles.textarea}
                rows={3}
                value={draft.patientInstruction}
                onChange={e => setDraft({ ...draft, patientInstruction: e.target.value })}
                placeholder="Write short guidance for the patient dashboard..."
              />
            </div>
            <div className={styles.addRowActions}>
              <button type="button" className={styles.btnGhost} onClick={() => { setDraft({ route: "tablet", name: "", dose: "", unit: "mg", frequency: "OD", start: "", end: "", durationDays: "", ongoing: false, prescriptionDate: new Date().toISOString().split("T")[0] as string, patientInstruction: "" }); setAdding(false); }}>Cancel</button>
              <button type="button" className={styles.btnPrimary} onClick={saveMed} disabled={countWords(draft.patientInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT}>Add Medication</button>
            </div>
          </div>
        )}

        {data.medications.length === 0 ? (
          <div className={styles.emptyMedState}>
            <Pill size={24} className={styles.emptyMedIcon} />
            <p className={styles.emptyMedTitle}>No active prescriptions added yet</p>
            <p className={styles.emptyMedSub}>Click &quot;+ Add Medication&quot; above to prescribe medications for this patient.</p>
          </div>
        ) : (
          <div className={styles.medTableWrap}>
            <table className={styles.medTable}>
              <thead>
                <tr>
                  <th>Medication Type</th>
                  <th>Drug Name</th>
                  <th>Dose</th>
                  <th>Frequency</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th style={{ width: 140, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.medications.map((m) => {
                  const today = new Date().toISOString().split("T")[0]!;
                  const isDiscontinued = Boolean(m.end_date && m.end_date <= today);

                  return (
                    <tr key={m._clientId} style={{ opacity: isDiscontinued ? 0.75 : 1, background: isDiscontinued ? "#fdecea" : undefined }}>
                      <td>
                        <span className={styles.routeBadge}>{RTE_OPTS.find(r => r.v === m.route)?.l ?? m.route}</span>
                      </td>
                      <td className={styles.medDrugName} style={{ textDecoration: isDiscontinued ? "line-through" : "none" }}>
                        {m.drug_name}
                      </td>
                      <td>{m.dose !== null ? `${m.dose} ${m.dose_unit || ""}` : "—"}</td>
                      <td><span className={styles.freqBadge}>{m.frequency}</span></td>
                      <td className={styles.medDateText}>{m.start_date}</td>
                      <td className={styles.medDateText}>
                        {isDiscontinued ? (
                          <span style={{ color: "#dc2626", fontWeight: 700 }}>Discontinued ({m.end_date})</span>
                        ) : (
                          m.end_date || "Ongoing"
                        )}
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => toggleDiscontinueMed(m._clientId)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "none",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              background: isDiscontinued ? "#0284c7" : "#ef4444",
                              color: "#ffffff",
                            }}
                            title={isDiscontinued ? "Resume medication" : "Discontinue medication"}
                          >
                            {isDiscontinued ? "Resume" : "Discontinue"}
                          </button>
                          <button
                            type="button"
                            className={styles.removeMedBtn}
                            onClick={() => removeMed(m._clientId)}
                            title="Remove medication"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Step 7: Review ------------------------------------------------------------
function StepReview({ data, isEdit, onJumpToStep }: { data: FormData; isEdit?: boolean; onJumpToStep?: (step: number) => void }) {
  const summary = getDiagnosisSummary(data);

  return (
    <div className={styles.stepContent}>
      <div className={styles.reviewContainer}>
        {/* Header Summary Banner */}
        <div className={styles.reviewHeaderBar}>
          <div>
            <h2 className={styles.reviewHeaderTitle}>
              {isEdit ? "Review & Confirm Patient Updates" : "Review & Confirm Patient Registration"}
            </h2>
            <p className={styles.reviewHeaderSubtitle}>
              Please verify all demographics, clinical diagnosis, respiratory settings, and medications below.
            </p>
          </div>
          <span className={styles.reviewStatusBadge}>
            <Check size={14} strokeWidth={2.5} />
            <span>Ready to Save</span>
          </span>
        </div>

        <div className={styles.reviewGrid}>
          {/* Card 1: Demographics */}
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHeader} style={{ background: "#f0f9ff" }}>
              <div className={styles.reviewCardHeaderLeft}>
                <div className={styles.reviewIconBox} style={{ background: "#0284c7", color: "#ffffff" }}>
                  <User size={16} />
                </div>
                <span className={styles.reviewCardTitle} style={{ color: "#0369a1" }}>
                  Personal Information
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {onJumpToStep && (
                  <button
                    type="button"
                    onClick={() => onJumpToStep(1)}
                    style={{ background: "none", border: "none", color: "#0369a1", fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    Edit
                  </button>
                )}
                <span className={styles.reviewBadge} style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  Step 1
                </span>
              </div>
            </div>
            <div className={styles.reviewCardBody}>
              <div className={styles.reviewInfoRow}>
                <span className={styles.reviewInfoLabel}>Full Name</span>
                <span className={styles.reviewInfoValue} style={{ fontSize: 14, color: "#0f172a" }}>
                  {data.name || "Missing Name"}
                </span>
              </div>
              <div className={styles.reviewBadgeRow}>
                {data.gender && (
                  <span className={styles.reviewBadge} style={{ background: "#f1f5f9", color: "#334155" }}>
                    {data.gender}
                  </span>
                )}
                {data.age && (
                  <span className={styles.reviewBadge} style={{ background: "#f1f5f9", color: "#334155" }}>
                    Age: {data.age} yrs
                  </span>
                )}
              </div>
              <div className={styles.reviewInfoRow}>
                <span className={styles.reviewInfoLabel}>Mobile</span>
                <span className={styles.reviewInfoValue}>{data.mobile_number || "—"}</span>
              </div>
              {data.alternate_mobile && (
                <div className={styles.reviewInfoRow}>
                  <span className={styles.reviewInfoLabel}>Alt Phone</span>
                  <span className={styles.reviewInfoValue}>{data.alternate_mobile}</span>
                </div>
              )}
              {data.emergency_contact_name && (
                <div className={styles.reviewInfoRow}>
                  <span className={styles.reviewInfoLabel}>Emergency Contact</span>
                  <span className={styles.reviewInfoValue}>
                    {data.emergency_contact_name} {data.emergency_contact_phone ? `(${data.emergency_contact_phone})` : ""}
                  </span>
                </div>
              )}
              <div className={styles.reviewInfoRow}>
                <span className={styles.reviewInfoLabel}>Occupation</span>
                <span className={styles.reviewInfoValue}>
                  {data.occupation === "Other" ? (data.other_occupation || "Other") : (data.occupation || "—")}
                </span>
              </div>
              {data.significant_exposure && (
                <div className={styles.reviewInfoRow}>
                  <span className={styles.reviewInfoLabel}>Illness Exposure</span>
                  <span className={styles.reviewInfoValue}>{data.significant_exposure}</span>
                </div>
              )}
              {data.smoking && (
                <div className={styles.reviewInfoRow}>
                  <span className={styles.reviewInfoLabel}>Smoking</span>
                  <span className={styles.reviewInfoValue}>
                    {data.smoking}{data.smoking === "Yes" && data.smoking_index ? ` (Index: ${data.smoking_index})` : ""}
                  </span>
                </div>
              )}
              {data.alcohol && (
                <div className={styles.reviewInfoRow}>
                  <span className={styles.reviewInfoLabel}>Alcohol</span>
                  <span className={styles.reviewInfoValue}>{data.alcohol}</span>
                </div>
              )}
              {data.past_history_selected && data.past_history_text && (
                <div className={styles.reviewInfoRow}>
                  <span className={styles.reviewInfoLabel}>Past History</span>
                  <span className={styles.reviewInfoValue}>
                    {data.past_history_text}{data.past_history_years_ago ? ` (${data.past_history_years_ago} yrs back)` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>


          {/* Card 2: Clinical Diagnosis */}
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHeader} style={{ background: "#f5f3ff" }}>
              <div className={styles.reviewCardHeaderLeft}>
                <div className={styles.reviewIconBox} style={{ background: "#7c3aed", color: "#ffffff" }}>
                  <Stethoscope size={16} />
                </div>
                <span className={styles.reviewCardTitle} style={{ color: "#6d28d9" }}>
                  Clinical Diagnosis
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {onJumpToStep && (
                  <button
                    type="button"
                    onClick={() => onJumpToStep(2)}
                    style={{ background: "none", border: "none", color: "#6d28d9", fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    Edit
                  </button>
                )}
                <span className={styles.reviewBadge} style={{ background: "#ede9fe", color: "#6d28d9" }}>
                  Step 2
                </span>
              </div>
            </div>
            <div className={styles.reviewCardBody}>
              <div className={styles.reviewDiagnosisBanner}>
                <p className={styles.reviewDiagnosisCategory}>{data.disease_category || "Category Unset"}</p>
                <p className={styles.reviewDiagnosisName}>{summary}</p>
              </div>

              <div>
                <span className={styles.reviewInfoLabel}>Comorbidities:</span>
                <div className={styles.reviewBadgeRow}>
                  {data.comorbidities.length === 0 ? (
                    <span className={styles.reviewBadge} style={{ background: "#f8fafc", color: "#64748b" }}>
                      None recorded
                    </span>
                  ) : (
                    data.comorbidities.map((c) => (
                      <span key={c} className={styles.reviewBadge} style={{ background: "#e0e7ff", color: "#3730a3" }}>
                        {c === "Others" && data.comorbidities_other_text ? data.comorbidities_other_text : c}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {data.diagnosed_at && (
                <div className={styles.reviewInfoRow}>
                  <span className={styles.reviewInfoLabel}>Diagnosed Date</span>
                  <span className={styles.reviewInfoValue}>{data.diagnosed_at}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Baseline & Respiratory Support */}
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHeader} style={{ background: "#fff1f2" }}>
              <div className={styles.reviewCardHeaderLeft}>
                <div className={styles.reviewIconBox} style={{ background: "#e11d48", color: "#ffffff" }}>
                  <Wind size={16} />
                </div>
                <span className={styles.reviewCardTitle} style={{ color: "#be123c" }}>
                  Vitals &amp; Respiratory Support
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {onJumpToStep && (
                  <button
                    type="button"
                    onClick={() => onJumpToStep(5)}
                    style={{ background: "none", border: "none", color: "#be123c", fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    Edit
                  </button>
                )}
                <span className={styles.reviewBadge} style={{ background: "#ffe4e6", color: "#be123c" }}>
                  Steps 3 &amp; 5
                </span>
              </div>
            </div>
            <div className={styles.reviewCardBody}>
              <div className={styles.reviewVitalsGrid}>
                <div className={styles.reviewVitalBox}>
                  <span className={styles.reviewVitalLabel}>Baseline SpO₂</span>
                  <span className={styles.reviewVitalValue} style={{ color: "#0284c7" }}>
                    {data.baseline_spo2 ? `${data.baseline_spo2}%` : "—"}
                  </span>
                </div>
                <div className={styles.reviewVitalBox}>
                  <span className={styles.reviewVitalLabel}>Baseline Heart Rate</span>
                  <span className={styles.reviewVitalValue} style={{ color: "#7c3aed" }}>
                    {data.baseline_heart_rate ? `${data.baseline_heart_rate} bpm` : "—"}
                  </span>
                </div>
              </div>

              <div className={styles.reviewInfoRow}>
                <span className={styles.reviewInfoLabel}>Respiratory Support:</span>
                <span
                  className={styles.reviewBadge}
                  style={{
                    background: data.respiratory_support.requires_support ? "#fee2e2" : "#ecfdf5",
                    color: data.respiratory_support.requires_support ? "#b91c1c" : "#047857",
                  }}
                >
                  {data.respiratory_support.requires_support ? "Support Required" : "No Support Required"}
                </span>
              </div>

              {data.respiratory_support.requires_support && (
                <div className={styles.reviewBadgeRow}>
                  {data.respiratory_support.ltot_enabled && (
                    <span className={styles.reviewBadge} style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                      LTOT: {data.respiratory_support.ltot_litres || 0} L/min
                    </span>
                  )}
                  {data.respiratory_support.bipap_enabled && (
                    <span className={styles.reviewBadge} style={{ background: "#fef3c7", color: "#b45309" }}>
                      BiPAP (IPAP: {data.respiratory_support.bipap_ipap || "-"} / EPAP: {data.respiratory_support.bipap_epap || "-"})
                    </span>
                  )}
                  {data.respiratory_support.invasive_vent_enabled && (
                    <span className={styles.reviewBadge} style={{ background: "#fce7f3", color: "#be185d" }}>
                      Invasive Vent
                    </span>
                  )}
                  {data.respiratory_support.tracheostomy_enabled && (
                    <span className={styles.reviewBadge} style={{ background: "#f3e8ff", color: "#7e22ce" }}>
                      Tracheostomy
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Pulmonary Function Tests */}
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHeader} style={{ background: "#fffbeb" }}>
              <div className={styles.reviewCardHeaderLeft}>
                <div className={styles.reviewIconBox} style={{ background: "#d97706", color: "#ffffff" }}>
                  <Activity size={16} />
                </div>
                <span className={styles.reviewCardTitle} style={{ color: "#b45309" }}>
                  Pulmonary Function Tests (PFT)
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {onJumpToStep && (
                  <button
                    type="button"
                    onClick={() => onJumpToStep(4)}
                    style={{ background: "none", border: "none", color: "#b45309", fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    Edit
                  </button>
                )}
                <span className={styles.reviewBadge} style={{ background: "#fef3c7", color: "#b45309" }}>
                  {data.pft_records.length} Record{data.pft_records.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className={styles.reviewCardBody}>
              {data.pft_records.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 12.5, margin: 0, fontStyle: "italic" }}>
                  No PFT or Spirometry records entered.
                </p>
              ) : (
                <table className={styles.reviewTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>FEV1/FVC</th>
                      <th>FEV1 (L)</th>
                      <th>FEV1 %pred</th>
                      <th>FVC (L)</th>
                      <th>FVC %pred</th>
                      <th>DLCO</th>
                      <th>6MWD</th>
                      <th>Baseline SpO2</th>
                      <th>Min SpO2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pft_records.map((r, i) => {
                      const ext = r as typeof r & {
                        fev1_pct_pred?: string | null;
                        fvc_pct_pred?: string | null;
                        six_mwd?: string | null;
                        min_spo2?: string | null;
                        max_spo2?: string | null;
                        baseline_spo2?: string | null;
                      };
                      return (
                        <tr key={i}>
                          <td>{r.test_date || "—"}</td>
                          <td>{r.fev1_fvc_ratio !== null ? `${r.fev1_fvc_ratio}%` : "—"}</td>
                          <td>{r.fev1 !== null ? `${r.fev1} L` : "—"}</td>
                          <td>{ext.fev1_pct_pred ? `${ext.fev1_pct_pred}%` : "—"}</td>
                          <td>{r.fvc !== null ? `${r.fvc} L` : "—"}</td>
                          <td>{ext.fvc_pct_pred ? `${ext.fvc_pct_pred}%` : "—"}</td>
                          <td>{r.dlco !== null ? `${r.dlco}%` : "—"}</td>
                          <td>{ext.six_mwd ? `${ext.six_mwd} m` : "—"}</td>
                          <td>{ext.max_spo2 || ext.baseline_spo2 ? `${ext.max_spo2 || ext.baseline_spo2}%` : "—"}</td>
                          <td>{ext.min_spo2 ? `${ext.min_spo2}%` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Card 5: Prescriptions & Medications */}
          <div className={styles.reviewCard} style={{ gridColumn: "1 / -1" }}>
            <div className={styles.reviewCardHeader} style={{ background: "#ecfdf5" }}>
              <div className={styles.reviewCardHeaderLeft}>
                <div className={styles.reviewIconBox} style={{ background: "#059669", color: "#ffffff" }}>
                  <Pill size={16} />
                </div>
                <span className={styles.reviewCardTitle} style={{ color: "#047857" }}>
                  Prescribed Medication Regimen
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {onJumpToStep && (
                  <button
                    type="button"
                    onClick={() => onJumpToStep(6)}
                    style={{ background: "none", border: "none", color: "#047857", fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    Edit
                  </button>
                )}
                <span className={styles.reviewBadge} style={{ background: "#d1fae5", color: "#047857" }}>
                  {data.medications.length} Prescribed
                </span>
              </div>
            </div>
            <div className={styles.reviewCardBody}>
              {data.medications.filter(m => !m.end_date || new Date(m.end_date) > new Date()).length === 0 ? (
                <p className={styles.emptyTableSub} style={{ margin: "4px 0" }}>
                  No active medications assigned yet.
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                  {data.medications
                    .filter(m => !m.end_date || new Date(m.end_date) > new Date())
                    .map((m, i) => (
                      <div key={i} className={styles.reviewMedCard}>
                        <div>
                          <p className={styles.reviewMedName}>{m.drug_name || "Unnamed Drug"}</p>
                          <p className={styles.reviewMedDetails}>
                            {m.dose ? `${m.dose} ${m.dose_unit || ""}` : ""} · {m.frequency || "As prescribed"}
                          </p>
                        </div>
                        <span className={styles.reviewBadge} style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                          {m.route || "Oral"} · Active
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Discontinued Medications Summary in Review */}
              {data.medications.some(m => m.end_date && new Date(m.end_date) <= new Date()) && (
                <div style={{ marginTop: 12, borderTop: "1px dashed #fecaca", paddingTop: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#dc2626" }}>
                    🔴 Discontinued / Stopped Medications (Excluded from active patient checklist):
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                    {data.medications
                      .filter(m => m.end_date && new Date(m.end_date) <= new Date())
                      .map((m, i) => (
                        <div key={i} className={styles.reviewMedCard} style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                          <div>
                            <p className={styles.reviewMedName} style={{ textDecoration: "line-through", color: "#991b1b" }}>{m.drug_name || "Unnamed Drug"}</p>
                            <p className={styles.reviewMedDetails} style={{ color: "#b91c1c" }}>
                              {m.dose ? `${m.dose} ${m.dose_unit || ""}` : ""} · Discontinued: {m.end_date}
                            </p>
                          </div>
                          <span className={styles.reviewBadge} style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }}>
                            Discontinued
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informative Notice Bar */}
        <div className={styles.reviewNoticeBox}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>
            Saving will register the patient account. A welcome onboarding SMS with login link will be automatically dispatched to the patient&apos;s mobile number if the SMS service is configured.
          </span>
        </div>
      </div>
    </div>
  );
}

export function CreatePatientView({ onBack, onDone, initialData, editPatientId }: { onBack: () => void, onDone: () => void, initialData?: FormData, editPatientId?: string }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>({ ...INIT_FORM_DATA, ...(initialData || {}) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (initialData) {
      setData((prev) => ({
        ...INIT_FORM_DATA,
        ...prev,
        ...initialData,
        respiratory_support: {
          ...INIT_FORM_DATA.respiratory_support,
          ...(prev.respiratory_support || {}),
          ...(initialData.respiratory_support || {}),
        },
      }));
    }
  }, [initialData]);

  const update = (updates: Partial<FormData>) => setData(prev => ({ ...prev, ...updates }));

  const handleSubmit = async () => {
    // Final validation before submit
    const finalErrors: Record<string, string> = {};
    if (!data.name.trim()) finalErrors["name"] = "Full name is required";
    if (!data.mobile_number || data.mobile_number.length !== 10) {
      finalErrors["mobile_number"] = "Mobile number must be exactly 10 digits";
    }
    if (!data.gender) finalErrors["gender"] = "Please select a sex";
    if (!data.age) finalErrors["age"] = "Age is required";
    if (!data.disease_category) finalErrors["primary_diagnosis"] = "Please select a disease category";
    if (!editPatientId) {
      if (!data.baseline_spo2) finalErrors["baseline_spo2"] = "Baseline SpO2 is required";
      if (!data.baseline_heart_rate) finalErrors["baseline_heart_rate"] = "Baseline Heart Rate is required";
    }
    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      setStep(Object.keys(finalErrors).some(k => ["baseline_spo2", "baseline_heart_rate"].includes(k)) ? 4 : 1);
      setSubmitError("Please complete all required fields before submitting.");
      return;
    }

    setSubmitting(true);
    setErrors({});
    setSubmitError("");
    try {
      // Build payload in the structure the API expects
      const payload = {
        basicInfo: {
          name: data.name,
          age: data.age,
          date_of_birth: data.age ? `${new Date().getFullYear() - Number(data.age)}-01-01` : "",
          mobile_number: data.mobile_number,
          alternate_mobile: data.alternate_mobile || null,
          gender: data.gender || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          occupation: data.occupation === "Other" ? (data.other_occupation || "Other") : (data.occupation || null),
          other_occupation: data.other_occupation || null,
          significant_exposure: data.significant_exposure || null,
          smoking: data.smoking || null,
          smoking_status: data.smoking || null,
          smoking_index: data.smoking === "Yes" ? (data.smoking_index || null) : null,
          alcohol: data.alcohol || null,
          alcohol_status: data.alcohol || null,
          past_history: data.past_history_selected ? (data.past_history_text || null) : null,
          past_history_years_ago: data.past_history_selected ? (data.past_history_years_ago || null) : null,
        },

        diagnosis: {
          primary_diagnosis: (
            data.disease_category === "ILD" ? "ild" :
              data.disease_category === "OAD" ? (() => {
                const d = (data.oad_diagnosis ?? "").toLowerCase();
                if (d.includes("bronchiolitis")) return "asthma";
                if (d.includes("overlap") || d.includes("aco") || (d.includes("asthma") && d.includes("copd"))) return "copd";
                if (d.includes("asthma") && !d.includes("copd")) return "asthma";
                return "copd";
              })() :
                data.disease_category === "Bronchiectasis" ? "bronchiectasis" :
                  data.disease_category === "Post ICU Recovery" ? "post_icu" : (data.primary_diagnosis || "")
          ),
          disease_category: data.disease_category,
          ild_subtype: data.ild_subtype,
          ild_other_text: data.ild_other_text,
          is_fibrotic: data.is_fibrotic,
          oad_diagnosis: data.oad_diagnosis,
          oad_other_text: data.oad_other_text,
          bronchiectasis_cause: data.bronchiectasis_cause,
          bronchiectasis_other_text: data.bronchiectasis_other_text,
          posticu_cause: data.posticu_cause,
          posticu_other_text: data.posticu_other_text,
          post_icu_sub_diagnosis: data.post_icu_sub_diagnosis,
          comorbidities: data.comorbidities,
          comorbidities_other_text: data.comorbidities_other_text,
          diagnosed_at: data.diagnosed_at,
        },
        respSupport: {
          hasRespSupport: data.respiratory_support.requires_support,
          ...data.respiratory_support,
        },
        baselineVitals: {
          baseline_spo2: data.baseline_spo2 || "",
          baseline_heart_rate: data.baseline_heart_rate || "",
        },
        pftRows: data.pft_records.map((record) => {
          const ext = record as typeof record & { fev1_pct_pred?: string | null; fvc_pct_pred?: string | null; six_mwd?: string | null; min_spo2?: string | null; max_spo2?: string | null; baseline_spo2?: string | null; baseline_heart_rate?: string | null };
          return {
            test_date: record.test_date,
            fvc: record.fvc?.toString() || "",
            fev1: record.fev1?.toString() || "",
            fev1_fvc_ratio: record.fev1_fvc_ratio?.toString() || "",
            dlco: record.dlco?.toString() || "",
            fev1_pct_pred: ext.fev1_pct_pred || "",
            fvc_pct_pred: ext.fvc_pct_pred || "",
            six_mwd: ext.six_mwd || "",
            min_spo2: ext.min_spo2 || "",
            max_spo2: ext.max_spo2 || "",
            baseline_spo2: data.baseline_spo2 || ext.baseline_spo2 || "",
            baseline_heart_rate: data.baseline_heart_rate || ext.baseline_heart_rate || "",
          };
        }),
        medications: data.medications.map((medication) => ({
          route: medication.route,
          drug_name: medication.drug_name,
          dose: medication.dose?.toString() || "",
          dose_unit: medication.dose_unit,
          frequency: medication.frequency,
          start_date: medication.start_date,
          end_date: medication.end_date,
          prescription_date: medication.prescription_date || medication.start_date,
          patient_instruction: medication.patient_instruction || null,
        })),
      };

      const url = editPatientId ? `/api/patients?id=${editPatientId}` : "/api/patients";
      const method = editPatientId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.status === 201 || res.status === 200) {
        const resBody = await res.json() as { ok: boolean; patientId?: string };

        // After creating the patient record, provision their Supabase Auth account
        // so they can log in via OTP. Skip for edits.
        if (!editPatientId && resBody.patientId) {
          try {
            const authRes = await fetch("/api/patients/provision-auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                patientId: resBody.patientId,
                mobile_number: data.mobile_number,
              }),
            });
            if (!authRes.ok) {
              const authBody = await authRes.json().catch(() => ({})) as { error?: string };
              toast.error(
                `Patient registered, but login activation encountered an issue: ${authBody.error ?? "Failed to provision login credentials"}`
              );
            } else {
              const authData = await authRes.json().catch(() => ({})) as { sms_dispatched?: boolean };
              if (authData.sms_dispatched) {
                toast.success("Patient registered & welcome onboarding SMS sent");
              } else {
                toast.success("Patient registered & login access activated");
              }
            }
          } catch {
            toast.error("Patient registered, but login provisioning network request failed.");
          }
        } else {
          toast.success("Saved");
        }
        onDone();
      } else if (res.status === 400) {
        const body = await res.json() as { error?: string; field_errors?: Record<string, string[]> };
        const newErrors: Record<string, string> = {};
        if (body.field_errors && typeof body.field_errors === "object") {
          Object.keys(body.field_errors).forEach((key) => {
            const messages = body.field_errors![key];
            if (Array.isArray(messages) && messages[0]) {
              newErrors[key] = messages[0];
            }
          });
        }
        setErrors(newErrors);
        setStep(1);
        setSubmitError(body.error || "Please correct the errors in the fields above.");
      } else if (res.status === 409) {
        setErrors({ global_mobile: "This mobile number is already registered to a patient." });
        setStep(1);
        setSubmitError("Patient already registered - this mobile number (+91" + data.mobile_number + ") is already in the system. If this is your patient, they can log in directly. If they belong to another doctor, use the Import Patient feature.");
      } else {
        let serverMsg = "A server error occurred. Please try again.";
        try {
          const errBody = await res.json() as { error?: string };
          if (errBody?.error) serverMsg = errBody.error;
        } catch { /* ignore */ }
        setSubmitError(serverMsg);
      }
    } catch {
      setSubmitError("Failed to submit. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const validateStepData = (stepNum: number): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (stepNum === 1) {
      if (!data.name.trim()) newErrors["name"] = "Full name is required";
      if (!data.age || isNaN(Number(data.age)) || Number(data.age) < 1 || Number(data.age) > 120) {
        newErrors["age"] = "Please enter a valid age (1-120)";
      }
      if (!data.gender) newErrors["gender"] = "Please select a sex";
      if (!data.mobile_number || data.mobile_number.length !== 10) {
        newErrors["mobile_number"] = "Mobile number must be exactly 10 digits";
      } else if (!/^[6-9]\d{9}$/.test(data.mobile_number)) {
        newErrors["mobile_number"] = "Enter a valid Indian mobile number starting with 6-9";
      }
      if (data.alternate_mobile && data.alternate_mobile.length > 0 && data.alternate_mobile.length !== 10) {
        newErrors["alternate_mobile"] = "Alternate number must be 10 digits";
      }
    } else if (stepNum === 2) {
      if (!data.disease_category) {
        newErrors["primary_diagnosis"] = "Please select a disease category";
      }
    } else if (stepNum === 4) {
      if (!editPatientId) {
        if (!data.baseline_spo2) {
          newErrors["baseline_spo2"] = "Baseline SpO2 is required";
        }
        if (!data.baseline_heart_rate) {
          newErrors["baseline_heart_rate"] = "Baseline Heart Rate is required";
        }
      }
    }
    return newErrors;
  };

  const goNext = () => {
    if (step === 7) {
      handleSubmit();
      return;
    }

    const stepErrors = validateStepData(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setStep((s) => Math.min(7, s + 1));
  };

  const goBack = () => {
    if (step === 1) onBack();
    else {
      setErrors({});
      setStep((s) => Math.max(1, s - 1));
    }
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === step) return;
    if (editPatientId) {
      // In edit mode, allow immediate jumping to any step directly
      setErrors({});
      setStep(targetStep);
      return;
    }
    if (targetStep < step) {
      // Navigating back is always allowed
      setErrors({});
      setStep(targetStep);
      return;
    }
    // If clicking forward in new patient creation, validate current step first
    const currentStepErrors = validateStepData(step);
    if (Object.keys(currentStepErrors).length > 0) {
      setErrors(currentStepErrors);
      return;
    }
    setErrors({});
    setStep(targetStep);
  };

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{editPatientId ? "Edit Patient Record" : "Enrol New Patient"}</h1>
          <p className={styles.sub}>
            Step {step} of 7 — {STEPS[step - 1]?.label}
            {editPatientId && (
              <span style={{ marginLeft: 8, color: "#1e6091", fontWeight: 600 }}>
                (Click any step in sidebar to jump directly)
              </span>
            )}
          </p>
        </div>
        <button type="button" className={styles.btnGhost} onClick={onBack}>
          ← Return to Patients
        </button>
      </div>

      <div className={styles.layout}>
        <aside className={styles.stepSidebar}>
          <p className={styles.stepsLabel}>Enrolment Steps</p>
          {STEPS.map((s, i) => {
            const num = i + 1;
            const isActive = num === step;
            const isCompleted = editPatientId ? true : num < step;
            const isClickable = true;
            return (
              <button
                key={s.label}
                type="button"
                className={`${styles.stepItem} ${isActive ? styles.stepActive : ""} ${isCompleted ? styles.stepCompleted : ""}`}
                onClick={() => handleStepClick(num)}
                title={editPatientId ? `Jump directly to ${s.label}` : undefined}
              >
                <div className={`${styles.stepBubble} ${isCompleted ? styles.stepBubbleCompleted : ""}`}>
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : num}
                </div>
                <div className={styles.stepText}>
                  <p className={styles.stepLabel}>{s.label}</p>
                  <p className={styles.stepSub}>{s.sub}</p>
                </div>
                {isActive && <ChevronRight size={14} className={styles.stepArrow} />}
              </button>
            );
          })}
        </aside>

        <div className={styles.formMain}>
          {submitError && (
            <div className={styles.fieldError} style={{ marginBottom: 16, padding: 12, background: "#fee2e2", borderRadius: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1, color: "#dc2626" }} />
              <span style={{ color: "#991b1b", fontWeight: 600, fontSize: 12 }}>{submitError}</span>
            </div>
          )}
          {step === 1 && <StepBasicInfo data={data} update={update} errors={errors} isEdit={!!editPatientId} />}
          {step === 2 && <StepDiagnosis data={data} update={update} errors={errors} />}
          {step === 3 && <StepComorbidities data={data} update={update} />}
          {step === 4 && <StepPFT data={data} update={update} errors={errors} isEdit={!!editPatientId} />}
          {step === 5 && <StepRespSupport data={data} update={update} />}
          {step === 6 && <StepMedications data={data} update={update} />}
          {step === 7 && <StepReview data={data} isEdit={!!editPatientId} onJumpToStep={setStep} />}
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <button type="button" className={styles.btnGhost} onClick={goBack}>
            {step === 1 ? "Cancel" : "← Back"}
          </button>
        </div>
        <div className={styles.footerCenter}>
          <span className={styles.footerStepIndicator}>
            Step {step} of 7: <strong>{STEPS[step - 1]?.label}</strong>
          </span>
        </div>
        <div className={styles.footerActions}>
          {editPatientId && step !== 7 && (
            <button
              type="button"
              className={styles.btnGhost}
              style={{ background: "#f8fafc", borderColor: "#cbd5e1", color: "#1e6091", fontWeight: 600 }}
              onClick={() => setStep(7)}
              title="Jump directly to Review & Save"
            >
              Jump to Review (Step 7) →
            </button>
          )}
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={goNext}
            disabled={submitting}
          >
            {submitting ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Loader2 className="animate-spin" size={15} /> Saving Patient...
              </span>
            ) : step === 7 ? (
              editPatientId ? "Update Patient Record" : "Complete & Save Patient"
            ) : (
              "Save & Continue →"
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

