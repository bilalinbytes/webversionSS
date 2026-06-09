"use client";

import { useCallback, useState, useEffect } from "react";
import { Check, CheckCircle, AlertCircle } from "lucide-react";
import { MEDICATIONS } from "@/lib/mock-data";
import styles from "./LogTodayView.module.css";
import { usePatient } from "@/contexts/PatientContext";
import { usePatientLog } from "@/hooks/usePatientLog";
import type { DailyLogPayload } from "@/lib/server/log-schema";
import { PostICULogView } from "./posticu/PostICULogView";
import { AsthmaLogView } from "./asthma/AsthmaLogView";
import { COPDLogView } from "./copd/COPDLogView";
import { BronchLogView } from "./bronchiectasis/BronchLogView";
import { ILDLogView } from "./ild/ILDLogView";

const SYMPTOMS = [
  "Dry cough", "Productive cough", "Chest tightness",
  "Wheezing", "Fatigue", "Ankle swelling", "Fever", "Night sweats",
];

export function LogTodayView({ onLogSubmitted }: { onLogSubmitted?: () => void }) {
  const { patient } = usePatient();
  const { submitLog, submitState, errorMessage, limitReached, reset } = usePatientLog();
  const effective_dashboard = patient?.effective_dashboard;
  const [spo2, setSpo2] = useState("");
  const [spo2Ex, setSpo2Ex] = useState("");
  const [mmrc, setMmrc] = useState<number | null>(null);
  const [vas, setVas] = useState<number | null>(null);
  const [meds, setMeds] = useState<Record<string, boolean>>(
    Object.fromEntries(MEDICATIONS.map(m => [m.id, m.takenToday]))
  );
const [symptoms, setSymptoms] = useState<Set<string>>(new Set());
  const [medicationMap, setMedicationMap] = useState<
    { id: string; name: string; dose: string; route: string; frequency: string }[]
  >([]);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [emergencyStatus, setEmergencyStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [messageToastVisible, setMessageToastVisible] = useState(false);

  useEffect(() => {
    if (!patient?.id) return;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch(`/api/patients/${patient.id}/medications`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data?.medications?.length > 0) {
          setMedicationMap(data.medications.map((med: {
            id: string;
            drug_name?: string;
            name?: string;
            dose?: number | string | null;
            dose_unit?: string | null;
            route?: string | null;
            frequency?: string | null;
          }) => ({
            id: med.id,
            name: med.drug_name ?? med.name ?? "Medication",
            dose: [med.dose, med.dose_unit].filter(Boolean).join(" "),
            route: med.route ?? "",
            frequency: med.frequency ?? "As prescribed",
          })));
        }
      } catch {
        // silent fail — fallback meds remain
      }
    })();
  }, [patient?.id]);

  useEffect(() => {
    if (emergencyStatus !== "sent") return;
    setMessageToastVisible(true);
    const timeout = window.setTimeout(() => setMessageToastVisible(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [emergencyStatus]);

  const toggleMed = (id: string) => setMeds(p => ({ ...p, [id]: !p[id] }));
  const toggleSymptom = (s: string) => setSymptoms(p => {
    const n = new Set(p);
    if (n.has(s)) {
      n.delete(s);
    } else {
      n.add(s);
    }
    return n;
  });

  const canSubmit = spo2 !== "" && mmrc !== null && vas !== null;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !patient?.id) return;
    const today = new Date().toISOString().split("T")[0] as string;

    const payload: DailyLogPayload = {
      effective_dashboard: "asthma",
      patient_id: patient.id,
      log_date: today,
      spo2_rest: spo2 !== "" ? Number(spo2) : null,
      spo2_exertion: spo2Ex !== "" ? Number(spo2Ex) : null,
      mmrc_today: mmrc,
      vas_symptoms: vas !== null
        ? ({ breathlessness: vas } as DailyLogPayload["vas_symptoms"])
        : null,
      medication_compliance: meds,
    };

    await submitLog(payload);
  }, [canSubmit, patient?.id, spo2, spo2Ex, mmrc, vas, meds, submitLog]);

  const submitEmergencyMessage = useCallback(async () => {
    const message = emergencyMessage.trim();
    if (!message || emergencyStatus === "sending") return;

    setEmergencyStatus("sending");
    setEmergencyError(null);

    try {
      const { createClient } = await import("@/lib/supabase/client");
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

  if (effective_dashboard === "post_icu") {
    return <PostICULogView patientId={patient?.id || ""} medicationMap={medicationMap} />;
  }
  if (effective_dashboard === "asthma") {
    return <AsthmaLogView patientId={patient?.id || ""} medicationMap={medicationMap} />;
  }
  if (effective_dashboard === "copd") {
    return <COPDLogView patientId={patient?.id || ""} medicationMap={medicationMap} />;
  }
  if (effective_dashboard === "bronchiectasis") {
    return <BronchLogView patientId={patient?.id || ""} medicationMap={medicationMap} />;
  }
  if (effective_dashboard === "ild") {
    return <ILDLogView patientId={patient?.id || ""} medicationMap={medicationMap} onSuccess={onLogSubmitted} />;
  }

  if (submitState === "success") {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successIcon}><CheckCircle size={40} strokeWidth={1.5} /></div>
        <h2 className={styles.successTitle}>Health logged successfully!</h2>
        <p className={styles.successSub}>Your doctor has been notified.</p>
        <button type="button" className={styles.btnPrimary} onClick={reset}>
          Log Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.view}>
      {messageToastVisible && (
        <div className={styles.sentToast} role="status" aria-live="polite">
          <CheckCircle size={18} />
          <div>
            <strong>Message sent</strong>
            <span>Your doctor has been notified.</span>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Log Today&apos;s Health</h1>
          <p className={styles.sub}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Takes about 2 minutes</p>
        </div>
      </div>

      <div className={styles.body}>
        {/* SpO2 */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Oxygen Level (SpO₂)</p>
          <p className={styles.cardSub}>Measure with your pulse oximeter</p>
          <div className={styles.spo2Grid}>
            <div className={styles.field}>
              <label className={styles.label}>At Rest <span className={styles.req}>*</span></label>
              <div className={styles.inputWrap}>
                <input
                  type="number" min="70" max="100"
                  className={`${styles.inputLarge} ${spo2 && Number(spo2) < 90 ? styles.inputWarn : ""}`}
                  placeholder="e.g. 94"
                  value={spo2}
                  onChange={e => setSpo2(e.target.value)}
                />
                <span className={styles.inputUnit}>%</span>
              </div>
              {spo2 && Number(spo2) < 90 && (
                <span className={styles.warnMsg}><AlertCircle size={11} /> Low — contact your doctor</span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>After Walking</label>
              <div className={styles.inputWrap}>
                <input
                  type="number" min="70" max="100"
                  className={`${styles.inputLarge} ${spo2Ex && Number(spo2Ex) < 88 ? styles.inputWarn : ""}`}
                  placeholder="e.g. 88"
                  value={spo2Ex}
                  onChange={e => setSpo2Ex(e.target.value)}
                />
                <span className={styles.inputUnit}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* mMRC */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Breathlessness Grade (mMRC) <span className={styles.req}>*</span></p>
          <p className={styles.cardSub}>How breathless were you today?</p>
          <div className={styles.mmrcGrid}>
            {[
              { grade: 0, label: "No breathlessness", sub: "Only with strenuous exercise" },
              { grade: 1, label: "Mild", sub: "Hurrying or walking uphill" },
              { grade: 2, label: "Moderate", sub: "Walk slower than peers on flat" },
              { grade: 3, label: "Severe", sub: "Stop after 100m on flat" },
              { grade: 4, label: "Very severe", sub: "Too breathless to leave house" },
            ].map(({ grade, label, sub }) => (
              <button
                key={grade}
                type="button"
                className={`${styles.mmrcBtn} ${mmrc === grade ? styles.mmrcBtnActive : ""} ${grade >= 3 ? styles.mmrcBtnWarn : ""}`}
                onClick={() => setMmrc(grade)}
              >
                <span className={styles.mmrcGrade}>{grade}</span>
                <span className={styles.mmrcLabel}>{label}</span>
                <span className={styles.mmrcSub}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* VAS */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Overall Discomfort (0–10) <span className={styles.req}>*</span></p>
          <p className={styles.cardSub}>0 = no discomfort, 10 = worst imaginable</p>
          <div className={styles.vasRow}>
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.vasBtn} ${vas === i ? styles.vasBtnActive : ""}`}
                style={vas === i ? {
                  background: i >= 8 ? "#e24b4a" : i >= 5 ? "#ef9f27" : "#0f6e56",
                  borderColor: i >= 8 ? "#e24b4a" : i >= 5 ? "#ef9f27" : "#0f6e56",
                } : {}}
                onClick={() => setVas(i)}
              >
                {i}
              </button>
            ))}
          </div>
          <div className={styles.vasLabels}>
            <span>No discomfort</span>
            <span>Moderate</span>
            <span>Worst</span>
          </div>
          {vas !== null && (
            <p className={styles.vasSelected}>
              You selected: <strong>{vas}/10</strong> —{" "}
              {vas >= 8 ? "Severe — please contact your doctor" : vas >= 5 ? "Moderate discomfort" : "Manageable"}
            </p>
          )}
        </div>

        {/* Medications */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Medications Taken Today</p>
          <p className={styles.cardSub}>Tap to mark as taken</p>
          <div className={styles.medList}>
            {MEDICATIONS.map(med => (
              <button
                key={med.id}
                type="button"
                className={`${styles.medItem} ${meds[med.id] ? styles.medTaken : ""}`}
                onClick={() => toggleMed(med.id)}
              >
                <div className={`${styles.medCheck} ${meds[med.id] ? styles.medCheckDone : ""}`}>
                  {meds[med.id] && <Check size={12} strokeWidth={3} />}
                </div>
                <div className={styles.medInfo}>
                  <p className={styles.medName}>{med.name} {med.dose}</p>
                  <p className={styles.medFreq}>{med.route} · {med.frequency}</p>
                </div>
                <span className={`${styles.medStatus} ${meds[med.id] ? styles.medStatusTaken : styles.medStatusPending}`}>
                  {meds[med.id] ? "Taken" : "Tap to mark"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Symptoms */}
        <div className={styles.card}>
          <p className={styles.cardTitle}>Symptoms Today</p>
          <p className={styles.cardSub}>Select all that apply</p>
          <div className={styles.symptomGrid}>
            {SYMPTOMS.map(s => (
              <button
                key={s}
                type="button"
                className={`${styles.symptomChip} ${symptoms.has(s) ? styles.symptomChipActive : ""}`}
                onClick={() => toggleSymptom(s)}
              >
                {symptoms.has(s) && <Check size={10} strokeWidth={3} />}
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className={styles.submitRow}>
          {!canSubmit && (
            <p className={styles.submitHint}>
              <AlertCircle size={12} /> Fill in SpO₂, breathlessness grade, and discomfort score to submit
            </p>
          )}
          <button
            type="button"
            className={styles.btnSubmit}
            disabled={!canSubmit || submitState === "submitting"}
            onClick={handleSubmit}
          >
            {submitState === "submitting" ? "Submitting..." : "Submit Today&apos;s Log →"}
          </button>
          {submitState === "error" && errorMessage && !limitReached && (
            <p style={{ color: "#e24b4a", fontSize: 13, marginTop: 8 }}>{errorMessage}</p>
          )}
        </div>

        {limitReached && (
          <div className={styles.limitPanel}>
            <p className={styles.limitTitle}>Daily logs finished</p>
            <p className={styles.limitText}>
              You have already submitted 2 logs today. If this is an emergency, type a message and it will go to your doctor.
            </p>
            <textarea
              className={styles.textarea}
              rows={3}
              maxLength={500}
              value={emergencyMessage}
              onChange={(event) => setEmergencyMessage(event.target.value)}
              placeholder="Describe what is happening now..."
            />
            <div className={styles.limitActions}>
              <span className={styles.limitCount}>{emergencyMessage.length}/500</span>
              <button
                type="button"
                className={styles.emergencySendBtn}
                disabled={!emergencyMessage.trim() || emergencyStatus === "sending"}
                onClick={submitEmergencyMessage}
              >
                {emergencyStatus === "sending" ? "Sending..." : "Send to doctor"}
              </button>
            </div>
            {emergencyStatus === "sent" && <p className={styles.limitSuccess}>Emergency message sent to your doctor.</p>}
            {emergencyStatus === "error" && emergencyError && <p className={styles.limitError}>{emergencyError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
