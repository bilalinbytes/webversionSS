"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, CloudSun, ShieldAlert } from "lucide-react";
import styles from "./shared.module.css";

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
              background: i >= 8 ? "#e24b4a" : i >= 5 ? "#ef9f27" : "#0f6e56",
              borderColor: i >= 8 ? "#e24b4a" : i >= 5 ? "#ef9f27" : "#0f6e56",
            } : {}}
            onClick={() => onChange(i)}
          >{i}</button>
        ))}
      </div>
      <div className={styles.vasHints}>
        <span>None · कोई नहीं</span><span>Moderate · मध्यम</span><span>Worst · सबसे खराब</span>
      </div>
      {value !== null && (
        <p className={styles.vasSelected} style={{ color: value >= 8 ? "#e24b4a" : value >= 5 ? "#ef9f27" : "#0f6e56" }}>
          {value}/10 — {value >= 8 ? "Severe — contact your doctor · गंभीर — डॉक्टर से संपर्क करें" : value >= 5 ? "Moderate · मध्यम" : "Manageable · प्रबंधनीय"}
        </p>
      )}
    </div>
  );
}

// ── mMRC Picker ───────────────────────────────────────────────────────────────
export function MMRCPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const grades = [
    { g: 0, label: "No breathlessness", labelHi: "सांस नहीं फूलना", sub: "Only with strenuous exercise", subHi: "केवल कठिन व्यायाम के साथ" },
    { g: 1, label: "Mild",              labelHi: "हल्का", sub: "Hurrying or walking uphill", subHi: "जल्दी में या चढ़ाई पर चलते समय" },
    { g: 2, label: "Moderate",          labelHi: "मध्यम", sub: "Walk slower than peers on flat", subHi: "समतल पर साथियों से धीरे चलना" },
    { g: 3, label: "Severe",            labelHi: "गंभीर", sub: "Stop after 100m on flat", subHi: "100 मीटर चलने के बाद रुकना" },
    { g: 4, label: "Very severe",       labelHi: "बहुत गंभीर", sub: "Too breathless to leave house", subHi: "घर से बाहर निकलने में बहुत परेशानी" },
  ];
  return (
    <div className={styles.mmrcWrap}>
      {grades.map(({ g, label, labelHi, sub, subHi }) => (
        <button key={g} type="button"
          className={`${styles.mmrcBtn} ${value === g ? styles.mmrcBtnActive : ""} ${g >= 3 ? styles.mmrcWarnBtn : ""}`}
          onClick={() => onChange(g)}
        >
          <span className={`${styles.mmrcNum} ${value === g ? styles.mmrcNumActive : ""} ${value === g && g >= 3 ? styles.mmrcNumWarn : ""}`}>{g}</span>
          <div className={styles.mmrcText}>
            <div className={styles.mmrcTitleRow}>
              <span className={styles.mmrcLabel}>{label}</span>
              <span className={styles.mmrcLabelHi}>{labelHi}</span>
            </div>
            <span className={styles.mmrcSub}>{sub}</span>
            <span className={styles.mmrcSubHi}>{subHi}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── SpO2 Input ────────────────────────────────────────────────────────────────
export function SpO2Input({ value, onChange, label = "SpO₂ at Rest", isCOPD = false }: {
  value: string; onChange: (v: string) => void; label?: string; isCOPD?: boolean;
}) {
  const num = Number(value);
  const threshold = isCOPD ? 88 : 94;
  const isLow = value !== "" && num < threshold;
  return (
    <div className={styles.spo2Wrap}>
      <label className={styles.fieldLabel}>{label} <span className={styles.req}>*</span></label>
      <div className={styles.spo2InputRow}>
        <input type="number" min="70" max="100"
          className={`${styles.spo2Input} ${isLow ? styles.spo2InputWarn : ""}`}
          placeholder="e.g. 94" value={value}
          onChange={e => onChange(e.target.value)}
        />
        <span className={styles.spo2Unit}>%</span>
      </div>
      {isCOPD && <p className={styles.spo2Target}>Target: 88–92% for COPD · लक्ष्य: 88–92%</p>}
      {!isCOPD && <p className={styles.spo2Target}>Target: &gt;94% · लक्ष्य: &gt;94%</p>}
      {isLow && (
        <span className={styles.warnMsg}><AlertCircle size={11} /> Below target — contact your doctor · लक्ष्य से कम — डॉक्टर से संपर्क करें</span>
      )}
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
    tone: "#0f6e56",
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

// ── Medication Checklist ──────────────────────────────────────────────────────
interface Med { id: string; name: string; dose: string; route: string; frequency: string; }

export function MedChecklist({ meds, taken, onToggle }: {
  meds: Med[]; taken: Record<string, boolean>; onToggle: (id: string) => void;
}) {
  const takenCount = Object.values(taken).filter(Boolean).length;
  return (
    <div className={styles.medWrap}>
      <div className={styles.medHeader}>
        <p className={styles.medTitle}>Medications Today · आज की दवाएं</p>
        <span className={`${styles.medBadge} ${takenCount === meds.length ? styles.medBadgeDone : ""}`}>
          {takenCount}/{meds.length} taken · ली गई
        </span>
      </div>
      <div className={styles.medList}>
        {meds.map(med => (
          <button key={med.id} type="button"
            className={`${styles.medItem} ${taken[med.id] ? styles.medItemTaken : ""}`}
            onClick={() => onToggle(med.id)}
          >
            <div className={`${styles.medCheck} ${taken[med.id] ? styles.medCheckDone : ""}`}>
              {taken[med.id] && <CheckCircle size={13} strokeWidth={2.5} />}
            </div>
            <div className={styles.medInfo}>
              <p className={styles.medName}>{med.name} <span className={styles.medDose}>{med.dose}</span></p>
              <p className={styles.medFreq}>{med.route} · {med.frequency}</p>
            </div>
            <span className={`${styles.medStatus} ${taken[med.id] ? styles.medStatusTaken : styles.medStatusPending}`}>
              {taken[med.id] ? "Taken · ली गई" : "Tap to mark · मार्क करें"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Side Effects ──────────────────────────────────────────────────────────────
const SIDE_EFFECTS = [
  { id: "nausea",         label: "Nausea",          labelHi: "मतली" },
  { id: "vomiting",       label: "Vomiting",        labelHi: "उल्टी" },
  { id: "diarrhea",       label: "Diarrhea",        labelHi: "दस्त" },
  { id: "fever",          label: "Fever",           labelHi: "बुखार" },
  { id: "headache",       label: "Headache",        labelHi: "सिरदर्द" },
  { id: "abdominal_pain", label: "Abdominal Pain",  labelHi: "पेट दर्द" },
  { id: "rash",           label: "Rashes",          labelHi: "चकत्ते" },
  { id: "dizziness",      label: "Dizziness",       labelHi: "चक्कर" },
  { id: "palpitation",    label: "Palpitations",    labelHi: "धड़कन" },
  { id: "tremor",         label: "Tremor",          labelHi: "कंपन" },
  { id: "insomnia",       label: "Insomnia",        labelHi: "नींद न आना" },
  { id: "appetite",       label: "Poor Appetite",   labelHi: "भूख न लगना" },
  { id: "others",         label: "Others",          labelHi: "अन्य" },
];

export function SideEffectsPicker({ selected, onToggle, othersText, onOthersTextChange }: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  othersText?: string;
  onOthersTextChange?: (text: string) => void;
}) {
  return (
    <div className={styles.seWrap}>
      <p className={styles.seTitle}>Side Effects Today · आज के दुष्प्रभाव</p>
      <p className={styles.seSub}>Tap any you&apos;re experiencing · जो भी हो रहा हो उसे चुनें</p>
      <div className={styles.seGrid}>
        {SIDE_EFFECTS.map(se => (
          <button key={se.id} type="button"
            className={`${styles.seChip} ${selected.has(se.id) ? styles.seChipActive : ""}`}
            onClick={() => onToggle(se.id)}
          >
            <span className={styles.seLabel}>{se.label} · {se.labelHi}</span>
          </button>
        ))}
      </div>
      {selected.has("others") && onOthersTextChange && (
        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Describe other side effects · अन्य दुष्प्रभाव बताएं"
            value={othersText ?? ""}
            onChange={e => onOthersTextChange(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #d4cfc7", borderRadius: 6, fontSize: 14 }}
          />
        </div>
      )}
      {selected.size === 0 && <p className={styles.seNone}>None today · आज कोई नहीं</p>}
    </div>
  );
}

// ── Doctor note card ──────────────────────────────────────────────────────────
export function DoctorNoteCard({ note }: { note: string }) {
  return (
    <div className={styles.doctorNote}>
      <span className={styles.doctorNoteIcon}>Note</span>
      <div className={styles.doctorNoteBody}>
        <p className={styles.doctorNoteLabel}>
          Doctor&apos;s Note
          <span className={styles.doctorNoteLabelHi}>· डॉक्टर का संदेश</span>
        </p>
        <p className={styles.doctorNoteText}>{note}</p>
      </div>
    </div>
  );
}

// ── Yellow management tips ─────────────────────────────────────────────────────
type YellowTipsDisease = "asthma" | "copd" | "bronchiectasis" | "ild" | "post_icu";

const YELLOW_TIPS: Record<YellowTipsDisease, { en: string; hi: string }[]> = {
  asthma: [
    { en: "Keep your rescue inhaler close at all times", hi: "बचाव इनहेलर हमेशा पास रखें" },
    { en: "Avoid triggers: smoke, dust, cold air, pets", hi: "ट्रिगर से बचें: धुआं, धूल, ठंडी हवा" },
    { en: "Take your controller inhaler as prescribed", hi: "नियंत्रण इनहेलर समय पर लें" },
    { en: "Check peak flow if you feel any chest tightness", hi: "सीने में जकड़न हो तो पीक फ्लो मापें" },
  ],
  copd: [
    { en: "Rest frequently — pace yourself through the day", hi: "बार-बार आराम करें, जल्दबाजी न करें" },
    { en: "Use pursed-lip breathing during any exertion", hi: "परिश्रम के दौरान होंठ सिकोड़कर सांस लें" },
    { en: "Stay warm and avoid cold, damp air", hi: "गर्म रहें, ठंडी और नम हवा से बचें" },
    { en: "Drink warm fluids to loosen secretions", hi: "स्राव ढीला करने के लिए गर्म तरल पदार्थ पिएं" },
  ],
  bronchiectasis: [
    { en: "Do airway clearance exercises 3 times today", hi: "आज 3 बार वायुमार्ग सफाई व्यायाम करें" },
    { en: "Stay well hydrated to thin secretions", hi: "स्राव पतला करने के लिए खूब पानी पिएं" },
    { en: "Monitor sputum — report any colour change", hi: "थूक की निगरानी करें — रंग बदले तो बताएं" },
    { en: "Avoid crowded or smoky environments today", hi: "आज भीड़ या धुएंदार जगहों से दूर रहें" },
  ],
  ild: [
    { en: "Rest if short of breath — do not push through it", hi: "सांस फूले तो आराम करें — जबरदस्ती न करें" },
    { en: "Use supplemental oxygen if your doctor prescribed it", hi: "यदि डॉक्टर ने निर्धारित किया हो तो ऑक्सीजन लें" },
    { en: "Avoid dust, pollution and strong chemical fumes", hi: "धूल, प्रदूषण और तेज रासायनिक धुएं से बचें" },
    { en: "Take your antifibrotic medication on schedule", hi: "फाइब्रोसिस की दवा समय पर लें, छोड़ें नहीं" },
  ],
  post_icu: [
    { en: "Rest often — ICU recovery takes weeks, be patient", hi: "बार-बार आराम करें — ICU के बाद ठीक होने में हफ्ते लगते हैं" },
    { en: "Do gentle breathing exercises as advised", hi: "डॉक्टर के बताए अनुसार हल्के सांस व्यायाम करें" },
    { en: "Eat small nutritious meals regularly", hi: "छोटे-छोटे पौष्टिक भोजन नियमित रूप से लें" },
    { en: "Maintain a regular sleep routine and avoid stress", hi: "नियमित नींद की दिनचर्या बनाएं और तनाव से बचें" },
  ],
};

export function YellowTipsCard({ disease }: { disease: YellowTipsDisease }) {
  const tips = YELLOW_TIPS[disease];
  return (
    <div className={styles.yellowTips}>
      <div className={styles.yellowTipsHeader}>
        <span className={styles.yellowTipsIcon}>!</span>
        <p className={styles.yellowTipsTitle}>Management Tips · प्रबंधन सुझाव</p>
      </div>
      <div className={styles.yellowTipsList}>
        {tips.map((tip) => (
          <div key={tip.en} className={styles.yellowTip}>
            <span className={styles.yellowTipDot} />
            <div className={styles.yellowTipContent}>
              <span className={styles.yellowTipEn}>{tip.en}</span>
              <span className={styles.yellowTipHi}>{tip.hi}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sputum Colour Picker ──────────────────────────────────────────────────────
export type SputumColour = "clear" | "white" | "yellow" | "green" | "dark_green" | "brown" | "blood_streaked";

const SPUTUM_COLOUR_OPTS: { id: SputumColour; hex: string; en: string; hi: string }[] = [
  { id: "clear", hex: "#E8F4F8", en: "Clear", hi: "साफ" },
  { id: "white", hex: "#F5F5F5", en: "White", hi: "सफेद" },
  { id: "yellow", hex: "#F5E642", en: "Yellow", hi: "पीला" },
  { id: "green", hex: "#7BC67E", en: "Green", hi: "हरा" },
  { id: "dark_green", hex: "#2D6A4F", en: "Dark green", hi: "गहरा हरा" },
  { id: "brown", hex: "#8B5E3C", en: "Brown", hi: "भूरा" },
  { id: "blood_streaked", hex: "#C0392B", en: "Blood-streaked", hi: "खून मिला" },
];

export function SputumColourPicker({ value, onChange }: { value: SputumColour | null; onChange: (v: SputumColour) => void }) {
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
            title={`${opt.en} · ${opt.hi}`}
          >
            {value === opt.id && <span className={styles.sputumCheckmark}>✓</span>}
          </button>
        ))}
      </div>
      <p className={styles.sputumLabel}>
        {selected ? `${selected.en} · ${selected.hi}` : "Tap to select colour · रंग चुनें"}
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
  const STATUS_OPTIONS: { id: BreathlessnessStatus; label: string; labelHi: string; color: string }[] = [
    { id: "improvement",  label: "Improved", labelHi: "सुधार", color: "#2e9e5b" },
    { id: "deterioration",label: "Worsened", labelHi: "बिगड़ा", color: "#e24b4a" },
    { id: "no_change",    label: "Static",   labelHi: "स्थिर", color: "#0f6e56" },
  ];

  return (
    <div>
      <p className={styles.fieldLabel}>
        Breathlessness Status Today · आज सांस फूलने की स्थिति
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
            {opt.label} · {opt.labelHi}
          </button>
        ))}
      </div>

      {data.status === "deterioration" && (
        <div style={{ marginTop: 16, padding: 14, background: "#fff5f5", borderRadius: 8, border: "1px solid #fca5a5" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#3d3a35", display: "block", marginBottom: 4 }}>
            How many litres of oxygen? · ऑक्सीजन कितने लीटर?
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

const SYMPTOM_LIST = [
  { id: "cough",                    label: "Cough",                       labelHi: "खांसी" },
  { id: "expectoration",            label: "Expectoration",               labelHi: "बलगम" },
  { id: "breathlessness",           label: "Breathlessness",              labelHi: "सांस फूलना" },
  { id: "chest_pain",               label: "Chest Pain",                  labelHi: "सीने में दर्द" },
  { id: "haemoptysis",              label: "Haemoptysis",                 labelHi: "खून की खांसी" },
  { id: "fever",                    label: "Fever",                       labelHi: "बुखार" },
  { id: "cold_symptoms",            label: "Cold Symptoms",               labelHi: "सर्दी के लक्षण" },
  { id: "pedal_edema",              label: "Pedal Edema",                 labelHi: "पैरों में सूजन" },
  { id: "stridor",                  label: "Stridor",                     labelHi: "सांस में आवाज़" },
  { id: "difficulty_lying_down",    label: "Difficulty Lying Down",       labelHi: "लेटने में तकलीफ" },
  { id: "difficulty_swallowing",    label: "Difficulty Swallowing",       labelHi: "निगलने में तकलीफ" },
  { id: "excessive_daytime_sleep",  label: "Excessive Daytime Sleepiness",labelHi: "दिन में अत्यधिक नींद" },
  { id: "others",                   label: "Others",                      labelHi: "अन्य" },
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
        Symptoms Severity (0-10) · लक्षणों की तीव्रता
      </p>
      <p style={{ margin: "0 0 12px", fontSize: 11, color: "#7b756d", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Symptoms today · आज के लक्षण (select symptom and rate 0-10 · लक्षण चुनें और 0-10 रेट करें; 0 = none/नहीं, 10 = severe/गंभीर)
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
                border: `1.5px solid ${isActive ? "#0f6e56" : "#d4cfc7"}`,
                background: isActive ? "#e8f5f1" : "white",
                color: isActive ? "#0f6e56" : "#3d3a35",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
              }}
              onClick={() => toggleSymptom(sym.id)}
            >
              <span>{sym.label} · {sym.labelHi}</span>
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
                    {sym.label} · {sym.labelHi}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ minWidth: 18, textAlign: "right", fontSize: 14, fontWeight: 800, color: (entry.vas ?? 0) >= 8 ? "#e24b4a" : (entry.vas ?? 0) >= 5 ? "#ef9f27" : "#0f6e56" }}>
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
                      accentColor: (entry.vas ?? 0) >= 8 ? "#e24b4a" : (entry.vas ?? 0) >= 5 ? "#ef9f27" : "#0f6e56",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, fontWeight: 700, color: "#807a72" }}>
                    <span>0 = None · नहीं</span>
                    <span>10 = Severe · गंभीर</span>
                  </div>
                </div>
                {/* Fever: show temperature field */}
                {sym.id === "fever" && entry.vas !== null && entry.vas > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#3d3a35", display: "block", marginBottom: 4 }}>
                      Temperature · तापमान
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
                      Blood coughed out · खून की मात्रा
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
                      placeholder="Describe other symptoms · अन्य लक्षण बताएं"
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
  labelHi = "दैनिक लॉग जमा करें",
  isLoading = false 
}: {
  canSubmit: boolean; 
  onSubmit: () => void; 
  label?: string;
  labelHi?: string;
  isLoading?: boolean;
}) {
  return (
    <div className={styles.submitRow}>
      {!canSubmit && !isLoading && (
        <p className={styles.submitHint}>
          <AlertCircle size={11} /> 
          Complete required fields · आवश्यक फ़ील्ड भरें
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
            <span className={styles.spinner} /> Processing... · प्रक्रिया जारी है...
          </span>
        ) : (
          <>{label} <span className={styles.btnLabelHi}>{labelHi}</span></>
        )}
      </button>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
export function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className={styles.successWrap}>
      <div className={styles.successIcon}><CheckCircle size={40} strokeWidth={1.5} /></div>
      <h2 className={styles.successTitle}>Logged successfully! · सफलतापूर्वक लॉग किया गया!</h2>
      <p className={styles.successSub}>Your doctor has been notified. डॉक्टर को सूचित कर दिया गया है।</p>
      <button type="button" className={styles.btnPrimary} onClick={onReset}>Log Again · फिर से लॉग करें</button>
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
