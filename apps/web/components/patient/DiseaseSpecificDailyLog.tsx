"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertCircle, Activity, Wind, Sparkles, HeartPulse } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Translations } from "@/lib/i18n/translations";
import dStyles from "@/components/patient/disease.module.css";
import type { DailyLogPayload } from "@/lib/server/log-schema";

type DashboardType = "asthma" | "copd" | "bronchiectasis" | "ild" | "post_icu";
type YesNoValue = boolean | null;
type DiseaseLogPatch = Partial<DailyLogPayload>;

interface DiseaseSpecificDailyLogProps {
  dashboard: DashboardType;
  onChange: (data: DiseaseLogPatch) => void;
}

const boxStyle: CSSProperties = {
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 10,
  padding: 14,
  background: "#ffffff",
};

const questionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 800,
  color: "var(--med-navy-800, #0f2b48)",
  lineHeight: 1.35,
};

const subStyle: CSSProperties = {
  display: "block",
  marginTop: 3,
  fontSize: 12,
  fontWeight: 500,
  color: "#6d8794",
  lineHeight: 1.45,
};

const helpStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 12,
  color: "#5e6f75",
  lineHeight: 1.5,
};

const pillGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const ASTHMA_CONTROL_QUESTIONS = [
  {
    title: "Daytime Symptoms",
    titleKey: "ac_q1_title" as keyof Translations,
    prompt: "Asthma symptoms more than twice a week?",
    promptKey: "ac_q1_prompt" as keyof Translations,
  },
  {
    title: "Night Waking",
    titleKey: "ac_q2_title" as keyof Translations,
    prompt: "Any night waking due to asthma?",
    promptKey: "ac_q2_prompt" as keyof Translations,
  },
  {
    title: "Reliever Use",
    titleKey: "ac_q3_title" as keyof Translations,
    prompt: "Need for reliever/rescue inhaler more than twice a week?",
    promptKey: "ac_q3_prompt" as keyof Translations,
  },
  {
    title: "Activity Limitation",
    titleKey: "ac_q4_title" as keyof Translations,
    prompt: "Any limitation in activities, exercise, or work due to asthma?",
    promptKey: "ac_q4_prompt" as keyof Translations,
  },
];

const SPUTUM_VOLUME_OPTIONS = [
  { value: "none", label: "None", tKey: "vol_none" as keyof Translations },
  { value: "less_than_usual", label: "Small Amount (< 1 tsp)", tKey: "vol_small" as keyof Translations },
  { value: "usual", label: "Moderate Amount (1–2 tbsp)", tKey: "vol_moderate" as keyof Translations },
  { value: "large_amount", label: "Large Amount (> 2 tbsp)", tKey: "vol_large" as keyof Translations },
] as const;

const BRONCH_VOLUME_OPTIONS = [
  { value: "none", label: "None", tKey: "vol_none" as keyof Translations },
  { value: "less_than_usual", label: "Small Amount (< 1 tsp)", tKey: "vol_small" as keyof Translations },
  { value: "more_than_usual", label: "Moderate Amount (1–2 tbsp)", tKey: "vol_moderate" as keyof Translations },
  { value: "much_more_than_usual", label: "Large Amount (> 2 tbsp)", tKey: "vol_large" as keyof Translations },
] as const;

const COPD_SPUTUM_COLOUR_OPTIONS = [
  { value: "clear", label: "White/Clear", tKey: "color_clear" as keyof Translations, note: "Mucoid", color: "#f8fafc" },
  { value: "yellow", label: "Pale Yellow", tKey: "color_yellow" as keyof Translations, note: "Mucopurulent", color: "#facc15" },
  { value: "green", label: "Dark Green", tKey: "color_dark_green" as keyof Translations, note: "Purulent, potential infection", color: "#166534" },
  { value: "blood_streaked", label: "Red/Rusty", tKey: "color_blood_tinged" as keyof Translations, note: "Blood-streaked, emergency alert", color: "#991b1b" },
] as const;

const COPD_HEMOPTYSIS_VOLUME_OPTIONS = [
  { value: "streaks", label: "Blood streaks only" },
  { value: "cup", label: "One cup or more" },
  { value: "massive", label: "Massive bleeding" },
] as const;

const BRONCH_SPUTUM_COLOUR_OPTIONS = [
  { value: "clear", label: "White/Clear", tKey: "color_clear" as keyof Translations, note: "Mucoid", color: "#f8fafc" },
  { value: "pale_yellow", label: "Pale Yellow", tKey: "color_yellow" as keyof Translations, note: "Mucopurulent", color: "#facc15" },
  { value: "dark_green", label: "Dark Green", tKey: "color_dark_green" as keyof Translations, note: "Purulent, potential infection", color: "#166534" },
  { value: "blood_streaked", label: "Red/Rusty", tKey: "color_blood_tinged" as keyof Translations, note: "Blood-streaked, emergency alert", color: "#991b1b" },
] as const;

const KBILD_QUESTIONS = [
  {
    text: "In the last 2 weeks, I have been breathless climbing stairs or walking up an incline or hill.",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, because of my lung condition, my chest has felt tight.",
    optionSet: "time",
  },
  {
    text: "In the last 2 weeks, have you worried about the seriousness of your lung complaint?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, have you avoided doing things that make you breathless?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, have you felt in control of your lung condition?",
    optionSet: "time",
  },
  {
    text: "In the last 2 weeks, has your lung complaint made you feel fed up or down in the dumps?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, have you felt the urge to breathe, also known as air hunger?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, has your lung condition made you feel anxious?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, how often have you experienced wheeze or whistling sounds from your chest?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, how much of the time have you felt your lung disease is getting worse?",
    optionSet: "time",
  },
  {
    text: "In the last 2 weeks, has your lung condition interfered with your job or other daily tasks?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, have you expected your lung complaint to get worse?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, how much has your lung condition limited you carrying things, for example groceries?",
    optionSet: "time",
  },
  {
    text: "In the last 2 weeks, has your lung condition made you think more about the end of your life?",
    optionSet: "frequency",
  },
  {
    text: "Are you financially worse off because of your lung condition?",
    optionSet: "financial",
  },
] as const;

const KBILD_OPTIONS = {
  frequency: [
    "Every time",
    "Most times",
    "Several times",
    "Sometimes",
    "Occasionally",
    "Rarely",
    "Never",
  ],
  time: [
    "All of the time",
    "Most of the time",
    "A good bit of the time",
    "Some of the time",
    "A little of the time",
    "Hardly any of the time",
    "None of the time",
  ],
  financial: [
    "A significant amount",
    "A large amount",
    "A considerable amount",
    "A reasonable amount",
    "A small amount",
    "Hardly at all",
    "Not at all",
  ],
} as const;

function YesNoToggle({
  value,
  onChange,
}: {
  value: YesNoValue;
  onChange: (value: boolean) => void;
}) {
  const { bilingual } = useLanguage();
  return (
    <div className={dStyles.yesNoRow} style={{ marginTop: 10 }}>
      <button
        type="button"
        className={dStyles.yesNoBtn}
        style={
          value === true
            ? {
                background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)",
                borderColor: "#38bdf8",
                color: "#0369a1",
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(56, 189, 248, 0.18)",
              }
            : {}
        }
        onClick={() => onChange(true)}
      >
        <span>{bilingual("Yes", "yes")}</span>
      </button>
      <button
        type="button"
        className={dStyles.yesNoBtn}
        style={
          value === false
            ? {
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                borderColor: "#94a3b8",
                color: "#334155",
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(148, 163, 184, 0.15)",
              }
            : {}
        }
        onClick={() => onChange(false)}
      >
        <span>{bilingual("No", "no")}</span>
      </button>
    </div>
  );
}

function NumberField({
  label,
  labelHi,
  unit,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  labelHi?: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number | string;
}) {
  return (
    <div>
      <label className={dStyles.fieldLabel}>
        {label}
        {labelHi && <span className={dStyles.fieldLabelHi}>{labelHi}</span>}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        className={dStyles.numInput}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {unit && <p className={dStyles.cardSub} style={{ marginTop: 6, marginBottom: 0 }}>{unit}</p>}
    </div>
  );
}

function OptionPills<TValue extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: TValue; label: string; tKey?: keyof Translations; note?: string; color?: string }[];
  value: TValue | null;
  onChange: (value: TValue) => void;
}) {
  const { bilingual } = useLanguage();
  return (
    <div style={pillGridStyle}>
      {options.map((option) => {
        const active = value === option.value;
        const displayLabel = option.tKey ? bilingual(option.label, option.tKey) : option.label;
        return (
          <button
            key={option.value}
            type="button"
            className={dStyles.yesNoBtn}
            style={{
              textAlign: "left",
              borderColor: active ? "var(--med-blue-600, #1e6091)" : undefined,
              background: active ? "#f0f9ff" : undefined,
              color: "#1a1a18",
            }}
            onClick={() => onChange(option.value)}
          >
            {option.color && (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 22,
                  height: 12,
                  borderRadius: 999,
                  marginRight: 8,
                  border: "1px solid rgba(0,0,0,0.16)",
                  background: option.color,
                  verticalAlign: "middle",
                }}
              />
            )}
            <span>{displayLabel}</span>
            {option.note && <span style={{ display: "block", marginTop: 5, fontSize: 11, color: "#6d8794" }}>{option.note}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ScaleButtons({
  value,
  onChange,
  min,
  max,
  labels,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  labels?: Record<number, string>;
}) {
  return (
    <div className={dStyles.scaleRow} style={{ flexWrap: "wrap", marginTop: 10 }}>
      {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((score) => (
        <button
          key={score}
          type="button"
          className={`${dStyles.scaleBtn} ${value === score ? dStyles.scaleBtnActive : ""}`}
          style={{ minWidth: 44, height: labels ? 54 : 40 }}
          onClick={() => onChange(score)}
        >
          <span>{score}</span>
          {labels?.[score] && <span style={{ display: "block", fontSize: 10, marginTop: 2 }}>{labels[score]}</span>}
        </button>
      ))}
    </div>
  );
}

function RangeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className={dStyles.fieldLabel}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          type="range"
          min="0"
          max="10"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ flex: 1, accentColor: "var(--med-blue-600, #1e6091)" }}
        />
        <span style={{ minWidth: 42, textAlign: "center", fontWeight: 800, color: "var(--med-navy-800, #0f2b48)" }}>{value}/10</span>
      </div>
    </div>
  );
}

function AsthmaSecondHalf({ onChange }: { onChange: (data: DiseaseLogPatch) => void }) {
  const { t, bilingual } = useLanguage();
  const [responses, setResponses] = useState<YesNoValue[]>([null, null, null, null]);
  const [puffs, setPuffs] = useState("");
  const [pefr, setPefr] = useState("");
  const [showControlPopup, setShowControlPopup] = useState(false);
  const [lastPopupStatus, setLastPopupStatus] = useState<string | null>(null);
  const yesCount = responses.filter(Boolean).length;
  const allControlAnswered = responses.every((value) => value !== null);
  const status = yesCount === 0 ? "well_controlled" : yesCount <= 2 ? "partly_controlled" : "poorly_controlled";
  
  const statusLabel =
    status === "well_controlled"
      ? { en: "Well Controlled", tKey: "ac_well_controlled" as keyof Translations, color: "var(--med-blue-600, #1e6091)" }
      : status === "partly_controlled"
        ? { en: "Partly Controlled", tKey: "ac_partly_controlled" as keyof Translations, color: "#b7791f" }
        : { en: "Poorly Controlled", tKey: "ac_poorly_controlled" as keyof Translations, color: "#c2410c" };

  useEffect(() => {
    onChange({
      asthma_control_responses: allControlAnswered ? responses.map((value) => value === true) : null,
      asthma_control_yes_count: allControlAnswered ? yesCount : null,
      asthma_control_status: allControlAnswered ? status : null,
      rescue_inhaler_puffs: puffs !== "" ? Number(puffs) : null,
      pefr_reading: pefr !== "" ? Number(pefr) : null,
      pefr_lpm: pefr !== "" ? Number(pefr) : null,
    } as DiseaseLogPatch);
  }, [allControlAnswered, onChange, pefr, puffs, responses, status, yesCount]);

  useEffect(() => {
    if (!allControlAnswered) return;
    if (lastPopupStatus === status) return;

    setLastPopupStatus(status);
    setShowControlPopup(true);
  }, [allControlAnswered, lastPopupStatus, status]);

  return (
    <>
      {showControlPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Asthma control classification"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(19,45,54,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowControlPopup(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              borderRadius: 8,
              background: "#fff",
              padding: 22,
              boxShadow: "0 20px 60px rgba(19,45,54,0.2)",
              borderTop: `5px solid ${statusLabel.color}`,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#6d8794", fontWeight: 700 }}>
              {bilingual("Asthma control today", "asthma_control_title")}
            </p>
            <h2 style={{ margin: "6px 0 8px", fontSize: 24, color: statusLabel.color, letterSpacing: 0 }}>
              {bilingual(statusLabel.en, statusLabel.tKey)}
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#496977", lineHeight: 1.5 }}>
              Based on {yesCount} positive answer{yesCount === 1 ? "" : "s"} out of 4.
            </p>
            <button
              type="button"
              className={dStyles.yesNoBtn}
              style={{
                width: "100%",
                background: statusLabel.color,
                borderColor: statusLabel.color,
                color: "#fff",
                justifyContent: "center",
              }}
              onClick={() => setShowControlPopup(false)}
            >
              {bilingual("Continue", "continue")}
            </button>
          </div>
        </div>
      )}

      <div className={`${dStyles.card} ${dStyles.diseaseCard}`}>
        <div className={dStyles.sectionHeaderRow}>
          <div className={dStyles.sectionHeaderLeft}>
            <div className={dStyles.sectionIconRoundel} style={{ background: "#f5f3ff", color: "#7c3aed" }}>
              <Activity size={18} />
            </div>
            <div>
              <h2 className={dStyles.sectionTitle}>{bilingual("Asthma Control", "asthma_control_title")}</h2>
              <p className={dStyles.sectionSub}>{t("asthma_control_sub", "My Asthma Control (Last 4 Weeks)")}</p>
            </div>
          </div>
          <span className={dStyles.sectionBadge} style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}>
            Asthma Action
          </span>
        </div>

        <p className={dStyles.cardSub}>
          {bilingual("Over the last 4 weeks, have you had:", "asthma_control_4w_prompt")}
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          {ASTHMA_CONTROL_QUESTIONS.map((question, index) => (
            <div key={question.title} style={boxStyle}>
              <p style={questionTitleStyle}>
                {bilingual(`${index + 1}. ${question.title}`, question.titleKey)}
              </p>
              <p style={helpStyle}>
                {bilingual(question.prompt, question.promptKey)}
              </p>
              <YesNoToggle
                value={responses[index] ?? null}
                onChange={(value) => setResponses((current) => current.map((entry, itemIndex) => itemIndex === index ? value : entry))}
              />
            </div>
          ))}
        </div>
        <div className={dStyles.warningBanner} style={{ marginTop: 14, borderColor: statusLabel.color, background: yesCount >= 3 ? "#fff7ed" : "#f0faf5" }}>
          <AlertCircle size={16} color={statusLabel.color} />
          <div>
            <strong style={{ color: statusLabel.color }}>{bilingual(statusLabel.en, statusLabel.tKey)}</strong>
            {yesCount >= 3 && <p style={helpStyle}>Doctor alert will be triggered because 3 or more answers are Yes.</p>}
          </div>
        </div>
      </div>

      <div className={`${dStyles.card} ${dStyles.diseaseCard}`}>
        <div className={dStyles.sectionHeaderRow}>
          <div className={dStyles.sectionHeaderLeft}>
            <div className={dStyles.sectionIconRoundel} style={{ background: "#f5f3ff", color: "#7c3aed" }}>
              <Wind size={18} />
            </div>
            <div>
              <h2 className={dStyles.sectionTitle}>{bilingual("Daily Asthma Tracking", "log_today_title")}</h2>
              <p className={dStyles.sectionSub}>PEFR & Rescue Puffs</p>
            </div>
          </div>
          <span className={dStyles.sectionBadge} style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}>
            Peak Flow
          </span>
        </div>
        <div className={dStyles.grid2}>
          <NumberField
            label={bilingual("Rescue Inhaler Puffs", "ac_rescue_puffs")}
            value={puffs}
            onChange={setPuffs}
          />
          <NumberField
            label={bilingual("Peak Flow (PEFR)", "ac_pefr_reading")}
            unit="L/min"
            value={pefr}
            onChange={setPefr}
          />
        </div>
      </div>
    </>
  );
}

function SputumWarning({ colour }: { colour: string | null }) {
  if (colour === "blood_streaked") {
    return (
      <div className={dStyles.emergencyAlert} style={{ marginTop: 14 }}>
        <span className={dStyles.emergencyPulse} />
        <p className={dStyles.emergencyText}>
          <strong>Emergency alert.</strong> Red or rusty sputum can indicate blood. Doctor will be alerted immediately.
        </p>
      </div>
    );
  }

  if (colour === "dark_green" || colour === "green") {
    return (
      <div className={dStyles.warningBanner} style={{ marginTop: 14 }}>
        <AlertCircle size={16} />
        <p style={helpStyle}>
          Potential infection warning. Doctor will be alerted for review.
        </p>
      </div>
    );
  }

  return null;
}

function COPDSecondHalf({ onChange }: { onChange: (data: DiseaseLogPatch) => void }) {
  const { bilingual } = useLanguage();
  const [cough, setCough] = useState<number | null>(null);
  const [volume, setVolume] = useState<(typeof SPUTUM_VOLUME_OPTIONS)[number]["value"] | null>(null);
  const [colour, setColour] = useState<(typeof COPD_SPUTUM_COLOUR_OPTIONS)[number]["value"] | null>(null);
  const [exercise, setExercise] = useState<YesNoValue>(null);
  const [sleep, setSleep] = useState<YesNoValue>(null);
  const [energy, setEnergy] = useState(5);
  const [chest, setChest] = useState(0);
  const [haemoptysisVolume, setHaemoptysisVolume] =
    useState<(typeof COPD_HEMOPTYSIS_VOLUME_OPTIONS)[number]["value"] | null>(null);

  useEffect(() => {
    if (colour !== "blood_streaked" && haemoptysisVolume !== null) {
      setHaemoptysisVolume(null);
    }

    onChange({
      cough_frequency: cough,
      sputum_volume: volume,
      sputum_colour: colour === "blood_streaked" ? null : colour,
      exercise_tolerance: exercise,
      exercise_tolerance_good: exercise,
      sleep_disturbed: sleep,
      energy_level: energy,
      chest_heaviness: chest,
      haemoptysis: colour === "blood_streaked" ? true : null,
      haemoptysis_volume: colour === "blood_streaked" ? haemoptysisVolume : null,
      vas_symptoms: { chest_heaviness: chest },
    } as DiseaseLogPatch);
  }, [chest, colour, cough, energy, exercise, haemoptysisVolume, onChange, sleep, volume]);

  return (
    <div className={`${dStyles.card} ${dStyles.diseaseCard}`}>
      <div className={dStyles.sectionHeaderRow}>
        <div className={dStyles.sectionHeaderLeft}>
          <div className={dStyles.sectionIconRoundel} style={{ background: "#f5f3ff", color: "#7c3aed" }}>
            <Activity size={18} />
          </div>
          <div>
            <h2 className={dStyles.sectionTitle}>COPD Impact & Sputum</h2>
            <p className={dStyles.sectionSub}>Symptom Impact & Sputum Monitoring</p>
          </div>
        </div>
        <span className={dStyles.sectionBadge} style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}>
          COPD Actions
        </span>
      </div>

      <p className={dStyles.cardSub}>Symptom Impact Weekly</p>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>1. {bilingual("Cough Severity", "cough")}</p>
          <ScaleButtons value={cough} onChange={setCough} min={0} max={4} labels={{ 0: "None", 1: "Rare", 2: "Some", 3: "Most", 4: "Constant" }} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>2. {bilingual("Sputum (Mucus) Volume", "sputum_volume")}</p>
          <OptionPills options={SPUTUM_VOLUME_OPTIONS} value={volume} onChange={setVolume} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>3. {bilingual("Sputum (Mucus) Color", "sputum_color")}</p>
          <OptionPills options={COPD_SPUTUM_COLOUR_OPTIONS} value={colour} onChange={setColour} />
          <SputumWarning colour={colour} />
          {colour === "blood_streaked" && (
            <div style={{ marginTop: 12 }}>
              <p style={questionTitleStyle}>Hemoptysis amount</p>
              <OptionPills
                options={COPD_HEMOPTYSIS_VOLUME_OPTIONS}
                value={haemoptysisVolume}
                onChange={setHaemoptysisVolume}
              />
            </div>
          )}
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>4. Exercise Tolerance</p>
          <p style={helpStyle}>Can you keep up with others your age when walking?</p>
          <YesNoToggle value={exercise} onChange={setExercise} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>5. Sleep Quality</p>
          <p style={helpStyle}>Did your COPD symptoms disturb your sleep last night?</p>
          <YesNoToggle value={sleep} onChange={setSleep} />
        </div>
      </div>

      <p className={dStyles.cardSub} style={{ marginTop: 18 }}>Exacerbation Risk Daily</p>
      <div className={dStyles.grid2}>
        <RangeSlider label={bilingual("Tiredness / Fatigue", "fatigue")} value={energy} onChange={setEnergy} />
        <RangeSlider label={bilingual("Chest Pain / Tightness", "chest_pain")} value={chest} onChange={setChest} />
      </div>
    </div>
  );
}

function BronchLikeSecondHalf({ dashboard, onChange }: { dashboard: DashboardType; onChange: (data: DiseaseLogPatch) => void }) {
  const { bilingual } = useLanguage();
  const [volume, setVolume] = useState<(typeof BRONCH_VOLUME_OPTIONS)[number]["value"] | null>(null);
  const [colour, setColour] = useState<(typeof BRONCH_SPUTUM_COLOUR_OPTIONS)[number]["value"] | null>(null);
  const [clearance, setClearance] = useState<number | null>(null);
  const [feverish, setFeverish] = useState<YesNoValue>(null);
  const [temperature, setTemperature] = useState("");
  const [malaise, setMalaise] = useState<YesNoValue>(null);

  useEffect(() => {
    onChange({
      sputum_volume: volume,
      sputum_colour: colour === "blood_streaked" ? null : colour,
      ease_of_sputum_clearance: clearance,
      ease_of_clearance: clearance,
      feverish_or_temp_gt_102: feverish,
      recorded_temperature_f: temperature !== "" ? Number(temperature) : null,
      temperature_f: temperature !== "" ? Number(temperature) : feverish === true ? 102 : null,
      malaise,
      haemoptysis: colour === "blood_streaked" ? true : null,
    } as DiseaseLogPatch);
  }, [clearance, colour, feverish, malaise, onChange, temperature, volume]);

  const isPostIcu = dashboard === "post_icu";

  return (
    <div className={`${dStyles.card} ${dStyles.diseaseCard}`}>
      <div className={dStyles.sectionHeaderRow}>
        <div className={dStyles.sectionHeaderLeft}>
          <div className={dStyles.sectionIconRoundel} style={{ background: "#f5f3ff", color: "#7c3aed" }}>
            <Activity size={18} />
          </div>
          <div>
            <h2 className={dStyles.sectionTitle}>
              {isPostIcu ? "Post ICU Sputum & Flare Log" : "Bronchiectasis Sputum Log"}
            </h2>
            <p className={dStyles.sectionSub}>Sputum & Flare Monitoring</p>
          </div>
        </div>
        <span className={dStyles.sectionBadge} style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}>
          Sputum & Flare
        </span>
      </div>

      <p className={dStyles.cardSub}>Sputum and Flare Tracker Daily</p>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>1. {bilingual("Sputum (Mucus) Volume", "sputum_volume")}</p>
          <OptionPills options={BRONCH_VOLUME_OPTIONS} value={volume} onChange={setVolume} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>2. {bilingual("Sputum (Mucus) Color", "sputum_color")}</p>
          <OptionPills options={BRONCH_SPUTUM_COLOUR_OPTIONS} value={colour} onChange={setColour} />
          <SputumWarning colour={colour} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>3. {bilingual("Ease of Sputum Clearance", "ease_of_clearance")}</p>
          <p style={helpStyle}>How hard was it to clear your chest today?</p>
          <ScaleButtons
            value={clearance}
            onChange={setClearance}
            min={1}
            max={5}
            labels={{ 1: "Easy", 2: "Mild", 3: "Moderate", 4: "Very hard", 5: "Extreme" }}
          />
        </div>
      </div>

      <p className={dStyles.cardSub} style={{ marginTop: 18 }}>Infection Screen Daily</p>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>4. {bilingual("Fever / High Temperature", "fever")}</p>
          <p style={helpStyle}>Do you feel feverish or have a recorded temperature above 102°F?</p>
          <YesNoToggle value={feverish} onChange={setFeverish} />
          {feverish === true && (
            <div style={{ marginTop: 12 }}>
              <NumberField label={bilingual("Body Temperature (°F)", "temperature")} unit="°F" value={temperature} onChange={setTemperature} min={90} max={115} step="0.1" />
            </div>
          )}
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>5. {bilingual("Flu-like Malaise or Exhaustion", "malaise")}</p>
          <p style={helpStyle}>Do you feel flu-like or unusually exhausted today?</p>
          <YesNoToggle value={malaise} onChange={setMalaise} />
        </div>
      </div>
    </div>
  );
}

function ILDSecondHalf({ onChange }: { onChange: (data: DiseaseLogPatch) => void }) {
  const [responses, setResponses] = useState<Record<number, number>>({});
  const answeredCount = Object.keys(responses).length;
  const totalScore = Object.values(responses).reduce((total, score) => total + score, 0);
  const percentage = answeredCount > 0 ? Math.round((totalScore / (answeredCount * 7)) * 100) : 0;

  useEffect(() => {
    onChange({
      kbild_responses: responses,
      kbild_score: answeredCount > 0 ? percentage : null,
      kbild_answered_count: answeredCount,
    } as DiseaseLogPatch);
  }, [answeredCount, onChange, percentage, responses]);

  const progressText = useMemo(() => `${answeredCount}/15 answered`, [answeredCount]);

  return (
    <div className={`${dStyles.card} ${dStyles.diseaseCard}`}>
      <div className={dStyles.sectionHeaderRow}>
        <div className={dStyles.sectionHeaderLeft}>
          <div className={dStyles.sectionIconRoundel} style={{ background: "#f5f3ff", color: "#7c3aed" }}>
            <Activity size={18} />
          </div>
          <div>
            <h2 className={dStyles.sectionTitle}>K-BILD Quality of Life</h2>
            <p className={dStyles.sectionSub}>Quality of Life Questionnaire</p>
          </div>
        </div>
        <span className={dStyles.sectionBadge} style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}>
          ILD Assessment
        </span>
      </div>

      <p className={dStyles.cardSub}>
        The King&apos;s Brief Interstitial Lung Disease Questionnaire for quality of life assessment in ILD patients.
      </p>
      <p className={dStyles.cardSub}>Answer based on the last 2 weeks.</p>

      <div style={{ display: "grid", gap: 14 }}>
        {KBILD_QUESTIONS.map((question, index) => {
          const questionNumber = index + 1;
          const options = KBILD_OPTIONS[question.optionSet];
          return (
            <div key={questionNumber} style={boxStyle}>
              <p style={questionTitleStyle}>
                {questionNumber}. {question.text}
              </p>
              <div className={dStyles.scaleRow} style={{ flexWrap: "wrap", marginTop: 12 }}>
                {options.map((label, optionIndex) => {
                  const score = optionIndex + 1;
                  return (
                    <button
                      key={score}
                      type="button"
                      className={`${dStyles.scaleBtn} ${responses[questionNumber] === score ? dStyles.scaleBtnActive : ""}`}
                      style={{ minWidth: 112, height: "auto", padding: "9px 8px", lineHeight: 1.35 }}
                      onClick={() => setResponses((current) => ({ ...current, [questionNumber]: score }))}
                    >
                      <span>{score}</span>
                      <span style={{ display: "block", fontSize: 10, marginTop: 3 }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className={dStyles.warningBanner} style={{ marginTop: 16, background: "#f0faf5", borderColor: "var(--med-blue-600, #1e6091)" }}>
        <div>
          <strong>Final score</strong>
          <p style={helpStyle}>{progressText} · Total score: {totalScore} · Percentage score: {percentage}/100</p>
        </div>
      </div>
    </div>
  );
}

export function DiseaseSpecificDailyLog({ dashboard, onChange }: DiseaseSpecificDailyLogProps) {
  if (dashboard === "asthma") return <AsthmaSecondHalf onChange={onChange} />;
  if (dashboard === "copd") return <COPDSecondHalf onChange={onChange} />;
  if (dashboard === "bronchiectasis" || dashboard === "post_icu") {
    return <BronchLikeSecondHalf dashboard={dashboard} onChange={onChange} />;
  }
  if (dashboard === "ild") return <ILDSecondHalf onChange={onChange} />;
  return null;
}
