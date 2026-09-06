"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, CloudSun, ShieldAlert, Check, X, Edit3 } from "lucide-react";
import styles from "./shared.module.css";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Translations } from "@/lib/i18n/translations";

// ── Animated number ───────────────────────────────────────────────────────────
export function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = value, dur = 700, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
export function Sparkline({ points, color, height = 48 }: { points: number[]; color: string; height?: number }) {
  const W = 300, H = height;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── VAS Picker ────────────────────────────────────────────────────────────────
export function VASPicker({ value, onChange, label = "Discomfort (0–10)", labelHi }: {
  value: number | null; onChange: (v: number) => void; label?: string; labelHi?: string;
}) {
  const { bilingual } = useLanguage();
  return (
    <div className={styles.vasWrap}>
      <p className={styles.vasLabel}>
        {label}
        {labelHi && <span className={styles.vasLabelHi}>{labelHi}</span>}
      </p>
      <div className={styles.vasRow}>
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button"
            className={`${styles.vasBtn} ${value === i ? styles.vasBtnActive : ""}`}
            style={value === i ? {
              background: i >= 8 ? "#fef2f2" : i >= 5 ? "#fffbeb" : "#e0f2fe",
              borderColor: i >= 8 ? "#f87171" : i >= 5 ? "#f59e0b" : "#38bdf8",
              color: i >= 8 ? "#991b1b" : i >= 5 ? "#92400e" : "#0369a1",
              fontWeight: 800,
            } : {}}
            onClick={() => onChange(i)}
          >{i}</button>
        ))}
      </div>
      <div className={styles.vasHints}>
        <span>{bilingual("None", "vas_none")}</span>
        <span>{bilingual("Moderate", "vas_moderate")}</span>
        <span>{bilingual("Worst", "vas_worst")}</span>
      </div>
      {value !== null && (
        <p className={styles.vasSelected} style={{ color: value >= 8 ? "#e24b4a" : value >= 5 ? "#ef9f27" : "var(--med-blue-600, #1e6091)" }}>
          {value}/10 — {value >= 8 ? bilingual("Severe — contact your doctor", "vas_severe_alert") : value >= 5 ? bilingual("Moderate", "vas_moderate") : bilingual("Manageable", "vas_manageable")}
        </p>
      )}
    </div>
  );
}

// ── mMRC Picker ───────────────────────────────────────────────────────────────
export function MMRCPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const { t, language } = useLanguage();
  const grades = [
    { g: 0, label: "No breathlessness", sub: "Only with strenuous exercise" },
    { g: 1, label: "Mild",              sub: "Hurrying or walking uphill" },
    { g: 2, label: "Moderate",          sub: "Walk slower than peers on flat" },
    { g: 3, label: "Severe",            sub: "Stop after 100m on flat" },
    { g: 4, label: "Very severe",       sub: "Too breathless to leave house" },
  ];
  return (
    <div className={styles.mmrcWrap}>
      {grades.map(({ g, label, sub }) => {
        const translatedGrade = t(`mmrc_grade_${g}` as keyof Translations, `${label} - ${sub}`);
        return (
          <button key={g} type="button"
            className={`${styles.mmrcBtn} ${value === g ? styles.mmrcBtnActive : ""} ${g >= 3 ? styles.mmrcWarnBtn : ""}`}
            onClick={() => onChange(g)}
          >
            <span className={`${styles.mmrcNum} ${value === g ? styles.mmrcNumActive : ""} ${value === g && g >= 3 ? styles.mmrcNumWarn : ""}`}>{g}</span>
            <div className={styles.mmrcText}>
              <div className={styles.mmrcTitleRow}>
                <span className={styles.mmrcLabel}>{label}</span>
                {language !== "en" && <span className={styles.mmrcLabelHi}>{translatedGrade}</span>}
              </div>
              <span className={styles.mmrcSub}>{sub}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── SpO2 Input with Previous Reading Quick Select ─────────────────────────────
export function SpO2Input({
  value,
  onChange,
  prevValue,
  label,
  isCOPD = false,
}: {
  value: string;
  onChange: (v: string) => void;
  prevValue?: number | null;
  label?: string;
  isCOPD?: boolean;
}) {
  const { bilingual } = useLanguage();
  const defaultLabel = bilingual("SpO₂ at Rest", "vital_spo2_rest");
  const displayLabel = label ?? defaultLabel;

  const hasPrevious = prevValue !== null && prevValue !== undefined && prevValue > 0;
  const isSameSelected = hasPrevious && value !== "" && Number(value) === prevValue;
  const [mode, setMode] = useState<"same" | "custom" | null>(() => {
    if (hasPrevious && value !== "" && Number(value) === prevValue) return "same";
    if (value !== "") return "custom";
    return null;
  });

  useEffect(() => {
    if (hasPrevious && value !== "" && Number(value) === prevValue) {
      setMode("same");
    } else if (value !== "") {
      setMode("custom");
    }
  }, [value, prevValue, hasPrevious]);

  const num = Number(value);
  const threshold = isCOPD ? 88 : 94;
  const isLow = value !== "" && num < threshold;

  const handleSelectSame = () => {
    setMode("same");
    onChange(String(prevValue));
  };

  const handleSelectCustom = () => {
    setMode("custom");
    if (isSameSelected) {
      onChange("");
    }
  };

  return (
    <div className={styles.vitalContainer}>
      <div className={styles.vitalHeaderRow}>
        <label className={styles.fieldLabel}>
          {displayLabel} <span className={styles.req}>*</span>
        </label>
        {hasPrevious && (
          <div className={styles.vitalPrevPill}>
            <span>{bilingual("Previous", "vital_previous")}:</span>
            <strong className={styles.vitalPrevValue}>{prevValue}%</strong>
          </div>
        )}
      </div>

      {hasPrevious ? (
        <>
          <div className={styles.vitalQuickOptions}>
            <button
              type="button"
              className={`${styles.vitalQuickBtn} ${mode === "same" ? styles.vitalQuickBtnActive : ""}`}
              onClick={handleSelectSame}
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{bilingual(`Same as previous (${prevValue}%)`, "vital_same_as_prev")}</span>
            </button>
            <button
              type="button"
              className={`${styles.vitalQuickBtn} ${mode === "custom" ? styles.vitalQuickBtnCustomActive : ""}`}
              onClick={handleSelectCustom}
            >
              <Edit3 size={14} strokeWidth={2} />
              <span>{bilingual("Enter new value", "vital_enter_new")}</span>
            </button>
          </div>

          {(mode === "custom" || (!mode && value !== "")) && (
            <div style={{ marginTop: 8 }}>
              <div className={styles.spo2InputRow}>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="50"
                  max="100"
                  autoFocus={mode === "custom" && value === ""}
                  className={`${styles.spo2Input} ${isLow ? styles.spo2InputWarn : ""}`}
                  placeholder="e.g. 94"
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v === "" || Number(v) <= 100) {
                      onChange(v);
                    }
                  }}
                />
                <span className={styles.spo2Unit}>%</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.spo2InputRow}>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="50"
            max="100"
            className={`${styles.spo2Input} ${isLow ? styles.spo2InputWarn : ""}`}
            placeholder="e.g. 94"
            value={value}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (v === "" || Number(v) <= 100) {
                onChange(v);
              }
            }}
          />
          <span className={styles.spo2Unit}>%</span>
        </div>
      )}

      {isCOPD && <p className={styles.spo2Target}>{bilingual("Target: 88–92% for COPD", "vital_target_copd")}</p>}
      {!isCOPD && <p className={styles.spo2Target}>{bilingual("Target: >94%", "vital_target_general")}</p>}
      {isLow && (
        <span className={styles.warnMsg}>
          <AlertCircle size={11} /> {bilingual("Below target — contact your doctor", "vital_below_target")}
        </span>
      )}
    </div>
  );
}

// ── Heart Rate Input with Previous Reading Quick Select ───────────────────────
export function HeartRateInput({
  value,
  onChange,
  prevValue,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  prevValue?: number | null;
  label?: string;
}) {
  const { bilingual } = useLanguage();
  const defaultLabel = bilingual("Heart Rate (Resting Pulse)", "vital_heart_rate");
  const displayLabel = label ?? defaultLabel;

  const hasPrevious = prevValue !== null && prevValue !== undefined && prevValue > 0;
  const isSameSelected = hasPrevious && value !== "" && Number(value) === prevValue;
  const [mode, setMode] = useState<"same" | "custom" | null>(() => {
    if (hasPrevious && value !== "" && Number(value) === prevValue) return "same";
    if (value !== "") return "custom";
    return null;
  });

  useEffect(() => {
    if (hasPrevious && value !== "" && Number(value) === prevValue) {
      setMode("same");
    } else if (value !== "") {
      setMode("custom");
    }
  }, [value, prevValue, hasPrevious]);

  const handleSelectSame = () => {
    setMode("same");
    onChange(String(prevValue));
  };

  const handleSelectCustom = () => {
    setMode("custom");
    if (isSameSelected) {
      onChange("");
    }
  };

  return (
    <div className={styles.vitalContainer}>
      <div className={styles.vitalHeaderRow}>
        <label className={styles.fieldLabel}>{displayLabel}</label>
        {hasPrevious && (
          <div className={styles.vitalPrevPill}>
            <span>{bilingual("Previous", "vital_previous")}:</span>
            <strong className={styles.vitalPrevValue}>{prevValue} BPM</strong>
          </div>
        )}
      </div>

      {hasPrevious ? (
        <>
          <div className={styles.vitalQuickOptions}>
            <button
              type="button"
              className={`${styles.vitalQuickBtn} ${mode === "same" ? styles.vitalQuickBtnActive : ""}`}
              onClick={handleSelectSame}
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{bilingual(`Same as previous (${prevValue} BPM)`, "vital_same_as_prev")}</span>
            </button>
            <button
              type="button"
              className={`${styles.vitalQuickBtn} ${mode === "custom" ? styles.vitalQuickBtnCustomActive : ""}`}
              onClick={handleSelectCustom}
            >
              <Edit3 size={14} strokeWidth={2} />
              <span>{bilingual("Enter new value", "vital_enter_new")}</span>
            </button>
          </div>

          {(mode === "custom" || (!mode && value !== "")) && (
            <div style={{ marginTop: 8 }}>
              <div className={styles.spo2InputRow}>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="20"
                  max="250"
                  autoFocus={mode === "custom" && value === ""}
                  className={styles.spo2Input}
                  placeholder="e.g. 78"
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v === "" || Number(v) <= 250) {
                      onChange(v);
                    }
                  }}
                />
                <span className={styles.spo2Unit}>BPM</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.spo2InputRow}>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="20"
            max="250"
            className={styles.spo2Input}
            placeholder="e.g. 78"
            value={value}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (v === "" || Number(v) <= 250) {
                onChange(v);
              }
            }}
          />
          <span className={styles.spo2Unit}>BPM</span>
        </div>
      )}

      <p className={styles.spo2Target}>{bilingual("Normal resting pulse: 60–100 BPM", "vital_normal_pulse")}</p>
    </div>
  );
}

// ── AQI Display ───────────────────────────────────────────────────────────────
function getAqiMeta(aqi: number) {
  if (aqi > 200) {
    return {
      label: "Unhealthy",
      tone: "#b42318",
      bg: "#fff4f2",
      border: "#f3b8ae",
      title: "Unhealthy Air Quality Detected",
      recommendation: "Stay indoors if possible, use a mask outdoors, and keep rescue medication nearby.",
    };
  }

  if (aqi > 150) {
    return {
      label: "Poor",
      tone: "#b54708",
      bg: "#fff7ed",
      border: "#fed7aa",
      title: "Poor Air Quality Detected",
      recommendation: "Wear a mask outdoors and avoid prolonged exposure.",
    };
  }

  if (aqi > 100) {
    return {
      label: "Moderate",
      tone: "#8a6100",
      bg: "#fffbea",
      border: "#f6d66f",
      title: "Moderate Air Quality",
      recommendation: "Limit intense outdoor activity if breathing feels uncomfortable.",
    };
  }

  return {
    label: "Good",
    tone: "var(--med-blue-600, #1e6091)",
    bg: "#f0faf5",
    border: "#a8dec9",
    title: "Good Air Quality",
    recommendation: "Air quality is suitable for routine outdoor activity.",
  };
}

export function AQIDisplay({ aqi }: { aqi: number | null }) {
  if (aqi === null) {
    return (
      <div className={styles.aqiBox} role="status" aria-live="polite">
        <div className={styles.aqiIconWrap} aria-hidden="true">
          <CloudSun size={20} strokeWidth={1.8} />
        </div>
        <div className={styles.aqiContent}>
          <div className={styles.aqiHeader}>
            <p className={styles.aqiEyebrow}>Air quality alert</p>
            <span className={styles.aqiStatus}>Fetching</span>
          </div>
          <p className={styles.aqiTitle}>Checking local air quality</p>
          <p className={styles.aqiRecommendation}>We will show AQI guidance for your current location.</p>
        </div>
        <div className={styles.aqiReading}>
          <span className={styles.aqiVal}>--</span>
          <span className={styles.aqiUnit}>AQI</span>
        </div>
      </div>
    );
  }

  const meta = getAqiMeta(aqi);
  const isElevated = aqi > 100;

  return (
    <div
      className={styles.aqiBox}
      role={isElevated ? "alert" : "status"}
      aria-label={`${meta.label} air quality. AQI ${aqi}. ${meta.recommendation}`}
      style={{ borderColor: meta.border, background: meta.bg }}
    >
      <div className={styles.aqiIconWrap} aria-hidden="true" style={{ color: meta.tone, background: "#ffffff" }}>
        {isElevated ? <ShieldAlert size={20} strokeWidth={1.9} /> : <CloudSun size={20} strokeWidth={1.8} />}
      </div>
      <div className={styles.aqiContent}>
        <div className={styles.aqiHeader}>
          <p className={styles.aqiEyebrow}>Air quality alert</p>
          <span className={styles.aqiStatus} style={{ color: meta.tone, background: "#ffffff", borderColor: meta.border }}>
            <span className={styles.aqiDot} style={{ background: meta.tone }} />
            {meta.label}
          </span>
        </div>
        <p className={styles.aqiTitle}>
          {meta.title} <span className={styles.aqiInlineValue} style={{ color: meta.tone }}>(AQI: {aqi})</span>
        </p>
        <p className={styles.aqiRecommendation}>{meta.recommendation}</p>
        <p className={styles.aqiSub}>Auto-fetched from your location</p>
      </div>
      <div className={styles.aqiReading} style={{ color: meta.tone }}>
        <span className={styles.aqiVal}>{aqi}</span>
        <span className={styles.aqiUnit}>AQI</span>
      </div>
    </div>
  );
}

// ── Medication Checklist (Compulsory [ ✓ Taken ] [ ✕ Not Taken ] Selection) ───
interface Med {
  id: string;
  name: string;
  dose: string;
  route: string;
  frequency: string;
}

export function MedChecklist({
  meds,
  taken,
  onSelect,
}: {
  meds: Med[];
  taken: Record<string, boolean | null>;
  onSelect: (id: string, isTaken: boolean) => void;
}) {
  const { t } = useLanguage();
  const answeredCount = meds.filter((m) => taken[m.id] === true || taken[m.id] === false).length;
  const takenCount = meds.filter((m) => taken[m.id] === true).length;
  const allAnswered = meds.length > 0 && answeredCount === meds.length;

  return (
    <div className={styles.medWrap}>
      <div className={styles.medHeader}>
        <p className={styles.medTitle}>{t("prescribed_meds", "Medications Today")}</p>
        <span className={`${styles.medBadge} ${allAnswered ? styles.medBadgeDone : ""}`}>
          {answeredCount}/{meds.length} answered · {takenCount} taken
        </span>
      </div>

      <div className={styles.medList}>
        {meds.map((med) => {
          const status = taken[med.id];
          const isTaken = status === true;
          const isNotTaken = status === false;
          const isUnselected = status === null || status === undefined;

          return (
            <div key={med.id} className={styles.medCard}>
              <div className={styles.medCardHeader}>
                <div className={styles.medNameBlock}>
                  <p className={styles.medName}>
                    <span>{med.name}</span>
                    {med.dose ? <span className={styles.medDose}>{med.dose}</span> : null}
                  </p>
                  <p className={styles.medMetaPill}>
                    {med.route} {med.frequency ? `· ${med.frequency}` : ""}
                  </p>
                </div>

                {isTaken && (
                  <span className={`${styles.medSelectionStatus} ${styles.medStatusTaken}`}>
                    <Check size={12} strokeWidth={2.5} /> {t("yes", "Taken")}
                  </span>
                )}
                {isNotTaken && (
                  <span className={`${styles.medSelectionStatus} ${styles.medStatusNotTaken}`}>
                    <X size={12} strokeWidth={2.5} /> {t("no", "Not Taken")}
                  </span>
                )}
                {isUnselected && (
                  <span className={`${styles.medSelectionStatus} ${styles.medStatusPending}`}>
                    Required
                  </span>
                )}
              </div>

              {/* Compulsory Box-Style Selection */}
              <div className={styles.medBtnGroup}>
                <button
                  type="button"
                  className={`${styles.medChoiceBtn} ${styles.medChoiceBtnTaken} ${isTaken ? styles.medChoiceBtnTakenActive : ""}`}
                  onClick={() => onSelect(med.id, true)}
                  aria-pressed={isTaken}
                >
                  <Check size={16} strokeWidth={isTaken ? 3 : 2} />
                  <span className={styles.medChoiceText}>
                    {t("yes", "Taken")}
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.medChoiceBtn} ${styles.medChoiceBtnNotTaken} ${isNotTaken ? styles.medChoiceBtnNotTakenActive : ""}`}
                  onClick={() => onSelect(med.id, false)}
                  aria-pressed={isNotTaken}
                >
                  <X size={16} strokeWidth={isNotTaken ? 3 : 2} />
                  <span className={styles.medChoiceText}>
                    {t("no", "Not Taken")}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Side Effects ──────────────────────────────────────────────────────────────
export const SIDE_EFFECTS: { id: string; label: string; tKey: keyof Translations }[] = [
  { id: "nausea",         label: "Nausea",          tKey: "se_nausea" },
  { id: "vomiting",       label: "Vomiting",        tKey: "se_vomiting" },
  { id: "diarrhea",       label: "Diarrhea",        tKey: "se_diarrhea" },
  { id: "fever",          label: "Fever",           tKey: "se_fever" },
  { id: "headache",       label: "Headache",        tKey: "se_headache" },
  { id: "abdominal_pain", label: "Abdominal Pain",  tKey: "se_abdominal_pain" },
  { id: "rash",           label: "Rashes",          tKey: "se_rash" },
  { id: "dizziness",      label: "Dizziness",       tKey: "se_dizziness" },
  { id: "palpitation",    label: "Palpitations",    tKey: "se_palpitation" },
  { id: "tremor",         label: "Tremor",          tKey: "se_tremor" },
  { id: "insomnia",       label: "Insomnia",        tKey: "se_insomnia" },
  { id: "appetite",       label: "Poor Appetite",   tKey: "se_appetite" },
  { id: "others",         label: "Others",          tKey: "se_others" },
];

export function SideEffectsPicker({ selected, onToggle, othersText, onOthersTextChange }: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  othersText?: string;
  onOthersTextChange?: (text: string) => void;
}) {
  const { bilingual } = useLanguage();
  return (
    <div className={styles.seWrap}>
      <p className={styles.seTitle}>{bilingual("Side Effects Today", "se_title")}</p>
      <p className={styles.seSub}>{bilingual("Tap any you're experiencing", "se_sub")}</p>
      <div className={styles.seGrid}>
        {SIDE_EFFECTS.map(se => (
          <button key={se.id} type="button"
            className={`${styles.seChip} ${selected.has(se.id) ? styles.seChipActive : ""}`}
            onClick={() => onToggle(se.id)}
          >
            <span className={styles.seLabel}>{bilingual(se.label, se.tKey)}</span>
          </button>
        ))}
      </div>
      {selected.has("others") && onOthersTextChange && (
        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder={bilingual("Describe other side effects", "se_describe_others")}
            value={othersText ?? ""}
            onChange={e => onOthersTextChange(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 14 }}
          />
        </div>
      )}
      {selected.size === 0 && <p className={styles.seNone}>{bilingual("None today", "se_none_today")}</p>}
    </div>
  );
}

// ── Doctor note card ──────────────────────────────────────────────────────────
export function DoctorNoteCard({ note }: { note: string }) {
  const { bilingual } = useLanguage();
  return (
    <div className={styles.doctorNote}>
      <span className={styles.doctorNoteIcon}>Note</span>
      <div className={styles.doctorNoteBody}>
        <p className={styles.doctorNoteLabel}>
          {bilingual("Doctor's Note", "doctor_note_label")}
        </p>
        <p className={styles.doctorNoteText}>{note}</p>
      </div>
    </div>
  );
}

// ── Yellow management tips ─────────────────────────────────────────────────────
type YellowTipsDisease = "asthma" | "copd" | "bronchiectasis" | "ild" | "post_icu";

const YELLOW_TIPS: Record<YellowTipsDisease, string[]> = {
  asthma: [
    "Keep your rescue inhaler close at all times",
    "Avoid triggers: smoke, dust, cold air, pets",
    "Take your controller inhaler as prescribed",
    "Check peak flow if you feel any chest tightness",
  ],
  copd: [
    "Rest frequently — pace yourself through the day",
    "Use pursed-lip breathing during any exertion",
    "Stay warm and avoid cold, damp air",
    "Drink warm fluids to loosen secretions",
  ],
  bronchiectasis: [
    "Do airway clearance exercises 3 times today",
    "Stay well hydrated to thin secretions",
    "Monitor sputum — report any colour change",
    "Avoid crowded or smoky environments today",
  ],
  ild: [
    "Rest if short of breath — do not push through it",
    "Use supplemental oxygen if your doctor prescribed it",
    "Avoid dust, pollution and strong chemical fumes",
    "Take your antifibrotic medication on schedule",
  ],
  post_icu: [
    "Rest often — ICU recovery takes weeks, be patient",
    "Do gentle breathing exercises as advised",
    "Eat small nutritious meals regularly",
    "Maintain a regular sleep routine and avoid stress",
  ],
};

export function YellowTipsCard({ disease }: { disease: YellowTipsDisease }) {
  const { bilingual } = useLanguage();
  const tips = YELLOW_TIPS[disease];
  return (
    <div className={styles.yellowTips}>
      <div className={styles.yellowTipsHeader}>
        <span className={styles.yellowTipsIcon}>!</span>
        <p className={styles.yellowTipsTitle}>{bilingual("Management Tips", "management_tips")}</p>
      </div>
      <div className={styles.yellowTipsList}>
        {tips.map((tip) => (
          <div key={tip} className={styles.yellowTip}>
            <span className={styles.yellowTipDot} />
            <div className={styles.yellowTipContent}>
              <span className={styles.yellowTipEn}>{tip}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sputum Colour Picker ──────────────────────────────────────────────────────
export type SputumColour = "clear" | "white" | "yellow" | "green" | "dark_green" | "brown" | "blood_streaked";

const SPUTUM_COLOUR_OPTS: { id: SputumColour; hex: string; en: string; tKey: keyof Translations }[] = [
  { id: "clear", hex: "#E8F4F8", en: "Clear", tKey: "color_clear" },
  { id: "white", hex: "#F5F5F5", en: "White", tKey: "color_white" },
  { id: "yellow", hex: "#F5E642", en: "Yellow", tKey: "color_yellow" },
  { id: "green", hex: "#7BC67E", en: "Green", tKey: "color_green" },
  { id: "dark_green", hex: "#2D6A4F", en: "Dark green", tKey: "color_dark_green" },
  { id: "brown", hex: "#8B5E3C", en: "Brown", tKey: "color_brown" },
  { id: "blood_streaked", hex: "#C0392B", en: "Blood-streaked", tKey: "color_blood_tinged" },
];

export function SputumColourPicker({ value, onChange }: { value: SputumColour | null; onChange: (v: SputumColour) => void }) {
  const { bilingual } = useLanguage();
  const selected = SPUTUM_COLOUR_OPTS.find(opt => opt.id === value);
  
  return (
    <div>
      <div className={styles.sputumRow}>
        {SPUTUM_COLOUR_OPTS.map(opt => (
          <button
            key={opt.id}
            type="button"
            className={`${styles.sputumCircle} ${value === opt.id ? styles.sputumCircleSelected : ""}`}
            style={{ backgroundColor: opt.hex }}
            onClick={() => onChange(opt.id)}
            title={bilingual(opt.en, opt.tKey)}
          >
            {value === opt.id && <span className={styles.sputumCheckmark}>✓</span>}
          </button>
        ))}
      </div>
      <p className={styles.sputumLabel}>
        {selected ? bilingual(selected.en, selected.tKey) : bilingual("Tap to select color", "sputum_tap_color")}
      </p>
    </div>
  );
}

// ── Breathlessness Status Tracker ────────────────────────────────────────────
export type BreathlessnessStatus = "no_change" | "improvement" | "deterioration";

export interface BreathlessnessData {
  status: BreathlessnessStatus | null;
  spo2Rest: string;
  spo2Exertion: string;
  increasedOxygenReq: boolean | null;
  additionalLitres: string;
}

export function BreathlessnessTracker({
  data,
  onChange,
  prevMmrc,
}: {
  data: BreathlessnessData;
  onChange: (d: Partial<BreathlessnessData>) => void;
  prevMmrc?: number | null;
}) {
  const { bilingual } = useLanguage();
  const STATUS_OPTIONS: { id: BreathlessnessStatus; label: string; tKey: keyof Translations; color: string }[] = [
    { id: "improvement",  label: "Improved", tKey: "bs_improved", color: "#2e9e5b" },
    { id: "deterioration",label: "Worsened", tKey: "bs_worsened", color: "#e24b4a" },
    { id: "no_change",    label: "Static",   tKey: "bs_static",   color: "var(--med-blue-600, #1e6091)" },
  ];

  return (
    <div>
      <p className={styles.fieldLabel}>
        {bilingual("Breathlessness Status Today", "bs_status_today")}
        {prevMmrc !== null && prevMmrc !== undefined && (
          <span style={{ marginLeft: 8, fontSize: 11, color: "#888680", fontWeight: 400 }}>
            (Yesterday mMRC: {prevMmrc})
          </span>
        )}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: `1.5px solid ${data.status === opt.id ? opt.color : "#d4cfc7"}`,
              background: data.status === opt.id ? opt.color : "white",
              color: data.status === opt.id ? "white" : "#3d3a35",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => onChange({
              status: opt.id,
              increasedOxygenReq: opt.id === "deterioration" ? true : null,
              additionalLitres: opt.id === "deterioration" ? data.additionalLitres : "",
              spo2Rest: opt.id === "deterioration" ? data.spo2Rest : "",
              spo2Exertion: opt.id === "deterioration" ? data.spo2Exertion : "",
            })}
          >
            {bilingual(opt.label, opt.tKey)}
          </button>
        ))}
      </div>

      {data.status === "deterioration" && (
        <div style={{ marginTop: 16, padding: 14, background: "#fff5f5", borderRadius: 8, border: "1px solid #fca5a5" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#3d3a35", display: "block", marginBottom: 4 }}>
            {bilingual("How many litres of oxygen?", "bs_oxygen_litres")}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number" min="0" max="15" step="0.5"
              style={{ width: 120, padding: "8px 10px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 14 }}
              placeholder="e.g. 2"
              value={data.additionalLitres}
              onChange={e => onChange({ increasedOxygenReq: true, additionalLitres: e.target.value })}
            />
            <span style={{ fontSize: 12, color: "#888680" }}>L/min</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Comprehensive Symptoms Tracker ────────────────────────────────────────────
export interface SymptomEntry {
  vas: number | null;
  feverTempF?: string;
  haemoptysisML?: string;
  othersText?: string;
}

export type SymptomsData = Record<string, SymptomEntry>;

export const SYMPTOM_LIST: { id: string; label: string; tKey: keyof Translations }[] = [
  { id: "cough",                    label: "Cough",                       tKey: "sym_cough" },
  { id: "expectoration",            label: "Expectoration",               tKey: "sym_expectoration" },
  { id: "breathlessness",           label: "Breathlessness",              tKey: "sym_breathlessness" },
  { id: "chest_pain",               label: "Chest Pain",                  tKey: "sym_chest_pain" },
  { id: "haemoptysis",              label: "Haemoptysis",                 tKey: "sym_haemoptysis" },
  { id: "fever",                    label: "Fever",                       tKey: "sym_fever" },
  { id: "cold_symptoms",            label: "Cold Symptoms",               tKey: "sym_cold_symptoms" },
  { id: "pedal_edema",              label: "Pedal Edema",                 tKey: "sym_pedal_edema" },
  { id: "stridor",                  label: "Stridor",                     tKey: "sym_stridor" },
  { id: "difficulty_lying_down",    label: "Difficulty Lying Down",       tKey: "sym_difficulty_lying_down" },
  { id: "difficulty_swallowing",    label: "Difficulty Swallowing",       tKey: "sym_difficulty_swallowing" },
  { id: "excessive_daytime_sleep",  label: "Excessive Daytime Sleepiness",tKey: "sym_excessive_daytime_sleep" },
  { id: "others",                   label: "Others",                      tKey: "sym_others" },
];

export function SymptomsTracker({
  data,
  onChange,
  prevData,
}: {
  data: SymptomsData;
  onChange: (d: SymptomsData) => void;
  prevData?: SymptomsData;
}) {
  const { t, bilingual } = useLanguage();
  const toggleSymptom = (id: string) => {
    const next = { ...data };
    if (next[id]) {
      delete next[id];
    } else {
      next[id] = { vas: null } as SymptomEntry;
    }
    onChange(next);
  };

  const updateSymptom = (id: string, updates: Partial<SymptomEntry>) => {
    const existing = data[id] ?? { vas: null } as SymptomEntry;
    const merged: SymptomEntry = { ...existing, ...updates, vas: updates.vas !== undefined ? updates.vas : existing.vas };
    onChange({ ...data, [id]: merged });
  };

  return (
    <div>
      <p className={styles.fieldLabel} style={{ marginBottom: 4 }}>
        {bilingual("Symptoms Severity (0-10)", "symptom_questions")}
      </p>
      <p style={{ margin: "0 0 12px", fontSize: 11, color: "#7b756d", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {t("symptoms_today_sub", "Symptoms today (select symptom and rate 0-10; 0 = none, 10 = severe)")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {SYMPTOM_LIST.map(sym => {
          const isActive = !!data[sym.id];
          return (
            <button
              key={sym.id}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 20,
                border: `1.5px solid ${isActive ? "var(--med-blue-600, #1e6091)" : "#d4cfc7"}`,
                background: isActive ? "#e8f5f1" : "white",
                color: isActive ? "var(--med-blue-600, #1e6091)" : "#3d3a35",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
              }}
              onClick={() => toggleSymptom(sym.id)}
            >
              <span>{bilingual(sym.label, sym.tKey)}</span>
            </button>
          );
        })}
      </div>

      {/* VAS ratings for selected symptoms */}
      {Object.keys(data).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {SYMPTOM_LIST.filter(sym => data[sym.id]).map(sym => {
            const entry = data[sym.id]!;
            const prev = prevData?.[sym.id];
            return (
              <div key={sym.id} style={{ padding: 12, background: "#fff", borderRadius: 10, border: "1px solid #f1d8bc", boxShadow: "0 1px 5px rgba(90, 56, 24, 0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a1a18" }}>
                    {bilingual(sym.label, sym.tKey)}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ minWidth: 18, textAlign: "right", fontSize: 14, fontWeight: 800, color: (entry.vas ?? 0) >= 8 ? "#e24b4a" : (entry.vas ?? 0) >= 5 ? "#ef9f27" : "var(--med-blue-600, #1e6091)" }}>
                      {entry.vas ?? 0}{prev?.vas !== null && prev?.vas !== undefined ? ` (${prev.vas})` : ""}
                    </span>
                  </div>
                </div>
                <div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={entry.vas ?? 0}
                    aria-label={`${sym.label} severity. 0 is none and 10 is severe.`}
                    onChange={(event) => updateSymptom(sym.id, { vas: Number(event.target.value) })}
                    style={{
                      width: "100%",
                      cursor: "pointer",
                      accentColor: (entry.vas ?? 0) >= 8 ? "#e24b4a" : (entry.vas ?? 0) >= 5 ? "#ef9f27" : "var(--med-blue-600, #1e6091)",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, fontWeight: 700, color: "#807a72" }}>
                    <span>0 = None</span>
                    <span>10 = Severe</span>
                  </div>
                </div>
                {/* Fever: show temperature field */}
                {sym.id === "fever" && entry.vas !== null && entry.vas > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#3d3a35", display: "block", marginBottom: 4 }}>
                      {bilingual("Body Temperature (°F)", "temperature")}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number" step="0.1" min="95" max="110"
                        style={{ width: 100, padding: "7px 10px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 14 }}
                        placeholder="e.g. 101.2"
                        value={entry.feverTempF ?? ""}
                        onChange={e => updateSymptom(sym.id, { feverTempF: e.target.value })}
                      />
                      <span style={{ fontSize: 13, color: "#888680" }}>°F</span>
                    </div>
                  </div>
                )}
                {/* Haemoptysis: show blood quantity field */}
                {sym.id === "haemoptysis" && entry.vas !== null && entry.vas > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#e24b4a", display: "block", marginBottom: 4 }}>
                      {bilingual("Blood coughed out (mL)", "sym_blood_coughed")}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number" step="1" min="0"
                        style={{ width: 100, padding: "7px 10px", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 14 }}
                        placeholder="e.g. 5"
                        value={entry.haemoptysisML ?? ""}
                        onChange={e => updateSymptom(sym.id, { haemoptysisML: e.target.value })}
                      />
                      <span style={{ fontSize: 13, color: "#888680" }}>mL</span>
                    </div>
                  </div>
                )}
                {/* Others: show free text */}
                {sym.id === "others" && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="text"
                      style={{ width: "100%", padding: "7px 10px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 14 }}
                      placeholder={bilingual("Describe other symptoms", "sym_describe_others")}
                      value={entry.othersText ?? ""}
                      onChange={e => updateSymptom(sym.id, { othersText: e.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SubmitBtn({ 
  canSubmit, 
  onSubmit, 
  label = "Submit Today's Log →", 
  labelHi,
  isLoading = false 
}: {
  canSubmit: boolean; 
  onSubmit: () => void; 
  label?: string;
  labelHi?: string;
  isLoading?: boolean;
}) {
  const { bilingual } = useLanguage();
  return (
    <div className={styles.submitRow}>
      {!canSubmit && !isLoading && (
        <p className={styles.submitHint}>
          <AlertCircle size={11} /> 
          {bilingual("Complete required fields", "complete_required_fields")}
        </p>
      )}
      <button 
        type="button" 
        className={styles.submitBtn} 
        disabled={!canSubmit || isLoading} 
        onClick={onSubmit}
      >
        {isLoading ? (
          <span className={styles.btnLoading}>
            <span className={styles.spinner} /> {bilingual("Processing...", "submitting")}
          </span>
        ) : (
          <>{labelHi ? `${label} ${labelHi}` : bilingual(label, "submit_daily_log")}</>
        )}
      </button>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
export function SuccessScreen({ onReset }: { onReset: () => void }) {
  const { t, bilingual } = useLanguage();
  return (
    <div className={styles.successWrap}>
      <div className={styles.successIcon}><CheckCircle size={40} strokeWidth={1.5} /></div>
      <h2 className={styles.successTitle}>{bilingual("Logged successfully!", "log_success")}</h2>
      <p className={styles.successSub}>{t("logged_success_sub", "Your doctor has been notified with your latest health log.")}</p>
      <button type="button" className={styles.btnPrimary} onClick={onReset}>{bilingual("Log Again", "log_again_btn")}</button>
    </div>
  );
}

// ── VAS Symptoms Payload Builder ──────────────────────────────────────────────
export function buildVasSymptomsPayload(
  symptomsData: SymptomsData,
  additionalMappings: Record<string, number> = {}
): Record<string, number> {
  const result: Record<string, number> = {};

  // Add VAS values from symptoms data
  Object.entries(symptomsData).forEach(([symptomId, entry]) => {
    if (entry.vas !== null && entry.vas !== undefined) {
      result[symptomId] = entry.vas;
    }
  });

  // Add additional VAS mappings (fatigue, chest_pain, anxiety)
  Object.entries(additionalMappings).forEach(([key, value]) => {
    result[key] = value;
  });

  return result;
}

// ── Side Effects Payload Builder ──────────────────────────────────────────────
export function sideEffectsPayload(
  sideEffectsSet: Set<string>,
  otherText: string
): string[] | null {
  const result = Array.from(sideEffectsSet);
  if (otherText?.trim()) {
    result.push(otherText);
  }
  return result.length > 0 ? result : null;
}

// ── Oxygen Requirement Extractor ──────────────────────────────────────────────
export function oxygenLitresFromBreathlessness(
  data: BreathlessnessData
): number | null {
  if (data.increasedOxygenReq === true && data.additionalLitres) {
    const litres = Number(data.additionalLitres);
    return !isNaN(litres) ? litres : null;
  }
  return null;
}

// ── Respiratory Support Status Mapper ────────────────────────────────────────
export function respiratorySupportFromBreathlessness(
  status: BreathlessnessStatus | null
): "static" | "worsening" | "improvement" | null {
  if (!status) return null;
  
  switch (status) {
    case "no_change":
      return "static";
    case "deterioration":
      return "worsening";
    case "improvement":
      return "improvement";
    default:
      return null;
  }
}
