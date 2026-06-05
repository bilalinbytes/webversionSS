"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertCircle } from "lucide-react";
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
  color: "#132d36",
  lineHeight: 1.35,
};

const hindiStyle: CSSProperties = {
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
    titleHi: "दिन में लक्षण",
    prompt: "Asthma symptoms more than twice a week?",
    promptHi: "क्या अस्थमा के लक्षण सप्ताह में दो बार से अधिक हुए?",
  },
  {
    title: "Night Waking",
    titleHi: "रात में नींद खुलना",
    prompt: "Any night waking due to asthma?",
    promptHi: "क्या अस्थमा के कारण रात में नींद खुली?",
  },
  {
    title: "Reliever Use",
    titleHi: "रिलीवर / रेस्क्यू इनहेलर का उपयोग",
    prompt: "Need for reliever/rescue inhaler more than twice a week?",
    promptHi: "क्या रिलीवर या रेस्क्यू इनहेलर की जरूरत सप्ताह में दो बार से अधिक पड़ी?",
  },
  {
    title: "Activity Limitation",
    titleHi: "गतिविधि में कमी",
    prompt: "Any limitation in activities, exercise, or work due to asthma?",
    promptHi: "क्या अस्थमा के कारण व्यायाम, काम या सामान्य गतिविधि में रुकावट हुई?",
  },
];

const SPUTUM_VOLUME_OPTIONS = [
  { value: "none", label: "None", hi: "नहीं" },
  { value: "less_than_usual", label: "Small, teaspoon", hi: "कम, चम्मच जितना" },
  { value: "usual", label: "Moderate, tablespoon", hi: "मध्यम, बड़ा चम्मच जितना" },
  { value: "large_amount", label: "Large, cup or more", hi: "ज्यादा, कप या अधिक" },
] as const;

const BRONCH_VOLUME_OPTIONS = [
  { value: "none", label: "None", hi: "नहीं" },
  { value: "less_than_usual", label: "Small, teaspoon", hi: "कम, चम्मच जितना" },
  { value: "more_than_usual", label: "Moderate, tablespoon", hi: "मध्यम, बड़ा चम्मच जितना" },
  { value: "much_more_than_usual", label: "Large, cup or more", hi: "ज्यादा, कप या अधिक" },
] as const;

const COPD_SPUTUM_COLOUR_OPTIONS = [
  { value: "clear", label: "White/Clear", hi: "सफेद या साफ", note: "Mucoid", color: "#f8fafc" },
  { value: "yellow", label: "Pale Yellow", hi: "हल्का पीला", note: "Mucopurulent", color: "#facc15" },
  { value: "green", label: "Dark Green", hi: "गहरा हरा", note: "Purulent, potential infection", color: "#166534" },
  { value: "blood_streaked", label: "Red/Rusty", hi: "लाल या जंग जैसा", note: "Blood-streaked, emergency alert", color: "#991b1b" },
] as const;

const COPD_HEMOPTYSIS_VOLUME_OPTIONS = [
  { value: "streaks", label: "Blood streaks only", hi: "Streaks" },
  { value: "cup", label: "One cup or more", hi: "Cup or more" },
  { value: "massive", label: "Massive bleeding", hi: "Massive" },
] as const;

const BRONCH_SPUTUM_COLOUR_OPTIONS = [
  { value: "clear", label: "White/Clear", hi: "सफेद या साफ", note: "Mucoid", color: "#f8fafc" },
  { value: "pale_yellow", label: "Pale Yellow", hi: "हल्का पीला", note: "Mucopurulent", color: "#facc15" },
  { value: "dark_green", label: "Dark Green", hi: "गहरा हरा", note: "Purulent, potential infection", color: "#166534" },
  { value: "blood_streaked", label: "Red/Rusty", hi: "लाल या जंग जैसा", note: "Blood-streaked, emergency alert", color: "#991b1b" },
] as const;

const KBILD_QUESTIONS = [
  {
    text: "In the last 2 weeks, I have been breathless climbing stairs or walking up an incline or hill.",
    hi: "पिछले 2 सप्ताह में सीढ़ियां चढ़ते या चढ़ाई पर चलते समय मेरी सांस फूली है।",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, because of my lung condition, my chest has felt tight.",
    hi: "पिछले 2 सप्ताह में फेफड़ों की बीमारी के कारण मेरी छाती में जकड़न महसूस हुई है।",
    optionSet: "time",
  },
  {
    text: "In the last 2 weeks, have you worried about the seriousness of your lung complaint?",
    hi: "पिछले 2 सप्ताह में क्या आप अपनी फेफड़ों की बीमारी की गंभीरता को लेकर चिंतित रहे हैं?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, have you avoided doing things that make you breathless?",
    hi: "पिछले 2 सप्ताह में क्या आपने ऐसे कामों से बचा है जिनसे सांस फूलती है?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, have you felt in control of your lung condition?",
    hi: "पिछले 2 सप्ताह में क्या आपको लगा कि आपकी फेफड़ों की बीमारी नियंत्रण में है?",
    optionSet: "time",
  },
  {
    text: "In the last 2 weeks, has your lung complaint made you feel fed up or down in the dumps?",
    hi: "पिछले 2 सप्ताह में क्या फेफड़ों की बीमारी के कारण आप उदास या परेशान महसूस हुए हैं?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, have you felt the urge to breathe, also known as air hunger?",
    hi: "पिछले 2 सप्ताह में क्या आपको हवा की कमी या सांस लेने की तीव्र जरूरत महसूस हुई है?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, has your lung condition made you feel anxious?",
    hi: "पिछले 2 सप्ताह में क्या फेफड़ों की बीमारी के कारण आपको चिंता हुई है?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, how often have you experienced wheeze or whistling sounds from your chest?",
    hi: "पिछले 2 सप्ताह में आपकी छाती से घरघराहट या सीटी जैसी आवाज कितनी बार आई?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, how much of the time have you felt your lung disease is getting worse?",
    hi: "पिछले 2 सप्ताह में आपको कितनी बार लगा कि आपकी फेफड़ों की बीमारी बिगड़ रही है?",
    optionSet: "time",
  },
  {
    text: "In the last 2 weeks, has your lung condition interfered with your job or other daily tasks?",
    hi: "पिछले 2 सप्ताह में क्या फेफड़ों की बीमारी ने आपके काम या दैनिक कार्यों में बाधा डाली?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, have you expected your lung complaint to get worse?",
    hi: "पिछले 2 सप्ताह में क्या आपको लगा कि आपकी फेफड़ों की समस्या और खराब हो सकती है?",
    optionSet: "frequency",
  },
  {
    text: "In the last 2 weeks, how much has your lung condition limited you carrying things, for example groceries?",
    hi: "पिछले 2 सप्ताह में फेफड़ों की बीमारी ने सामान उठाने, जैसे किराना, में आपको कितना सीमित किया?",
    optionSet: "time",
  },
  {
    text: "In the last 2 weeks, has your lung condition made you think more about the end of your life?",
    hi: "पिछले 2 सप्ताह में क्या फेफड़ों की बीमारी ने आपको जीवन के अंत के बारे में अधिक सोचने पर मजबूर किया?",
    optionSet: "frequency",
  },
  {
    text: "Are you financially worse off because of your lung condition?",
    hi: "क्या फेफड़ों की बीमारी के कारण आपकी आर्थिक स्थिति खराब हुई है?",
    optionSet: "financial",
  },
] as const;

const KBILD_OPTIONS = {
  frequency: [
    "Every time / हर बार",
    "Most times / अधिकतर बार",
    "Several times / कई बार",
    "Sometimes / कभी-कभी",
    "Occasionally / कभी-कभार",
    "Rarely / शायद ही कभी",
    "Never / कभी नहीं",
  ],
  time: [
    "All of the time / हर समय",
    "Most of the time / अधिकतर समय",
    "A good bit of the time / काफी समय",
    "Some of the time / कुछ समय",
    "A little of the time / थोड़ा समय",
    "Hardly any of the time / बहुत कम समय",
    "None of the time / बिल्कुल नहीं",
  ],
  financial: [
    "A significant amount / बहुत अधिक",
    "A large amount / अधिक",
    "A considerable amount / काफी",
    "A reasonable amount / मध्यम",
    "A small amount / थोड़ा",
    "Hardly at all / बहुत कम",
    "Not at all / बिल्कुल नहीं",
  ],
} as const;

function BilingualTitle({ en, hi }: { en: string; hi: string }) {
  return (
    <>
      {en}
      <span className={dStyles.cardTitleHi}>{hi}</span>
    </>
  );
}

function YesNoToggle({
  value,
  onChange,
}: {
  value: YesNoValue;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={dStyles.yesNoRow} style={{ marginTop: 10 }}>
      <button
        type="button"
        className={dStyles.yesNoBtn}
        style={value === true ? { background: "#0f6e56", borderColor: "#0f6e56", color: "white" } : {}}
        onClick={() => onChange(true)}
      >
        <span>Yes</span>
        <span style={hindiStyle}>हाँ</span>
      </button>
      <button
        type="button"
        className={dStyles.yesNoBtn}
        style={value === false ? { background: "#e24b4a", borderColor: "#e24b4a", color: "white" } : {}}
        onClick={() => onChange(false)}
      >
        <span>No</span>
        <span style={hindiStyle}>नहीं</span>
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
  labelHi: string;
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
        <span className={dStyles.fieldLabelHi}>{labelHi}</span>
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
  options: readonly { value: TValue; label: string; hi: string; note?: string; color?: string }[];
  value: TValue | null;
  onChange: (value: TValue) => void;
}) {
  return (
    <div style={pillGridStyle}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={dStyles.yesNoBtn}
            style={{
              textAlign: "left",
              borderColor: active ? "#0f6e56" : undefined,
              background: active ? "#eef8f4" : undefined,
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
            <span>{option.label}</span>
            <span style={hindiStyle}>{option.hi}</span>
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
  labelsHi,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  labels?: Record<number, string>;
  labelsHi?: Record<number, string>;
}) {
  return (
    <div className={dStyles.scaleRow} style={{ flexWrap: "wrap", marginTop: 10 }}>
      {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((score) => (
        <button
          key={score}
          type="button"
          className={`${dStyles.scaleBtn} ${value === score ? dStyles.scaleBtnActive : ""}`}
          style={{ minWidth: 44, height: labelsHi ? 68 : labels ? 54 : 40 }}
          onClick={() => onChange(score)}
        >
          <span>{score}</span>
          {labels?.[score] && <span style={{ display: "block", fontSize: 10, marginTop: 2 }}>{labels[score]}</span>}
          {labelsHi?.[score] && <span style={{ display: "block", fontSize: 10, marginTop: 2, color: "inherit", opacity: 0.78 }}>{labelsHi[score]}</span>}
        </button>
      ))}
    </div>
  );
}

function RangeSlider({
  label,
  labelHi,
  value,
  onChange,
}: {
  label: string;
  labelHi: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className={dStyles.fieldLabel}>
        {label}
        <span className={dStyles.fieldLabelHi}>{labelHi}</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          type="range"
          min="0"
          max="10"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ flex: 1, accentColor: "#0f6e56" }}
        />
        <span style={{ minWidth: 42, textAlign: "center", fontWeight: 800, color: "#132d36" }}>{value}/10</span>
      </div>
    </div>
  );
}

function AsthmaSecondHalf({ onChange }: { onChange: (data: DiseaseLogPatch) => void }) {
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
      ? { en: "Well Controlled", hi: "अच्छा नियंत्रण", color: "#0f6e56" }
      : status === "partly_controlled"
        ? { en: "Partly Controlled", hi: "आंशिक नियंत्रण", color: "#b7791f" }
        : { en: "Poorly Controlled", hi: "खराब नियंत्रण", color: "#c2410c" };

  useEffect(() => {
    onChange({
      asthma_control_responses: responses.map((value) => value === true),
      asthma_control_yes_count: yesCount,
      asthma_control_status: status,
      rescue_inhaler_puffs: puffs !== "" ? Number(puffs) : null,
      pefr_reading: pefr !== "" ? Number(pefr) : null,
      pefr_lpm: pefr !== "" ? Number(pefr) : null,
    } as DiseaseLogPatch);
  }, [onChange, pefr, puffs, responses, status, yesCount]);

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
              Asthma control today
            </p>
            <h2 style={{ margin: "6px 0 8px", fontSize: 24, color: statusLabel.color, letterSpacing: 0 }}>
              {statusLabel.en}
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
              Continue
            </button>
          </div>
        </div>
      )}

      <div className={dStyles.card}>
        <p className={dStyles.cardTitle}><BilingualTitle en="My Asthma Control" hi="मेरा अस्थमा नियंत्रण" /></p>
        <p className={dStyles.cardSub}>
          Over the last 4 weeks, have you had:
          <span className={dStyles.fieldLabelHi}>पिछले 4 सप्ताह में क्या आपको हुआ है:</span>
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          {ASTHMA_CONTROL_QUESTIONS.map((question, index) => (
            <div key={question.title} style={boxStyle}>
              <p style={questionTitleStyle}>
                {index + 1}. {question.title}
                <span style={hindiStyle}>{question.titleHi}</span>
              </p>
              <p style={helpStyle}>
                {question.prompt}
                <span style={hindiStyle}>{question.promptHi}</span>
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
            <strong style={{ color: statusLabel.color }}>{statusLabel.en}</strong>
            <span style={hindiStyle}>{statusLabel.hi}</span>
            {yesCount >= 3 && <p style={helpStyle}>Doctor alert will be triggered because 3 or more answers are Yes.</p>}
          </div>
        </div>
      </div>

      <div className={dStyles.card}>
        <p className={dStyles.cardTitle}><BilingualTitle en="Daily Tracking" hi="दैनिक ट्रैकिंग" /></p>
        <div className={dStyles.grid2}>
          <NumberField
            label="Rescue Puffs"
            labelHi="रेस्क्यू पफ"
            value={puffs}
            onChange={setPuffs}
          />
          <NumberField
            label="Peak Flow / PEFR"
            labelHi="पीक फ्लो / PEFR"
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
          <span style={hindiStyle}>संक्रमण की संभावना। डॉक्टर को समीक्षा के लिए सूचना भेजी जाएगी।</span>
        </p>
      </div>
    );
  }

  return null;
}

function COPDSecondHalf({ onChange }: { onChange: (data: DiseaseLogPatch) => void }) {
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
    <div className={dStyles.card}>
      <p className={dStyles.cardTitle}><BilingualTitle en="COPD Impact" hi="COPD प्रभाव" /></p>
      <p className={dStyles.cardSub}>Symptom Impact Weekly<span className={dStyles.fieldLabelHi}>साप्ताहिक लक्षण प्रभाव</span></p>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>1. Cough Frequency<span style={hindiStyle}>खांसी की आवृत्ति</span></p>
          <ScaleButtons value={cough} onChange={setCough} min={0} max={4} labels={{ 0: "None", 1: "Rare", 2: "Some", 3: "Most", 4: "Constant" }} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>2. Sputum Volume<span style={hindiStyle}>बलगम की मात्रा</span></p>
          <OptionPills options={SPUTUM_VOLUME_OPTIONS} value={volume} onChange={setVolume} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>3. Sputum Color<span style={hindiStyle}>बलगम का रंग</span></p>
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
          <p style={questionTitleStyle}>4. Exercise Tolerance<span style={hindiStyle}>व्यायाम सहनशीलता</span></p>
          <p style={helpStyle}>Can you keep up with others your age when walking?<span style={hindiStyle}>क्या चलते समय आप अपनी उम्र के लोगों के साथ चल पाते हैं?</span></p>
          <YesNoToggle value={exercise} onChange={setExercise} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>5. Sleep Quality<span style={hindiStyle}>नींद की गुणवत्ता</span></p>
          <p style={helpStyle}>Did your COPD symptoms disturb your sleep last night?<span style={hindiStyle}>क्या COPD लक्षणों के कारण पिछली रात आपकी नींद खराब हुई?</span></p>
          <YesNoToggle value={sleep} onChange={setSleep} />
        </div>
      </div>

      <p className={dStyles.cardSub} style={{ marginTop: 18 }}>Exacerbation Risk Daily<span className={dStyles.fieldLabelHi}>दैनिक बिगड़ने का जोखिम</span></p>
      <div className={dStyles.grid2}>
        <RangeSlider label="Energy Levels" labelHi="ऊर्जा स्तर" value={energy} onChange={setEnergy} />
        <RangeSlider label="Chest Heaviness" labelHi="छाती में भारीपन" value={chest} onChange={setChest} />
      </div>
    </div>
  );
}

function BronchLikeSecondHalf({ dashboard, onChange }: { dashboard: DashboardType; onChange: (data: DiseaseLogPatch) => void }) {
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
    <div className={dStyles.card}>
      <p className={dStyles.cardTitle}>
        <BilingualTitle
          en={isPostIcu ? "Post ICU Sputum and Flare Log" : "Bronchiectasis Log"}
          hi={isPostIcu ? "पोस्ट ICU बलगम और फ्लेयर लॉग" : "ब्रोंकिइक्टेसिस लॉग"}
        />
      </p>
      <p className={dStyles.cardSub}>Sputum and Flare Tracker Daily<span className={dStyles.fieldLabelHi}>दैनिक बलगम और फ्लेयर ट्रैकर</span></p>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>1. Sputum Volume<span style={hindiStyle}>बलगम की मात्रा</span></p>
          <OptionPills options={BRONCH_VOLUME_OPTIONS} value={volume} onChange={setVolume} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>2. Sputum Color<span style={hindiStyle}>बलगम का रंग</span></p>
          <OptionPills options={BRONCH_SPUTUM_COLOUR_OPTIONS} value={colour} onChange={setColour} />
          <SputumWarning colour={colour} />
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>3. Ease of Clearance<span style={hindiStyle}>बलगम निकालने में आसानी</span></p>
          <p style={helpStyle}>How hard was it to clear your chest today?<span style={hindiStyle}>आज छाती साफ करने या बलगम निकालने में कितनी कठिनाई हुई?</span></p>
          <ScaleButtons
            value={clearance}
            onChange={setClearance}
            min={1}
            max={5}
            labels={{ 1: "Easy", 2: "Mild", 3: "Moderate", 4: "Very hard", 5: "Extreme" }}
            labelsHi={{ 1: "आसान", 2: "हल्का", 3: "मध्यम", 4: "बहुत कठिन", 5: "अत्यधिक" }}
          />
        </div>
      </div>

      <p className={dStyles.cardSub} style={{ marginTop: 18 }}>Infection Screen Daily<span className={dStyles.fieldLabelHi}>दैनिक संक्रमण स्क्रीन</span></p>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>4. Temperature / Fever<span style={hindiStyle}>तापमान / बुखार</span></p>
          <p style={helpStyle}>Do you feel feverish or have a recorded temperature above 102°F?<span style={hindiStyle}>क्या आपको बुखार जैसा लग रहा है या तापमान 102°F से अधिक है?</span></p>
          <YesNoToggle value={feverish} onChange={setFeverish} />
          {feverish === true && (
            <div style={{ marginTop: 12 }}>
              <NumberField label="Recorded Temperature" labelHi="दर्ज तापमान" unit="°F" value={temperature} onChange={setTemperature} min={90} max={115} step="0.1" />
            </div>
          )}
        </div>
        <div style={boxStyle}>
          <p style={questionTitleStyle}>5. Malaise<span style={hindiStyle}>कमजोरी / फ्लू जैसा महसूस होना</span></p>
          <p style={helpStyle}>Do you feel flu-like or unusually exhausted today?<span style={hindiStyle}>क्या आपको फ्लू जैसा या असामान्य थकान महसूस हो रही है?</span></p>
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
    <div className={dStyles.card}>
      <p className={dStyles.cardTitle}><BilingualTitle en="K-BILD Questionnaire" hi="K-BILD प्रश्नावली" /></p>
      <p className={dStyles.cardSub}>
        The King&apos;s Brief Interstitial Lung Disease Questionnaire for quality of life assessment in ILD patients.
        <span className={dStyles.fieldLabelHi}>ILD मरीजों में जीवन की गुणवत्ता के आकलन के लिए K-BILD प्रश्नावली।</span>
      </p>
      <p className={dStyles.cardSub}>Answer based on the last 2 weeks.<span className={dStyles.fieldLabelHi}>पिछले 2 सप्ताह के आधार पर उत्तर दें।</span></p>

      <div style={{ display: "grid", gap: 14 }}>
        {KBILD_QUESTIONS.map((question, index) => {
          const questionNumber = index + 1;
          const options = KBILD_OPTIONS[question.optionSet];
          return (
            <div key={questionNumber} style={boxStyle}>
              <p style={questionTitleStyle}>
                {questionNumber}. {question.text}
                <span style={hindiStyle}>{question.hi}</span>
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

      <div className={dStyles.warningBanner} style={{ marginTop: 16, background: "#f0faf5", borderColor: "#0f6e56" }}>
        <div>
          <strong>Final score</strong>
          <span style={hindiStyle}>अंतिम स्कोर</span>
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
