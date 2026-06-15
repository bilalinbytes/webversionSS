"use client";

import { useState, useEffect } from "react";
import { Check, AlertCircle, ChevronRight, Loader2 } from "lucide-react";
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
  { label: "Basic Info",          sub: "Name, mobile, age" },
  { label: "Diagnosis",           sub: "Category + subtype" },
  { label: "Co-morbidities",      sub: "Associated conditions" },
  { label: "PFT Records",         sub: "Lung function tests" },
  { label: "Respiratory Support", sub: "LTOT / BiPAP / Vent" },
  { label: "Medications",         sub: "Active prescriptions" },
  { label: "Review & Create",     sub: "Preview before saving" },
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

// ── Step 1: Basic Info ────────────────────────────────────────────────────────
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
                type="number" min={1} max={120}
                className={`${styles.input} ${errors["age"] ? styles.inputError : (data.age && Number(data.age) > 0) ? styles.inputValid : ""}`}
                placeholder="e.g. 52"
                value={data.age}
                onChange={e => updateField("age", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Contact Details</p>
        <p className={styles.cardSub}>The patient logs in using their mobile number. This must be correct — they cannot log in without it.</p>
        <div className={styles.grid2}>
          <Field label="Mobile Number" required error={errors["mobile_number"] || errors["global_mobile"]}>
            <div style={{ position: "relative" }}>
              <input
                className={`${styles.input} ${
                  errors["mobile_number"] || errors["global_mobile"] || duplicateCheck === "duplicate"
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
                maxLength={10}
                onChange={e => { updateField("mobile_number", e.target.value.replace(/\D/g, "")); setDuplicateCheck("idle"); }}
              />
              {duplicateCheck === "checking" && (
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#888" }}>checking…</span>
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
                <AlertCircle size={11} /> Must be 10 digits starting with 6–9
              </span>
            )}
            {duplicateCheck === "available" && (
              <span style={{ fontSize: 11, color: "#2d7a38", marginTop: 3, display: "block" }}>
                Available — patient will log in with +91{data.mobile_number}
              </span>
            )}
          </Field>
          <Field label="Alternate Mobile (Caretaker)" error={errors["alternate_mobile"]}>
            <input
              className={`${styles.input} ${errors["alternate_mobile"] ? styles.inputError : (data.alternate_mobile && altMobileValid) ? styles.inputValid : ""}`}
              placeholder="Optional — caretaker&apos;s number"
              value={data.alternate_mobile}
              maxLength={10}
              onChange={e => updateField("alternate_mobile", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Diagnosis ─────────────────────────────────────────────────────────
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
      if (d.includes("asthma") && !d.includes("copd")) return "asthma";
      return "copd";
    }
    case "Bronchiectasis": return "bronchiectasis";
    case "Post ICU Recovery": return "posticu";
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
      primary_diagnosis: cat === "ILD" ? "ild" : cat === "OAD" ? "copd" : cat === "Bronchiectasis" ? "bronchiectasis" : cat === "Post ICU Recovery" ? "post_icu" : "",
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
        {errors["primary_diagnosis"] && <p className={styles.fieldError} style={{marginTop: 8}}><AlertCircle size={11} /> {errors["primary_diagnosis"]}</p>}
      </div>

      {/* ILD sub-fields */}
      {data.disease_category === "ILD" && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>ILD Details</p>
          <div className={styles.grid2}>
            <Field label="ILD Sub-type">
              <select className={styles.select} value={data.ild_subtype} onChange={e => update({ ild_subtype: e.target.value, ild_other_text: "" })}>
                <option value="">— Select sub-type —</option>
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
                <option value="">— Select diagnosis —</option>
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
                <option value="">— Select cause —</option>
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
                <option value="">— Select cause —</option>
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
          <Check size={14} color="#0f6e56" />
          <div>
            <p className={styles.summaryLabel}>Diagnosis Summary</p>
            <p className={styles.summaryValue}>{summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Co-morbidities ────────────────────────────────────────────────────
function StepComorbidities({ data, update }: { data: FormData; update: (d: Partial<FormData>) => void }) {
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

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>Co-morbidities</h2>
        <p className={styles.stepDesc}>Select all associated conditions that apply to this patient.</p>
      </div>
      <div className={styles.card}>
        <p className={styles.cardTitle}>Associated Conditions</p>
        <p className={styles.cardSub}>Select all that apply</p>
        <div className={styles.comorbidGrid}>
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

// ── Step 4: PFT Records ───────────────────────────────────────────────────────
function flag(val: number | null, threshold: number) {
  return val !== null && val < threshold;
}

function StepPFT({ data, update, errors }: { data: FormData; update: (d: Partial<FormData>) => void; errors: Record<string, string> }) {
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
        <h2 className={styles.stepTitle}>PFT Records</h2>
        <p className={styles.stepDesc}>Add pulmonary function test results. All fields except date are optional.</p>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <p className={styles.cardTitle}>Test Results ({data.pft_records.length} entries)</p>
          {!adding && <button type="button" className={styles.btnOutline} onClick={() => setAdding(true)}>+ Add PFT Record</button>}
        </div>

        {adding && (
          <div className={styles.addRowForm}>
            <p className={styles.addRowTitle}>New PFT Record</p>
            <div className={styles.addRowGrid}>
              <Field label="Date" required>
                <input type="date" className={styles.input} value={draft.date} onChange={(e) => setDraft({...draft, date: e.target.value})} />
              </Field>
              <Field label="FEV1/FVC (%)">
                <input type="number" step="0.01" className={styles.input} placeholder="—" value={draft.ratio} onChange={(e) => setDraft({...draft, ratio: e.target.value})} />
              </Field>
              <Field label="FEV1 (% Predicted)">
                <input type="number" step="0.1" className={styles.input} placeholder="—" value={draft.fev1_pct_pred} onChange={(e) => setDraft({...draft, fev1_pct_pred: e.target.value})} />
              </Field>
              <Field label="FEV1 (Liters)">
                <input type="number" step="0.01" className={styles.input} placeholder="—" value={draft.fev1} onChange={(e) => setDraft({...draft, fev1: e.target.value})} />
              </Field>
              <Field label="FVC (% Predicted)">
                <input type="number" step="0.1" className={styles.input} placeholder="—" value={draft.fvc_pct_pred} onChange={(e) => setDraft({...draft, fvc_pct_pred: e.target.value})} />
              </Field>
              <Field label="FVC (Liters)">
                <input type="number" step="0.01" className={styles.input} placeholder="—" value={draft.fvc} onChange={(e) => setDraft({...draft, fvc: e.target.value})} />
              </Field>
              <Field label="DLCO (% Predicted)">
                <input type="number" step="0.1" className={styles.input} placeholder="—" value={draft.dlco} onChange={(e) => setDraft({...draft, dlco: e.target.value})} />
              </Field>
              <Field label="6MWD (m)">
                <input type="number" step="1" className={styles.input} placeholder="—" value={draft.six_mwd} onChange={(e) => setDraft({...draft, six_mwd: e.target.value})} />
              </Field>
              <Field label="Min SpO2">
                <input type="number" step="0.1" className={styles.input} placeholder="—" value={draft.min_spo2} onChange={(e) => setDraft({...draft, min_spo2: e.target.value})} />
              </Field>
              <Field label="Max SpO2">
                <input type="number" step="0.1" className={styles.input} placeholder="—" value={draft.max_spo2} onChange={(e) => setDraft({...draft, max_spo2: e.target.value})} />
              </Field>
            </div>
            <div className={styles.addRowActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setAdding(false)}>Cancel</button>
              <button type="button" className={styles.btnPrimary} onClick={saveRecord} disabled={!draft.date}>Add Record</button>
            </div>
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>FEV1/FVC%</th>
                <th className={styles.th}>FEV1%pred</th>
                <th className={styles.th}>FEV1 L</th>
                <th className={styles.th}>FVC%pred</th>
                <th className={styles.th}>FVC L</th>
                <th className={styles.th}>DLCO%</th>
                <th className={styles.th}>6MWD</th>
                <th className={styles.th}>SpO2 min/max</th>
                <th className={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {data.pft_records.map((r) => {
                const ext = r as typeof r & { fev1_pct_pred?: string | null; fvc_pct_pred?: string | null; six_mwd?: string | null; min_spo2?: string | null; max_spo2?: string | null; baseline_spo2?: string | null; baseline_heart_rate?: string | null };
                return (
                  <tr key={r._clientId} className={styles.tr}>
                    <td className={styles.td}>{r.test_date}</td>
                    <td className={`${styles.td} ${flag(r.fev1_fvc_ratio, 0.7) ? styles.abnormal : ""}`}>{r.fev1_fvc_ratio ?? "—"}{flag(r.fev1_fvc_ratio, 0.7) ? " !" : ""}</td>
                    <td className={styles.td}>{ext.fev1_pct_pred || "—"}</td>
                    <td className={`${styles.td} ${flag(r.fev1, 0.8) ? styles.abnormal : ""}`}>{r.fev1 ?? "—"}{flag(r.fev1, 0.8) ? " !" : ""}</td>
                    <td className={styles.td}>{ext.fvc_pct_pred || "—"}</td>
                    <td className={`${styles.td} ${flag(r.fvc, 0.8) ? styles.abnormal : ""}`}>{r.fvc ?? "—"}{flag(r.fvc, 0.8) ? " !" : ""}</td>
                    <td className={`${styles.td} ${flag(r.dlco, 60) ? styles.abnormal : ""}`}>{r.dlco ?? "—"}{flag(r.dlco, 60) ? " !" : ""}</td>
                    <td className={styles.td}>{ext.six_mwd || "—"}</td>
                    <td className={styles.td}>{ext.min_spo2 || "—"} / {ext.max_spo2 || "—"}</td>
                    <td className={styles.td}><button type="button" className={styles.removeBtn} onClick={() => removeRow(r._clientId)}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.baselineVitalsSection}>
          <p className={styles.addRowTitle}>Baseline Vitals <span style={{ color: "#c94d49", fontSize: 11 }}>* Required</span></p>
          <div className={styles.baselineVitalsGrid}>
            <Field label="Baseline SpO2" required error={errors["baseline_spo2"]}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={`${styles.input} ${errors["baseline_spo2"] ? styles.inputError : data.baseline_spo2 ? styles.inputValid : ""}`}
                placeholder="—"
                value={data.baseline_spo2}
                onChange={(e) => update({ baseline_spo2: e.target.value })}
              />
            </Field>
            <Field label="Baseline Heart Rate" required error={errors["baseline_heart_rate"]}>
              <input
                type="number"
                min="20"
                max="250"
                step="1"
                className={`${styles.input} ${errors["baseline_heart_rate"] ? styles.inputError : data.baseline_heart_rate ? styles.inputValid : ""}`}
                placeholder="—"
                value={data.baseline_heart_rate}
                onChange={(e) => update({ baseline_heart_rate: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Respiratory Support ───────────────────────────────────────────────
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
              <input type="radio" value={v} checked={rs.requires_support === (v==="Yes")}
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

// ── Step 5: Medications ───────────────────────────────────────────────────────
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
                <select className={styles.select} value={draft.route} onChange={e => setDraft({...draft, route: e.target.value})}>
                  {RTE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </Field>
              <Field label="Drug Name" required>
                <input className={styles.input} value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} />
              </Field>
              <Field label="Dose">
                <input type="number" step="0.1" className={styles.input} value={draft.dose} onChange={e => setDraft({...draft, dose: e.target.value})} />
              </Field>
              <Field label="Unit">
                <select className={styles.select} value={draft.unit} onChange={e => setDraft({...draft, unit: e.target.value})}>
                  {["mg", "mcg", "ml", "puffs", "units", "other"].map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Frequency" required>
                <select className={styles.select} value={draft.frequency} onChange={e => setDraft({...draft, frequency: e.target.value})}>
                  {FREQUENCY_OPTS.map(frequency => <option key={frequency}>{frequency}</option>)}
                </select>
              </Field>
              <Field label="Prescription Date" required>
                <input type="date" className={styles.input} value={draft.prescriptionDate} onChange={e => setDraft({...draft, prescriptionDate: e.target.value})} />
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
                  <input type="date" className={styles.input} value={draft.end} onChange={e => setDraft({...draft, end: e.target.value})} disabled={draft.ongoing} />
                  <label style={{ display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={draft.ongoing} onChange={e => setDraft({...draft, ongoing: e.target.checked})} /> Ongoing
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
                onChange={e => setDraft({...draft, patientInstruction: e.target.value})}
                placeholder="Write short guidance for the patient dashboard..."
              />
            </div>
            <div className={styles.addRowActions}>
              <button type="button" className={styles.btnGhost} onClick={() => { setDraft({ route: "tablet", name: "", dose: "", unit: "mg", frequency: "OD", start: "", end: "", durationDays: "", ongoing: false, prescriptionDate: new Date().toISOString().split("T")[0] as string, patientInstruction: "" }); setAdding(false); }}>Cancel</button>
              <button type="button" className={styles.btnPrimary} onClick={saveMed} disabled={countWords(draft.patientInstruction) > PATIENT_INSTRUCTION_WORD_LIMIT}>Add Medication</button>
            </div>
          </div>
        )}

        <div className={styles.medList}>
          <div className={styles.medHeader}>
            <span className={styles.medHeaderCell}>Medication Type</span>
            <span className={styles.medHeaderCell}>Name</span>
            <span className={styles.medHeaderCell}>Dose</span>
            <span className={styles.medHeaderCell}>Frequency</span>
            <span className={styles.medHeaderCell}>Start</span>
            <span className={styles.medHeaderCell}>End</span>
            <span className={styles.medHeaderCell}></span>
          </div>
          {data.medications.map((m) => (
            <div key={m._clientId} className={styles.medRow}>
              <span className={styles.medCell}>{RTE_OPTS.find(r => r.v === m.route)?.l}</span>
              <span className={`${styles.medCell} ${styles.medName}`}>{m.drug_name}</span>
              <span className={styles.medCell}>{m.dose} {m.dose_unit}</span>
              <span className={styles.medCell}>{m.frequency}</span>
              <span className={`${styles.medCell} ${styles.medMuted}`}>{m.start_date}</span>
              <span className={`${styles.medCell} ${styles.medMuted}`}>{m.end_date || "Ongoing"}</span>
              <span className={styles.medCell}><button type="button" className={styles.removeBtn} onClick={() => removeMed(m._clientId)}>×</button></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 7: Review ────────────────────────────────────────────────────────────
function StepReview({ data, isEdit }: { data: FormData, isEdit?: boolean }) {
  const summary = getDiagnosisSummary(data);

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepIntro}>
        <h2 className={styles.stepTitle}>{isEdit ? "Review & Update" : "Review & Create"}</h2>
      </div>
      <div className={styles.reviewGrid}>
        {[
          { title: "Basic Info", items: [data.name || "Missing Name", `${data.gender} · Age: ${data.age || "—"}`, data.mobile_number, data.alternate_mobile ? `Alt: ${data.alternate_mobile}` : null].filter(Boolean) as string[] },
          { title: "Diagnosis", items: [summary, `Comorbidities: ${data.comorbidities.length ? data.comorbidities.join(", ") : "None"}`] },
          { title: "PFT Records", items: [`${data.pft_records.length} entries`] },
          { title: "Respiratory Support", items: [data.respiratory_support.requires_support ? "Yes" : "No Support Required"] },
          { title: "Medications", items: [`${data.medications.length} active`] },
        ].map((sec) => (
          <div key={sec.title} className={styles.reviewCard}>
             <div className={styles.reviewCardHeader}>
              <Check size={13} color="#0f6e56" />
              <span className={styles.reviewCardTitle}>{sec.title}</span>
            </div>
            {sec.items.map((it, i) => <p key={i} className={styles.reviewItem}>{it}</p>)}
          </div>
        ))}
      </div>
      <div className={styles.reviewNotice}>
        <AlertCircle size={14} color="#0f6e56" />
        <span>All data will be saved to Supabase. Patient will receive an onboarding SMS.</span>
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
    if (!data.baseline_spo2) finalErrors["baseline_spo2"] = "Baseline SpO2 is required";
    if (!data.baseline_heart_rate) finalErrors["baseline_heart_rate"] = "Baseline Heart Rate is required";
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
        },
        diagnosis: {
          primary_diagnosis: data.primary_diagnosis || (
            data.disease_category === "ILD" ? "ild" :
            data.disease_category === "OAD" ? (data.oad_diagnosis?.toLowerCase().includes("asthma") && !data.oad_diagnosis?.toLowerCase().includes("copd") ? "asthma" : "copd") :
            data.disease_category === "Bronchiectasis" ? "bronchiectasis" :
            data.disease_category === "Post ICU Recovery" ? "post_icu" : ""
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
          const authRes = await fetch("/api/patients/provision-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId: resBody.patientId,
              mobile_number: data.mobile_number,
            }),
          });
          if (!authRes.ok) {
            // Non-fatal: patient record exists, auth provisioning failed.
            // Show a warning but still proceed.
            const authBody = await authRes.json().catch(() => ({})) as { error?: string };
            setSubmitError(
              `Patient created, but login setup failed: ${authBody.error ?? "unknown error"}. ` +
              `The patient may not be able to log in. Please contact support.`
            );
            // Still call onDone so the patient appears in the list
          }
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
        setSubmitError("Patient already registered — this mobile number (+91" + data.mobile_number + ") is already in the system. If this is your patient, they can log in directly. If they belong to another doctor, use the Import Patient feature.");
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

  const goNext = () => {
    if (step === 7) {
      handleSubmit();
      return;
    }

    // ── Step 1 validation: block until required fields are complete ──
    if (step === 1) {
      const newErrors: Record<string, string> = {};
      if (!data.name.trim()) newErrors["name"] = "Full name is required";
      if (!data.age || isNaN(Number(data.age)) || Number(data.age) < 1 || Number(data.age) > 120) {
        newErrors["age"] = "Please enter a valid age (1–120)";
      }
      if (!data.gender) newErrors["gender"] = "Please select a sex";
      if (!data.mobile_number || data.mobile_number.length !== 10) {
        newErrors["mobile_number"] = "Mobile number must be exactly 10 digits";
      } else if (!/^[6-9]\d{9}$/.test(data.mobile_number)) {
        newErrors["mobile_number"] = "Enter a valid Indian mobile number starting with 6–9";
      }
      if (data.alternate_mobile && data.alternate_mobile.length > 0 && data.alternate_mobile.length !== 10) {
        newErrors["alternate_mobile"] = "Alternate number must be 10 digits";
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
    }

    // ── Step 2 validation: disease category required ──
    if (step === 2) {
      if (!data.disease_category) {
        setErrors({ primary_diagnosis: "Please select a disease category" });
        return;
      }
      setErrors({});
    }

    // ── Step 4 validation: Baseline Vitals required ──
    if (step === 4) {
      const newErrors: Record<string, string> = {};
      if (!data.baseline_spo2) {
        newErrors["baseline_spo2"] = "Baseline SpO2 is required";
      }
      if (!data.baseline_heart_rate) {
        newErrors["baseline_heart_rate"] = "Baseline Heart Rate is required";
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
    }

    setStep((s) => Math.min(7, s + 1));
  };
  const goBack = () => {
    if (step === 1) onBack();
    else setStep((s) => Math.max(1, s - 1));
  };

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>{editPatientId ? "Edit Patient" : "Create New Patient"}</h1><p className={styles.sub}>Step {step} of 7</p></div>
        <button type="button" className={styles.btnGhost} onClick={onBack}>← Dashboard</button>
      </div>
      <div className={styles.layout}>
        <aside className={styles.stepSidebar}>
          <p className={styles.stepsLabel}>Enrolment Steps</p>
          {STEPS.map((s, i) => {
             const num = i+1;
             const isActive = num === step;
             return (
               <button key={s.label} type="button" className={`${styles.stepItem} ${isActive ? styles.stepActive : ""}`} onClick={() => setStep(num)}>
                 <div className={styles.stepBubble}>{num}</div>
                 <div className={styles.stepText}><p className={styles.stepLabel}>{s.label}</p><p className={styles.stepSub}>{s.sub}</p></div>
                 {isActive && <ChevronRight size={14} className={styles.stepArrow} />}
               </button>
             );
          })}
        </aside>
        <div className={styles.formMain}>
          {submitError && <div className={styles.fieldError} style={{marginBottom: 16, padding: 12, background: "#fee2e2", borderRadius: 6, display: "flex", gap: 8, alignItems: "flex-start"}}><AlertCircle size={14} style={{flexShrink: 0, marginTop: 1}}/> {submitError}</div>}
          {step === 1 && <StepBasicInfo data={data} update={update} errors={errors} isEdit={!!editPatientId} />}
          {step === 2 && <StepDiagnosis data={data} update={update} errors={errors} />}
          {step === 3 && <StepComorbidities data={data} update={update} />}
          {step === 4 && <StepPFT data={data} update={update} errors={errors} />}
          {step === 5 && <StepRespSupport data={data} update={update} />}
          {step === 6 && <StepMedications data={data} update={update} />}
          {step === 7 && <StepReview data={data} isEdit={!!editPatientId} />}
        </div>
      </div>
      <div className={styles.footer}>
        <div className={styles.footerLeft}></div>
        <div className={styles.footerActions}>
          <button type="button" className={styles.btnGhost} onClick={goBack}>{step === 1 ? "Cancel" : "Back"}</button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={goNext}
            disabled={submitting || (step === 1 && (!data.name.trim() || !data.mobile_number || data.mobile_number.length !== 10 || !data.gender || !data.age))}
          >            {submitting ? <Loader2 className="animate-spin" size={16}/> : (step === 7 ? (editPatientId ? "Update Patient" : "Create Patient") : "Save & Continue →")}
          </button>
        </div>
      </div>
    </div>
  );
}
