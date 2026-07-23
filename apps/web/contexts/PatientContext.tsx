"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getPatientProfile, getPatientDiagnosis } from "@o2plus/api-client/patient";

interface PatientProfile {
  id: string;
  name: string;
  initials: string;
  phone: string | null;
  doctor_id: string | null;
  effective_dashboard: "asthma" | "copd" | "bronchiectasis" | "ild" | "post_icu" | null;
  wants_appointments: boolean | null;
}

interface PatientContextValue {
  patient: PatientProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refetchPatient: () => Promise<void>;
}

const PatientContext = createContext<PatientContextValue>({
  patient: null,
  loading: true,
  logout: async () => {},
  refetchPatient: async () => {},
});

export function PatientProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPatientData = async (userId: string) => {
    const apiConfig = { supabase };

    const [patientsRes, diagnosisRes] = await Promise.all([
      getPatientProfile(apiConfig, userId),
      getPatientDiagnosis(apiConfig, userId),
    ]);

    if (!patientsRes.data) {
      await supabase.auth.signOut();
      router.replace("/patient/login");
      return;
    }

    const p = patientsRes.data;
    const nameParts = (p.name ?? "").trim().split(/\s+/);
    const initials = nameParts
      .slice(0, 2)
      .map((n: string) => n[0]?.toUpperCase() ?? "")
      .join("");

    setPatient({
      id: p.id,
      name: p.name ?? "Patient",
      initials,
      phone: p.mobile_number ?? null,
      doctor_id: p.doctor_id ?? null,
      effective_dashboard:
        (diagnosisRes.data?.effective_dashboard as PatientProfile["effective_dashboard"]) ?? null,
      wants_appointments: p.wants_appointments ?? null,
    });
    setLoading(false);
  };

  const refetchPatient = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await fetchPatientData(session.user.id);
    }
  };

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/patient/login");
        return;
      }

      await fetchPatientData(session.user.id);
    })();
  }, [router, supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/patient/login");
  };

  return (
    <PatientContext.Provider value={{ patient, loading, logout, refetchPatient }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  return useContext(PatientContext);
}
