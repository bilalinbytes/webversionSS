"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./AppointmentPreferenceModal.module.css";

interface AppointmentPreferenceModalProps {
  patientId: string;
  onComplete: () => void;
}

type PreferenceStep = "decision" | "timing";
type TimingPreference = "morning" | "afternoon" | "evening" | "flexible";

export function AppointmentPreferenceModal({
  patientId,
  onComplete,
}: AppointmentPreferenceModalProps) {
  const [step, setStep] = useState<PreferenceStep>("decision");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTiming, setSelectedTiming] = useState<TimingPreference>("morning");
  const [error, setError] = useState<string | null>(null);

  const handleNo = async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("patients")
      .update({
        wants_appointments: false,
        appointment_preference_set_at: new Date().toISOString(),
      })
      .eq("id", patientId);

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    onComplete();
  };

  const handleYes = () => {
    setStep("timing");
  };

  const handleSavePreference = async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("patients")
      .update({
        wants_appointments: true,
        preferred_appointment_time: selectedTiming,
        appointment_preference_set_at: new Date().toISOString(),
      })
      .eq("id", patientId);

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    onComplete();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        {step === "decision" ? (
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>Appointment Booking</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleNo}
                disabled={isLoading}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.content}>
              <p className={styles.question}>
                Would you like to book appointments through this app?
              </p>
              <p className={styles.description}>
                Your doctor will be able to receive and manage appointment requests from you
                directly through O2Plus.
              </p>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={handleNo}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Saving...
                  </>
                ) : (
                  "No, Not Now"
                )}
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleYes}
                disabled={isLoading}
              >
                Yes, I'd like to
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </>
        ) : (
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>Your Preferred Timing</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleNo}
                disabled={isLoading}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.content}>
              <p className={styles.question}>
                When do you prefer to have appointments?
              </p>

              <div className={styles.optionsGrid}>
                {[
                  { value: "morning", label: "Morning", description: "6 AM - 12 PM" },
                  { value: "afternoon", label: "Afternoon", description: "12 PM - 5 PM" },
                  { value: "evening", label: "Evening", description: "5 PM - 8 PM" },
                  { value: "flexible", label: "Flexible", description: "Any time works" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.optionButton} ${
                      selectedTiming === option.value ? styles.selected : ""
                    }`}
                    onClick={() => setSelectedTiming(option.value as TimingPreference)}
                    disabled={isLoading}
                  >
                    <div className={styles.optionLabel}>{option.label}</div>
                    <div className={styles.optionDescription}>{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={() => setStep("decision")}
                disabled={isLoading}
              >
                Back
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleSavePreference}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Saving...
                  </>
                ) : (
                  "Save Preference"
                )}
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
