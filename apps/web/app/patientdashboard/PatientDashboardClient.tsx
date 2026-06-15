"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PatientProvider, usePatient } from "@/contexts/PatientContext";
import { PatientTopNav } from "@/components/patient/PatientTopNav";
import { PatientSidebar } from "@/components/patient/PatientSidebar";
import { LogTodayView } from "@/components/patient/LogTodayView";
import { PatientAnalyticsView } from "@/components/patient/PatientAnalyticsView";
import { BookAppointmentView } from "@/components/patient/BookAppointmentView";
import { CommonPatientDashboard } from "@/components/patient/CommonPatientDashboard";
import { AppointmentPreferenceModal } from "@/components/patient/AppointmentPreferenceModal";
import { usePatientHomeData } from "@/hooks/usePatientHomeData";
import styles from "./page.module.css";

type View = "home" | "log" | "analytics" | "appointments";

function PatientDashboardPageInner() {
  const { patient, loading, refetchPatient } = usePatient();
  const [view, setView] = useState<View>("home");
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [showAppointmentModal, setShowAppointmentModal] = useState(
    patient?.wants_appointments === null
  );

  const homeData = usePatientHomeData(
    patient?.id ?? null,
    patient?.doctor_id ?? null,
    patient?.effective_dashboard ?? null,
    homeRefreshKey,
  );

  if (loading || !patient) return null;

  const diagnosis = homeData.loading
    ? patient.effective_dashboard ?? null
    : homeData.diagnosis;

  const handleAppointmentModalComplete = async () => {
    setShowAppointmentModal(false);
    // Refetch patient data to get updated wants_appointments
    await refetchPatient();
  };

  return (
    <div className={styles.shell}>
      <PatientTopNav activeView={view} onViewChange={setView} />
      <div className={styles.body}>
        <PatientSidebar activeView={view} onViewChange={setView} />
        <main className={styles.content}>
          {view === "home" && (
            <CommonPatientDashboard
              name={patient.name}
              diagnosis={diagnosis}
              patientId={patient.id}
              spo2Today={0}
              mmrcToday={0}
              aqiToday={0}
              riskScore={0}
              doctor=""
              doctorHospital=""
              nextAppointment=""
              onLogToday={() => setView("log")}
            />
          )}

          {view !== "home" && (
            <div className={styles.viewBackBar}>
              <button type="button" className={styles.backButton} onClick={() => setView("home")}>
                <ArrowLeft size={16} strokeWidth={1.8} />
                <span>Back</span>
              </button>
            </div>
          )}
          {view === "log" && <LogTodayView onLogSubmitted={() => setHomeRefreshKey((key) => key + 1)} />}
          {view === "analytics" && <PatientAnalyticsView patientId={patient.id} />}
          {view === "appointments" && <BookAppointmentView />}
        </main>
      </div>

      {showAppointmentModal && (
        <AppointmentPreferenceModal
          patientId={patient.id}
          onComplete={handleAppointmentModalComplete}
        />
      )}
    </div>
  );
}

export default function PatientDashboardClient() {
  return (
    <PatientProvider>
      <PatientDashboardPageInner />
    </PatientProvider>
  );
}
