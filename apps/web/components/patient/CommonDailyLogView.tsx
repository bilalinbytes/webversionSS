"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import {
  AQIDisplay,
  MMRCPicker,
  MedChecklist,
  SideEffectsPicker,
  SpO2Input,
  SymptomsTracker,
  BreathlessnessTracker,
  buildVasSymptomsPayload,
  oxygenLitresFromBreathlessness,
  respiratorySupportFromBreathlessness,
  sideEffectsPayload,
  type BreathlessnessData,
  type SymptomsData,
} from "@/components/patient/shared";
import { useAqi } from "@/hooks/useAqi";
import { usePatientLog } from "@/hooks/usePatientLog";
import { usePreviousDayLog } from "@/hooks/usePreviousDayLog";
import { DiseaseSpecificDailyLog } from "@/components/patient/DiseaseSpecificDailyLog";
import { createClient } from "@/lib/supabase/client";
import dStyles from "@/components/patient/disease.module.css";
import type { DailyLogPayload } from "@/lib/server/log-schema";

type DashboardType = "asthma" | "copd" | "bronchiectasis" | "ild" | "post_icu";
type RespiratorySupportPlan = {
  requires_support: boolean;
  ltot_enabled: boolean | null;
  ltot_litres: number | null;
  bipap_enabled: boolean | null;
  bipap_ipap: number | null;
  bipap_epap: number | null;
  bipap_requires_oxygen: boolean | null;
  bipap_oxygen_litres: number | null;
  invasive_vent_enabled: boolean | null;
  vent_ipap: number | null;
  vent_epap: number | null;
  vent_fio2_percent: number | null;
  tracheostomy_enabled: boolean | null;
  trach_requires_oxygen: boolean | null;
  trach_oxygen_litres: number | null;
  trach_requires_vent: boolean | null;
};
interface CommonDailyLogViewProps {
  dashboard: DashboardType;
  patientId: string;
  medicationMap: { id: string; name: string; dose: string; route: string; frequency: string }[];
  onSuccess?: () => void;
}

function dashboardLabel(dashboard: DashboardType) {
  if (dashboard === "post_icu") return "Post ICU";
  if (dashboard === "copd") return "COPD";
  if (dashboard === "ild") return "ILD";
  if (dashboard === "bronchiectasis") return "Bronchiectasis";
  return "Asthma";
}

function dashboardHindi(dashboard: DashboardType) {
  if (dashboard === "asthma") return "दमा";
  if (dashboard === "copd") return "COPD";
  if (dashboard === "bronchiectasis") return "ब्रोंकिएक्टेसिस";
  if (dashboard === "ild") return "फेफड़े का रोग (ILD)";
  return "Post ICU";
}

function respiratorySupportType(plan: RespiratorySupportPlan | null) {
  if (!plan?.requires_support) return null;
  if (plan.tracheostomy_enabled) return "tracheostomy";
  if (plan.invasive_vent_enabled) return "ventilator";
  if (plan.bipap_enabled) return "bipap_niv";
  if (plan.ltot_enabled) return "ltot";
  return "respiratory_support";
}

function respiratorySupportSummary(plan: RespiratorySupportPlan | null) {
  if (!plan?.requires_support) return "No respiratory support prescribed · श्वसन सपोर्ट नहीं है";

  const parts: string[] = [];
  if (plan.ltot_enabled) parts.push(`LTOT${plan.ltot_litres ? ` ${plan.ltot_litres} L/min` : ""}`);
  if (plan.bipap_enabled) {
    const pressure = [plan.bipap_ipap ? `IPAP ${plan.bipap_ipap}` : null, plan.bipap_epap ? `EPAP ${plan.bipap_epap}` : null].filter(Boolean).join(", ");
    const oxygen = plan.bipap_requires_oxygen ? ` + O2${plan.bipap_oxygen_litres ? ` ${plan.bipap_oxygen_litres} L/min` : ""}` : "";
    parts.push(`BiPAP/NIV${pressure ? ` (${pressure})` : ""}${oxygen}`);
  }
  if (plan.invasive_vent_enabled) {
    const vent = [plan.vent_ipap ? `IPAP ${plan.vent_ipap}` : null, plan.vent_epap ? `EPAP ${plan.vent_epap}` : null, plan.vent_fio2_percent ? `FiO2 ${plan.vent_fio2_percent}%` : null].filter(Boolean).join(", ");
    parts.push(`Ventilator${vent ? ` (${vent})` : ""}`);
  }
  if (plan.tracheostomy_enabled) {
    const trachOxygen = plan.trach_requires_oxygen ? ` + O2${plan.trach_oxygen_litres ? ` ${plan.trach_oxygen_litres} L/min` : ""}` : "";
    const trachVent = plan.trach_requires_vent ? " + vent" : "";
    parts.push(`Tracheostomy${trachOxygen}${trachVent}`);
  }

  return parts.length > 0
    ? `${parts.join(" · ")} · डॉक्टर द्वारा सेट`
    : "Respiratory support prescribed · डॉक्टर द्वारा सेट";
}

function parseOptionalNumber(value: string) {
  return value === "" ? null : Number(value);
}

function inRange(value: string, min: number, max: number) {
  if (value === "") return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

export function CommonDailyLogView({
  dashboard,
  patientId,
  medicationMap,
  onSuccess,
}: CommonDailyLogViewProps) {
  const { submitState, submitLog, errorMessage, limitReached, reset } = usePatientLog();
  const aqi = useAqi();
  const prevDay = usePreviousDayLog(patientId);
  const meds = medicationMap;

  const [spo2, setSpo2] = useState("");
  const [spo2Exertion, setSpo2Exertion] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [breathlessness, setBreathlessness] = useState<BreathlessnessData>({
    status: null,
    spo2Rest: "",
    spo2Exertion: "",
    increasedOxygenReq: null,
    additionalLitres: "",
  });
  const [supportEnabled, setSupportEnabled] = useState(false);
  const [supportType, setSupportType] = useState("");
  const [supportSummary, setSupportSummary] = useState("Loading doctor plan · डॉक्टर का प्लान लोड हो रहा है");
  const [mmrc, setMmrc] = useState<number | null>(null);
  const [medsTaken, setMedsTaken] = useState<Record<string, boolean>>({});
  const [sideEffects, setSideEffects] = useState<Set<string>>(new Set());
  const [sideEffectsOther, setSideEffectsOther] = useState("");
  const [symptomsData, setSymptomsData] = useState<SymptomsData>({});
  const [diseaseSpecificData, setDiseaseSpecificData] = useState<Partial<DailyLogPayload>>({});
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [emergencyStatus, setEmergencyStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [messageToastVisible, setMessageToastVisible] = useState(false);

  useEffect(() => {
    setMedsTaken((current) => Object.fromEntries(meds.map((m) => [m.id, current[m.id] ?? false])));
  }, [meds]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("respiratory_support")
      .select("requires_support,ltot_enabled,ltot_litres,bipap_enabled,bipap_ipap,bipap_epap,bipap_requires_oxygen,bipap_oxygen_litres,invasive_vent_enabled,vent_ipap,vent_epap,vent_fio2_percent,tracheostomy_enabled,trach_requires_oxygen,trach_oxygen_litres,trach_requires_vent")
      .eq("patient_id", patientId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const plan = data as RespiratorySupportPlan | null;
        const hasSupport = Boolean(plan?.requires_support);
        setSupportEnabled(hasSupport);
        setSupportType(respiratorySupportType(plan) ?? "");
        setSupportSummary(respiratorySupportSummary(plan));
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  useEffect(() => {
    if (emergencyStatus !== "sent") return;
    setMessageToastVisible(true);
    const timeout = window.setTimeout(() => setMessageToastVisible(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [emergencyStatus]);

  const spo2RestValid = inRange(spo2, 0, 100);
  const spo2ExertionValid = inRange(spo2Exertion, 0, 100);
  const heartRateValid = inRange(heartRate, 20, 250);
  const oxygenLitresValid = inRange(breathlessness.additionalLitres, 0, 15);
  const validationMessage = !spo2RestValid
    ? "SpO2 at rest must be between 0 and 100. · आराम का SpO2 0 से 100 के बीच होना चाहिए."
    : !spo2ExertionValid
      ? "SpO2 after walking must be between 0 and 100. · चलने के बाद SpO2 0 से 100 के बीच होना चाहिए."
      : !heartRateValid
        ? "Heart rate must be between 20 and 250. · नाड़ी 20 से 250 के बीच होनी चाहिए."
        : !oxygenLitresValid
          ? "Oxygen flow must be between 0 and 15 L/min. · ऑक्सीजन फ्लो 0 से 15 L/min के बीच होना चाहिए."
          : null;
  const canSubmit = spo2 !== "" && mmrc !== null && validationMessage === null;
  const isSubmitting = submitState === "submitting";
  const previousMmrcLabel = prevDay.loading ? "..." : prevDay.mmrc !== null ? String(prevDay.mmrc) : "-";

  const toggleMed = (id: string) => setMedsTaken((current) => ({ ...current, [id]: !current[id] }));
  const toggleSideEffect = (id: string) => {
    setSideEffects((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const handleDiseaseSpecificChange = useCallback((data: Partial<DailyLogPayload>) => {
    setDiseaseSpecificData(data);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const feverEntry = symptomsData.fever;
    const temperatureF = feverEntry?.feverTempF ? Number(feverEntry.feverTempF) : null;
    const haemoptysisEntry = symptomsData.haemoptysis;
    const pedalEdemaEntry = symptomsData.pedal_edema;
    const today = new Date().toISOString().split("T")[0] as string;

    const commonVasSymptoms = buildVasSymptomsPayload(symptomsData);
    const diseaseVasSymptoms =
      diseaseSpecificData.vas_symptoms && typeof diseaseSpecificData.vas_symptoms === "object"
        ? diseaseSpecificData.vas_symptoms
        : null;
    const diseaseFields = { ...diseaseSpecificData };
    delete diseaseFields.vas_symptoms;
    delete diseaseFields.haemoptysis;
    delete diseaseFields.temperature_f;
    const diseaseHaemoptysis = diseaseSpecificData.haemoptysis;
    const diseaseTemperatureF = diseaseSpecificData.temperature_f;
    const commonHaemoptysis = (haemoptysisEntry?.vas ?? 0) > 0 ? true : null;

    const payload: DailyLogPayload = {
      effective_dashboard: dashboard,
      patient_id: patientId,
      log_date: today,
      spo2_rest: Number(spo2),
      spo2_exertion: parseOptionalNumber(spo2Exertion),
      heart_rate: parseOptionalNumber(heartRate),
      mmrc_today: mmrc,
      aqi_value: aqi,
      medication_compliance: medsTaken,
      vas_symptoms: {
        ...(commonVasSymptoms ?? {}),
        ...(diseaseVasSymptoms ?? {}),
      },
      temperature_f: typeof diseaseTemperatureF === "number" ? diseaseTemperatureF : temperatureF,
      haemoptysis: diseaseHaemoptysis === true ? true : commonHaemoptysis,
      pedal_edema: (pedalEdemaEntry?.vas ?? 0) > 0 ? true : null,
      oxygen_requirement_litres: oxygenLitresFromBreathlessness(breathlessness),
      respiratory_support_status: respiratorySupportFromBreathlessness(breathlessness.status) ?? (supportEnabled === true ? "static" : null),
      respiratory_support_type: supportEnabled === true ? supportType || null : null,
      side_effects: sideEffectsPayload(sideEffects, sideEffectsOther),
      ...diseaseFields,
    } as DailyLogPayload;

    const ok = await submitLog(payload);
    if (ok) onSuccess?.();
  }, [
    aqi,
    breathlessness,
    canSubmit,
    dashboard,
    diseaseSpecificData,
    heartRate,
    medsTaken,
    mmrc,
    onSuccess,
    patientId,
    sideEffects,
    sideEffectsOther,
    spo2,
    spo2Exertion,
    submitLog,
    supportEnabled,
    supportType,
    symptomsData,
  ]);

  const submitEmergencyMessage = useCallback(async () => {
    const message = emergencyMessage.trim();
    if (!message || emergencyStatus === "sending") return;

    setEmergencyStatus("sending");
    setEmergencyError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setEmergencyStatus("error");
        setEmergencyError("Session expired. Please log in again.");
        return;
      }

      const response = await fetch("/api/patient-logs/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setEmergencyStatus("error");
        setEmergencyError(body?.error ?? "Could not send emergency message.");
        return;
      }

      setEmergencyStatus("sent");
      setEmergencyMessage("");
    } catch {
      setEmergencyStatus("error");
      setEmergencyError("Network error. Please try again.");
    }
  }, [emergencyMessage, emergencyStatus]);

  if (submitState === "success") {
    return (
      <div className={dStyles.view}>
        <div className={dStyles.successWrap}>
          <div className={dStyles.successIcon}><CheckCircle size={40} strokeWidth={1.5} /></div>
          <h2 className={dStyles.successTitle}>Log Submitted · लॉग जमा हुआ</h2>
          <p className={dStyles.successSub}>Your daily log has been saved. · आपका दैनिक लॉग सेव हो गया है।</p>
          <button type="button" className={dStyles.btnPrimary} onClick={reset}>Log Again · फिर से लॉग करें</button>
        </div>
      </div>
    );
  }

  return (
    <div className={dStyles.view}>
      {messageToastVisible && (
        <div className={dStyles.sentToast} role="status" aria-live="polite">
          <CheckCircle size={18} />
          <div>
            <strong>Message sent</strong>
            <span>Your doctor has been notified.</span>
          </div>
        </div>
      )}

      <div className={dStyles.pageHeader}>
        <div>
          <h1 className={dStyles.pageTitle}>
            Log Today - {dashboardLabel(dashboard)}
            <span className={dStyles.pageTitleHi}> · दैनिक लॉग - {dashboardHindi(dashboard)}</span>
          </h1>
          <p className={dStyles.pageSub}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · Takes about 4 minutes · लगभग 4 मिनट
          </p>
        </div>
      </div>

      <div className={dStyles.body}>
        <div className={dStyles.card}>
          <p className={dStyles.cardTitle}>Common Vitals · सामान्य स्वास्थ्य जांच</p>
          <AQIDisplay aqi={aqi} />
          <p className={dStyles.supportSummary}>{supportSummary}</p>
          <div className={dStyles.grid2} style={{ marginTop: 16 }}>
            <div>
              <SpO2Input
                value={spo2}
                onChange={setSpo2}
                isCOPD={dashboard === "copd"}
                label="SpO₂ at Rest · आराम के समय ऑक्सीजन"
              />
            </div>
            <div>
              <label className={dStyles.fieldLabel}>
                SpO₂ After Walking
                <span className={dStyles.fieldLabelHi}>चलने के बाद ऑक्सीजन</span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className={dStyles.numInput}
                placeholder="e.g. 82"
                value={spo2Exertion}
                onChange={(event) => setSpo2Exertion(event.target.value)}
              />
              <div style={{ marginTop: 14 }}>
                <label className={dStyles.fieldLabel}>
                  Heart Rate
                  <span className={dStyles.fieldLabelHi}>नाड़ी / मिनट</span>
                </label>
                <input
                  type="number"
                  min={20}
                  max={250}
                  className={dStyles.numInput}
                  placeholder="e.g. 88"
                  value={heartRate}
                  onChange={(event) => setHeartRate(event.target.value)}
                />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <BreathlessnessTracker
              data={breathlessness}
              onChange={(updates) => setBreathlessness((current) => ({ ...current, ...updates }))}
              prevMmrc={prevDay.mmrc}
            />
          </div>
        </div>

        <div className={dStyles.card}>
          <p className={dStyles.cardTitle}>
            Breathlessness (mMRC Grade) · सांस फूलना
            <span style={{ marginLeft: 8, fontSize: 11, color: "#888680", fontWeight: 400 }}>
              (Previous day · कल: {previousMmrcLabel})
            </span>
          </p>
          <MMRCPicker value={mmrc} onChange={setMmrc} />
        </div>

        <div className={dStyles.card}>
          <p className={dStyles.cardTitle}>Medicines Taken and Side Effects · दवाएं और दुष्प्रभाव</p>
          {meds.length > 0 ? (
            <MedChecklist meds={meds} taken={medsTaken} onToggle={toggleMed} />
          ) : (
            <p className={dStyles.cardSub}>No active meds for this date. · इस तारीख के लिए कोई सक्रिय दवा नहीं है।</p>
          )}
          <div style={{ marginTop: 16 }}>
            <SideEffectsPicker
              selected={sideEffects}
              onToggle={toggleSideEffect}
              othersText={sideEffectsOther}
              onOthersTextChange={setSideEffectsOther}
            />
          </div>
        </div>

        <div className={dStyles.card}>
          <p className={dStyles.cardTitle}>Symptoms Severity (0-10) · लक्षणों की तीव्रता</p>
          <SymptomsTracker
            data={symptomsData}
            onChange={setSymptomsData}
            prevData={prevDay.vasSymptoms
              ? Object.fromEntries(Object.entries(prevDay.vasSymptoms).map(([key, value]) => [key, { vas: value }]))
              : undefined}
          />
        </div>

        <DiseaseSpecificDailyLog dashboard={dashboard} onChange={handleDiseaseSpecificChange} />

        {submitState === "error" && errorMessage && !limitReached && (
          <div className={dStyles.submitError}>
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        {validationMessage && (
          <div className={dStyles.submitError}>
            <AlertCircle size={14} />
            <span>{validationMessage}</span>
          </div>
        )}

        {limitReached && (
          <div className={dStyles.limitPanel}>
            <div>
              <p className={dStyles.limitTitle}>Daily logs finished</p>
              <p className={dStyles.limitText}>
                You have already submitted 2 logs today. If this is an emergency, type a message below and it will go to your doctor.
              </p>
            </div>
            <textarea
              className={dStyles.textarea}
              rows={3}
              maxLength={500}
              value={emergencyMessage}
              onChange={(event) => setEmergencyMessage(event.target.value)}
              placeholder="Describe what is happening now..."
            />
            <div className={dStyles.limitActions}>
              <span className={dStyles.limitCount}>{emergencyMessage.length}/500</span>
              <button
                type="button"
                className={dStyles.emergencySendBtn}
                disabled={!emergencyMessage.trim() || emergencyStatus === "sending"}
                onClick={submitEmergencyMessage}
              >
                {emergencyStatus === "sending" ? "Sending..." : "Send to doctor"}
              </button>
            </div>
            {emergencyStatus === "sent" && <p className={dStyles.limitSuccess}>Emergency message sent to your doctor.</p>}
            {emergencyStatus === "error" && emergencyError && <p className={dStyles.limitError}>{emergencyError}</p>}
          </div>
        )}

        <div className={dStyles.submitRow}>
          {!canSubmit && !isSubmitting && (
            <p className={dStyles.submitHint}>
              <AlertCircle size={11} /> SpO2 and mMRC grade are required · SpO2 और mMRC grade आवश्यक हैं.
            </p>
          )}
          <button
            type="button"
            className={dStyles.submitBtn}
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <><Loader2 size={15} className={dStyles.spinner} /> Submitting... · जमा हो रहा है...</>
            ) : (
              <>Submit Daily Log · दैनिक लॉग जमा करें</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
