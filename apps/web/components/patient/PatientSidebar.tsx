"use client";

import React, { useEffect, useState } from "react";
import {
  HeartPulse,
  ClipboardList,
  History,
  Activity,
  CalendarClock,
  ShieldAlert,
  HeartHandshake,
  LogOut,
} from "lucide-react";
import { usePatient } from "@/contexts/PatientContext";
import styles from "./PatientSidebar.module.css";

type View = "home" | "log" | "history" | "analytics" | "appointments";

interface PatientSidebarProps {
  activeView: View;
  onViewChange: (v: View) => void;
}

const NAV: { id: View; icon: React.ElementType; label: string; labelHi: string; shortLabel: string }[] = [
  { id: "home", icon: HeartPulse, label: "My Health", labelHi: "मेरा स्वास्थ्य", shortLabel: "Health" },
  { id: "log", icon: ClipboardList, label: "Log Today", labelHi: "आज लॉग करें", shortLabel: "Log" },
  { id: "history", icon: History, label: "Daily Logs", labelHi: "दैनिक लॉग", shortLabel: "History" },
  { id: "analytics", icon: Activity, label: "Analytics", labelHi: "विश्लेषण", shortLabel: "Trends" },
  { id: "appointments", icon: CalendarClock, label: "Appointments", labelHi: "अपॉइंटमेंट", shortLabel: "Appts" },
];

export function PatientSidebar({ activeView, onViewChange }: PatientSidebarProps) {
  const { patient, logout } = usePatient();
  const [hasLoggedToday, setHasLoggedToday] = useState(false);

  useEffect(() => {
    if (!patient?.id) return;
    const fetchTodayLog = async () => {
      try {
        const res = await fetch("/api/patient/daily-log/today", { credentials: "include" });
        if (res.ok) {
          const body = await res.json();
          setHasLoggedToday(Boolean(body?.logged_today));
        }
      } catch {
        // silent
      }
    };
    void fetchTodayLog();
  }, [patient?.id]);

  return (
    <aside className={styles.sidebar}>
      {/* ── Main Navigation ── */}
      <nav className={styles.nav}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const showLogPending = item.id === "log" && !hasLoggedToday;

          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
              title={`${item.label} (${item.labelHi})`}
              onClick={() => onViewChange(item.id)}
            >
              <div className={styles.iconWrap}>
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} />
                {showLogPending && <span className={styles.pendingDot} title="Today's health log pending" />}
              </div>
              <div className={styles.navLabels}>
                <span className={styles.navLabel}>{item.shortLabel}</span>
                <span className={styles.navLabelHi}>{item.labelHi}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* ── Companion Status Footer & Sign Out ── */}
      <div className={styles.sidebarFooter}>
        <button
          type="button"
          className={styles.sidebarSignOutBtn}
          onClick={logout}
          title="Sign Out · साइन आउट"
          aria-label="Sign Out of Patient Portal"
        >
          <LogOut size={16} />
          <span className={styles.sidebarSignOutLabel}>Sign Out</span>
        </button>
        <div className={styles.companionBadge} title="O2Plus Respiratory Care Companion">
          <HeartHandshake size={15} />
        </div>
      </div>
    </aside>
  );
}
