"use client";

import React, { useEffect, useState } from "react";
import {
  HeartPulse,
  ClipboardList,
  History,
  Activity,
  CalendarClock,
  HeartHandshake,
  LogOut,
} from "lucide-react";
import { usePatient } from "@/contexts/PatientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Translations } from "@/lib/i18n/translations";
import styles from "./PatientSidebar.module.css";

type View = "home" | "log" | "history" | "analytics" | "appointments";

interface PatientSidebarProps {
  activeView: View;
  onViewChange: (v: View) => void;
}

const NAV: { id: View; icon: React.ElementType; label: string; tKey: keyof Translations; shortLabel: string }[] = [
  { id: "home", icon: HeartPulse, label: "My Health", tKey: "nav_health", shortLabel: "Health" },
  { id: "log", icon: ClipboardList, label: "Log Today", tKey: "nav_log", shortLabel: "Log" },
  { id: "history", icon: History, label: "Daily Logs", tKey: "nav_history", shortLabel: "History" },
  { id: "analytics", icon: Activity, label: "Analytics", tKey: "nav_trends", shortLabel: "Trends" },
  { id: "appointments", icon: CalendarClock, label: "Appointments", tKey: "nav_appts", shortLabel: "Appts" },
];

export function PatientSidebar({ activeView, onViewChange }: PatientSidebarProps) {
  const { patient, logout } = usePatient();
  const { t, language } = useLanguage();
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
          const translatedLabel = t(item.tKey);

          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
              title={`${item.label}${language !== "en" ? ` (${translatedLabel})` : ""}`}
              onClick={() => onViewChange(item.id)}
            >
              <div className={styles.iconWrap}>
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} />
                {showLogPending && <span className={styles.pendingDot} title="Today's health log pending" />}
              </div>
              <div className={styles.navLabels}>
                <span className={styles.navLabel}>{item.shortLabel}</span>
                {language !== "en" && (
                  <span className={styles.navLabelHi}>{translatedLabel}</span>
                )}
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
          title="Sign Out"
          aria-label="Sign Out of Patient Portal"
        >
          <LogOut size={16} />
          <span className={styles.sidebarSignOutLabel}>{t("logout", "Sign Out")}</span>
        </button>
        <div className={styles.companionBadge} title="O2Plus Respiratory Care Companion">
          <HeartHandshake size={15} />
        </div>
      </div>
    </aside>
  );
}
