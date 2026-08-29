"use client";

import { useState, useEffect } from "react";
import { usePatient } from "@/contexts/PatientContext";
import { CommonDailyLogView } from "@/components/patient/CommonDailyLogView";

export function LogTodayView({ onLogSubmitted }: { onLogSubmitted?: () => void }) {
  const { patient } = usePatient();
  const effective_dashboard = (patient?.effective_dashboard as "asthma" | "copd" | "bronchiectasis" | "ild" | "post_icu") || "asthma";
  const [diagnosisLabel, setDiagnosisLabel] = useState<string>("");
  const [medicationMap, setMedicationMap] = useState<
    { id: string; name: string; dose: string; route: string; frequency: string }[]
  >([]);

  useEffect(() => {
    if (patient?.id) {
      const fetchLabel = async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const { formatDiagnosisDisplay } = await import("@o2plus/core");
          const supabase = createClient();
          const { data } = await supabase
            .from("patient_diagnoses")
            .select("primary_diagnosis")
            .eq("patient_id", patient.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data?.primary_diagnosis) {
            const formatted = formatDiagnosisDisplay(data.primary_diagnosis);
            setDiagnosisLabel(formatted || data.primary_diagnosis);
          }
        } catch {}
      };
      fetchLabel();
    }
  }, [patient?.id]);

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
          setMedicationMap(
            data.medications.map((med: {
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
            }))
          );
        }
      } catch {
        // Fallback gracefully if network error
      }
    })();
  }, [patient?.id]);

  if (!patient?.id) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "#64748b", fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
        Loading patient daily log...
      </div>
    );
  }

  return (
    <CommonDailyLogView
      dashboard={effective_dashboard}
      patientId={patient.id}
      medicationMap={medicationMap}
      onSuccess={onLogSubmitted}
      diagnosisLabel={diagnosisLabel}
    />
  );
}
