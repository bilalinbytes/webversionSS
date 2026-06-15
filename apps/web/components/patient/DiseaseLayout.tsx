"use client";

import { Bell, Heart, ClipboardList, BarChart2, ArrowLeftRight, Settings } from "lucide-react";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import styles from "./DiseaseLayout.module.css";

export type DiseaseView = "home" | "log" | "history" | "transfer";

interface DiseaseLayoutProps {
  children: React.ReactNode;
  activeView: DiseaseView;
  onViewChange: (v: DiseaseView) => void;
  patientName: string;
  patientInitials: string;
  diagnosisTag: string;
  diagnosisColor: string;
  diagnosisBg: string;
}

const NAV: { id: DiseaseView; icon: React.ElementType; label: string }[] = [
  { id: "home",     icon: Heart,         label: "My Health" },
  { id: "log",      icon: ClipboardList, label: "Log Today" },
  { id: "history",  icon: BarChart2,     label: "History"   },
  { id: "transfer", icon: ArrowLeftRight,label: "Transfer"  },
];

const TABS: { id: DiseaseView; label: string }[] = [
  { id: "home",     label: "My Health"       },
  { id: "log",      label: "Log Today"       },
  { id: "history",  label: "History"         },
  { id: "transfer", label: "Transfer Doctor" },
];

export function DiseaseLayout({
  children, activeView, onViewChange,
  patientName, patientInitials, diagnosisTag, diagnosisColor, diagnosisBg,
}: DiseaseLayoutProps) {
  const firstName = patientName.split(" ")[0];

  return (
    <div className={styles.shell}>
      {/* Top nav */}
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <SaansBrandIcon className={styles.brandIcon} />
          <div>
          <p className={styles.brandName}>O2Plus</p>
            <p className={styles.brandSub}>Your respiratory health companion</p>
          </div>
        </div>

        <div className={styles.tabs}>
          {TABS.map(tab => (
            <button key={tab.id} type="button"
              className={`${styles.tab} ${activeView === tab.id ? styles.tabActive : ""}`}
              onClick={() => onViewChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.navRight}>
          <span className={styles.diagTag} style={{ background: diagnosisBg, color: diagnosisColor }}>
            {diagnosisTag}
          </span>
          <button type="button" className={styles.notifBtn} aria-label="Notifications">
            <Bell size={15} strokeWidth={1.5} />
            <span className={styles.notifBadge}>2</span>
          </button>
          <div className={styles.patientPill}>
            <div className={styles.patientAvatar}>{patientInitials}</div>
            <span className={styles.patientName}>{firstName}</span>
          </div>
        </div>
      </nav>

      {/* Body */}
      <div className={styles.body}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.sideNav}>
            {NAV.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button"
                  className={`${styles.sideItem} ${activeView === item.id ? styles.sideItemActive : ""}`}
                  style={activeView === item.id ? { "--accent": diagnosisColor } as React.CSSProperties : {}}
                  title={item.label}
                  onClick={() => onViewChange(item.id)}
                >
                  <div className={styles.sideIcon}><Icon size={18} strokeWidth={1.6} /></div>
                  <span className={styles.sideLabel}>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className={styles.sideBottom}>
            <div className={styles.sideSep} />
            <button type="button" className={styles.sideItem} title="Settings">
              <div className={styles.sideIcon}><Settings size={18} strokeWidth={1.6} /></div>
              <span className={styles.sideLabel}>Settings</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
