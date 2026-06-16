"use client";

import { useEffect, useState } from "react";
import {
  Stethoscope,
  Users,
  Activity,
  Bell,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import type { AdminView } from "@/app/admindashboard/AdminDashboardClient";
import styles from "./AdminOverviewView.module.css";

interface Stats {
  totalDoctors: number;
  totalPatients: number;
  totalLogs: number;
  openAlerts: number;
  newDoctorsThisMonth: number;
  newPatientsThisMonth: number;
}

interface AdminOverviewViewProps {
  onViewChange: (view: AdminView) => void;
}

export function AdminOverviewView({ onViewChange }: AdminOverviewViewProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((data: Stats) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load stats.");
        setLoading(false);
      });
  }, []);

  const statCards = [
    {
      label: "Total Doctors",
      value: stats?.totalDoctors ?? 0,
      sub: `+${stats?.newDoctorsThisMonth ?? 0} this month`,
      icon: Stethoscope,
      color: "#126969",
      bg: "rgba(18,105,105,0.08)",
      action: () => onViewChange("doctors"),
    },
    {
      label: "Total Patients",
      value: stats?.totalPatients ?? 0,
      sub: `+${stats?.newPatientsThisMonth ?? 0} this month`,
      icon: Users,
      color: "#378add",
      bg: "rgba(55,138,221,0.08)",
      action: () => onViewChange("patients"),
    },
    {
      label: "Total Daily Logs",
      value: stats?.totalLogs ?? 0,
      sub: "All time",
      icon: Activity,
      color: "#1d9e75",
      bg: "rgba(29,158,117,0.08)",
      action: null,
    },
    {
      label: "Open Alerts",
      value: stats?.openAlerts ?? 0,
      sub: "Unacknowledged",
      icon: Bell,
      color: "#c94d49",
      bg: "rgba(201,77,73,0.08)",
      action: null,
    },
  ];

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Platform Overview</h1>
          <p className={styles.sub}>
            Real-time stats across all doctors and patients on O2Plus
          </p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* Stat cards */}
      <div className={styles.grid}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`${styles.statCard} ${card.action ? styles.statCardClickable : ""}`}
              onClick={card.action ?? undefined}
              role={card.action ? "button" : undefined}
              tabIndex={card.action ? 0 : undefined}
              onKeyDown={
                card.action
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") card.action?.();
                    }
                  : undefined
              }
            >
              <div
                className={styles.statIcon}
                style={{ background: card.bg, color: card.color }}
              >
                <Icon size={20} strokeWidth={1.6} />
              </div>
              <div className={styles.statBody}>
                <p className={styles.statLabel}>{card.label}</p>
                <p
                  className={styles.statValue}
                  style={{ color: loading ? "#bec9c8" : card.color }}
                >
                  {loading ? "—" : card.value.toLocaleString()}
                </p>
                <p className={styles.statSub}>{card.sub}</p>
              </div>
              {card.action && (
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                  className={styles.statArrow}
                  style={{ color: card.color }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionGrid}>
          {[
            {
              label: "View All Doctors",
              desc: "Browse and search registered doctors",
              view: "doctors" as AdminView,
              color: "#126969",
            },
            {
              label: "View All Patients",
              desc: "See patients across all doctors",
              view: "patients" as AdminView,
              color: "#378add",
            },
            {
              label: "Export Platform Data",
              desc: "Download CSV or Excel for any dataset",
              view: "export" as AdminView,
              color: "#1d9e75",
            },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              className={styles.actionCard}
              onClick={() => onViewChange(a.view)}
              style={{ borderLeftColor: a.color }}
            >
              <div className={styles.actionCardLeft}>
                <TrendingUp size={15} strokeWidth={1.5} style={{ color: a.color }} />
                <div>
                  <p className={styles.actionLabel}>{a.label}</p>
                  <p className={styles.actionDesc}>{a.desc}</p>
                </div>
              </div>
              <ArrowRight size={14} strokeWidth={1.5} style={{ color: a.color }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
