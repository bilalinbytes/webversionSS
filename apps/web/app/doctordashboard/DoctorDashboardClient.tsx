"use client";

import { useState } from "react";
import { TopNav } from "@/components/dashboard/TopNav";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { CreatePatientView } from "@/components/dashboard/CreatePatientView";
import { ExportView } from "@/components/dashboard/ExportView";
import { AppointmentManagementView } from "@/components/dashboard/AppointmentManagementView";
import styles from "./page.module.css";
import type { FormData } from "@/components/dashboard/CreatePatientView";

export type View = "dashboard" | "create" | "export" | "appointments";

interface DoctorDashboardClientProps {
  initialAlertCount: number;
}

export function DoctorDashboardClient({
  initialAlertCount,
}: DoctorDashboardClientProps) {
  void initialAlertCount;
  const [view, setView] = useState<View>("dashboard");
  const [editData, setEditData] = useState<{ id: string; data: FormData } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const returnToDashboard = () => {
    setEditData(null);
    setEditError(null);
    setView("dashboard");
  };

  const openEditPatient = async (patientId: string) => {
    setEditError(null);
    try {
      const response = await fetch(`/api/patients?id=${patientId}`, { credentials: "include" });
      const body = await response.json() as { formData?: FormData; error?: string };
      if (!response.ok || !body.formData) {
        throw new Error(body.error ?? "Unable to load patient details for editing.");
      }
      setEditData({ id: patientId, data: body.formData });
      setView("create");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Unable to load patient details for editing.");
      setView("dashboard");
    }
  };

  return (
    <div className={styles.shell}>
      <TopNav activeView={view} onViewChange={setView} />
      <div className={styles.body}>
        <Sidebar activeView={view} onViewChange={setView} />
        <main className={styles.content}>
          {view === "dashboard" && (
            <>
              {editError && (
                <div style={{ margin: "12px 24px 0", padding: "10px 12px", border: "1px solid #f0b5b2", borderRadius: 8, background: "#fff6f5", color: "#c94d49", fontSize: 13 }}>
                  {editError}
                </div>
              )}
              <DashboardView onViewChange={setView} onEditPatient={openEditPatient} />
            </>
          )}
          {view === "create" && (
            <CreatePatientView
              onBack={() => returnToDashboard()}
              onDone={() => returnToDashboard()}
              initialData={editData?.data}
              editPatientId={editData?.id}
            />
          )}
          {view === "export" && <ExportView onBack={() => setView("dashboard")} />}
          {view === "appointments" && <AppointmentManagementView />}
        </main>
      </div>
    </div>
  );
}
