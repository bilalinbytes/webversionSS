"use client";

import { Activity, CalendarClock, ClipboardList, Heart, History } from "lucide-react";
import styles from "./PatientSidebar.module.css";

type View = "home" | "log" | "history" | "analytics" | "appointments";

interface PatientSidebarProps {
  activeView: View;
  onViewChange: (v: View) => void;
}

const NAV: { id: View; icon: React.ElementType; label: string; labelHi: string }[] = [
  { id: "home", icon: Heart, label: "My Health", labelHi: "मेरा स्वास्थ्य" },
  { id: "log", icon: ClipboardList, label: "Log Today", labelHi: "आज लॉग करें" },
  { id: "history", icon: History, label: "Daily Logs", labelHi: "दैनिक लॉग इतिहास" },
  { id: "analytics", icon: Activity, label: "Analytics", labelHi: "विश्लेषण" },
  { id: "appointments", icon: CalendarClock, label: "Book Appointment", labelHi: "अपॉइंटमेंट" },
];

export function PatientSidebar({ activeView, onViewChange }: PatientSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.navItem} ${activeView === item.id ? styles.navItemActive : ""}`}
              title={item.label}
              onClick={() => onViewChange(item.id)}
            >
              <div className={styles.iconWrap}><Icon size={18} strokeWidth={1.6} /></div>
              <div className={styles.navLabels}>
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.navLabelHi}>{item.labelHi}</span>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
