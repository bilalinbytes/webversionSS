"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  CalendarClock,
  FileSpreadsheet,
  AlertTriangle,
  Stethoscope,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Sidebar.module.css";

export type DoctorView = "dashboard" | "create" | "export" | "appointments";

interface SidebarProps {
  activeView: DoctorView;
  onViewChange: (view: DoctorView) => void;
}

const NAV_ITEMS: { id: DoctorView; icon: React.ElementType; label: string; shortLabel: string }[] = [
  { id: "dashboard", icon: Users, label: "Patient Cohort", shortLabel: "Patients" },
  { id: "create", icon: UserPlus, label: "Add Patient", shortLabel: "Enrol" },
  { id: "appointments", icon: CalendarClock, label: "Appointments", shortLabel: "Appts" },
  { id: "export", icon: FileSpreadsheet, label: "Export Data", shortLabel: "Export" },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [pendingAppts, setPendingAppts] = useState(0);
  const [openAlertsCount, setOpenAlertsCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    const fetchCounts = async () => {
      // 1. Fetch appointments
      const apptRes = await fetch("/api/appointments", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const appts = (apptRes?.appointments ?? []) as Array<{ notes?: string | null }>;
      const pending = appts.filter((a) => {
        try {
          const meta = JSON.parse(a.notes || "{}");
          return meta.workflow_status === "requested" || meta.workflow_status === "patient_requested_another";
        } catch {
          return false;
        }
      }).length;
      setPendingAppts(pending);

      // 2. Fetch open alerts
      const patRes = await fetch("/api/doctor/patients", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const count = (patRes?.patients ?? []).reduce((total: number, p: any) => {
        const open = (p.disease_alerts ?? []).filter(
          (al: any) => !al.is_suppressed && !al.acknowledged_by_doctor && (al.alert_type === "RED" || al.alert_type === "YELLOW")
        ).length;
        return total + open;
      }, 0);
      setOpenAlertsCount(count);
    };

    void fetchCounts();
    const interval = setInterval(() => void fetchCounts(), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className={styles.sidebar}>
      {/* ── Main Navigation Icons ── */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const showBadge = item.id === "appointments" && pendingAppts > 0;

          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
              title={item.label}
              onClick={() => onViewChange(item.id)}
            >
              <div className={styles.iconWrap}>
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} />
                {showBadge && <span className={styles.badgeDot}>{pendingAppts}</span>}
              </div>
              <span className={styles.navLabel}>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Bottom Clinical Status Utility ── */}
      <div className={styles.sidebarFooter}>
        {openAlertsCount > 0 && (
          <div
            className={styles.alertIndicator}
            title={`${openAlertsCount} active clinical alerts requiring triage`}
            onClick={() => onViewChange("dashboard")}
          >
            <AlertTriangle size={15} className={styles.alertIcon} />
            <span className={styles.alertNum}>{openAlertsCount}</span>
          </div>
        )}
        <div className={styles.clinicLogoBadge} title="Pulmonology Clinical Suite">
          <Stethoscope size={16} />
        </div>
      </div>
    </aside>
  );
}
