"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PatientProfile {
  id: string;
  name: string;
  initials: string;
  phone: string | null;
  doctor_id: string | null;
  effective_dashboard: "asthma" | "copd" | "bronchiectasis" | "ild" | "post_icu" | null;
}

interface PatientContextValue {
  patient: PatientProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const PatientContext = createContext<PatientContextValue>({
  patient: null,
  loading: true,
  logout: async () => {},
});

export function PatientProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/patient/login");
        return;
      }

      const [patientsRes, diagnosisRes] = await Promise.all([
        supabase
          .from("patients")
          .select("id, name, mobile_number, doctor_id")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("patient_diagnoses")
          .select("effective_dashboard")
          .eq("patient_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
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
      });
      setLoading(false);
    })();
  }, [router, supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/patient/login");
  };

  return (
    <PatientContext.Provider value={{ patient, loading, logout }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  return useContext(PatientContext);
}
