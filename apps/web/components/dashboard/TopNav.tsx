"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  CalendarClock,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Building2,
  Stethoscope,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import { checkAndPlayNotificationAlert } from "@/lib/client/notification-sound";
import styles from "./TopNav.module.css";

export type DoctorView = "dashboard" | "create" | "export" | "appointments";

interface AppointmentMeta {
  reason?: string;
  mode?: string;
  doctor_remarks?: string;
  workflow_status?: string;
}

interface DoctorAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  updated_at: string | null;
  created_at: string | null;
  patients?: { name?: string | null } | null;
}

interface TopNavProps {
  activeView: DoctorView;
  onViewChange: (view: DoctorView) => void;
}

const TABS: { id: DoctorView; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Patients", icon: Users },
  { id: "create", label: "Add Patient", icon: UserPlus },
  { id: "appointments", label: "Appointments", icon: CalendarClock },
  { id: "export", label: "Export Data", icon: FileSpreadsheet },
];

export function TopNav({ activeView, onViewChange }: TopNavProps) {
  const router = useRouter();
  const [doctorName, setDoctorName] = useState("Doctor");
  const [initials, setInitials] = useState("DR");
  const [hospital, setHospital] = useState("Pulmonology Specialty Clinic");
  const [alertCount, setAlertCount] = useState(0);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [actionDrafts, setActionDrafts] = useState<Record<string, { date: string; time: string; remarks: string }>>({});

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  function appointmentMeta(notes: string | null): AppointmentMeta {
    if (!notes) return {};
    try {
      const parsed = JSON.parse(notes) as AppointmentMeta;
      return parsed && typeof parsed === "object" ? parsed : { reason: notes };
    } catch {
      return { reason: notes };
    }
  }

  function formatAppointmentDate(value: string) {
    return new Date(value).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function loadAppointments() {
    const response = await fetch("/api/appointments", { credentials: "include" });
    const body = (await response.json().catch(() => null)) as { appointments?: DoctorAppointment[] } | null;
    if (response.ok) setAppointments(body?.appointments ?? []);
  }

  async function updateAppointment(id: string, status: "approved" | "rejected" | "reschedule_suggested") {
    const draft = actionDrafts[id] ?? { date: "", time: "", remarks: "" };
    const scheduled_at =
      status === "reschedule_suggested" && draft.date && draft.time
        ? `${draft.date}T${draft.time}:00+05:30`
        : undefined;

    if (status === "reschedule_suggested" && !scheduled_at) return;

    const response = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id,
        status,
        scheduled_at,
        remarks: draft.remarks || undefined,
      }),
    });
    if (response.ok) await loadAppointments();
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setAppointmentOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let alertPoll: ReturnType<typeof setInterval> | null = null;
    const handleAcknowledged = (event: Event) => {
      const count =
        event instanceof CustomEvent && typeof event.detail?.count === "number"
          ? event.detail.count
          : 0;
      setAlertCount((current) => Math.max(0, current - count));
    };

    window.addEventListener("saans:alerts-acknowledged", handleAcknowledged);

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("doctors")
        .select("name, hospital")
        .eq("id", user.id)
        .single();
      if (data?.name) {
        setDoctorName(`Dr. ${data.name.replace(/^dr\.?\s*/i, "")}`);
        const parts = data.name.trim().split(" ");
        const ini =
          parts.length >= 2
            ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
            : parts[0]!.slice(0, 2);
        setInitials(ini.toUpperCase());
      }
      if (data?.hospital) {
        setHospital(data.hospital);
      }

      const refreshAlerts = async () => {
        const response = await fetch("/api/doctor/patients", { credentials: "include" });
        const body = (await response.json().catch(() => null)) as {
          patients?: Array<{
            disease_alerts?: Array<{
              alert_type: string;
              acknowledged_by_doctor: boolean | null;
              is_suppressed: boolean | null;
            }> | null;
          }>;
        } | null;
        const count = (body?.patients ?? []).reduce((total, patient) => {
          const open = (patient.disease_alerts ?? []).filter(
            (alert) =>
              !alert.is_suppressed &&
              !alert.acknowledged_by_doctor &&
              (alert.alert_type === "RED" || alert.alert_type === "YELLOW"),
          ).length;
          return total + open;
        }, 0);
        setAlertCount(count);
      };

      await refreshAlerts();
      alertPoll = setInterval(() => {
        void refreshAlerts();
      }, 30000);
      await loadAppointments();
    });

    return () => {
      window.removeEventListener("saans:alerts-acknowledged", handleAcknowledged);
      if (alertPoll) clearInterval(alertPoll);
    };
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const appointmentNotifications = appointments.filter(
    (appointment) =>
      appointmentMeta(appointment.notes).workflow_status === "requested" ||
      appointmentMeta(appointment.notes).workflow_status === "patient_requested_another",
  );

  useEffect(() => {
    if (alertCount > 0) {
      checkAndPlayNotificationAlert(`doctor_alerts_${alertCount}`);
    } else if (appointmentNotifications.length > 0) {
      checkAndPlayNotificationAlert(`doctor_appointments_${appointmentNotifications[0]?.id}`);
    }
  }, [alertCount, appointmentNotifications]);

  return (
    <nav className={styles.nav}>
      {/* ── Brand & Platform Identity ── */}
      <div className={styles.brand} onClick={() => onViewChange("dashboard")}>
        <SaansBrandIcon className={styles.brandIcon} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className={styles.brandName}>O2Plus</span>
            <span className={styles.brandBadge}>Clinical Suite</span>
          </div>
          <p className={styles.brandSub}>Respiratory Intelligence Platform</p>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className={styles.tabs}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              onClick={() => onViewChange(tab.id)}
            >
              <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{tab.label}</span>
              {tab.id === "appointments" && appointmentNotifications.length > 0 && (
                <span className={styles.tabBadge}>{appointmentNotifications.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Right Utility Strip ── */}
      <div className={styles.right}>
        {/* Live System Status Pill */}
        <div className={styles.livePill}>
          <span className={styles.liveDot} />
          <span className={styles.liveText}>Live EHR Connected</span>
        </div>

        {/* Appointment Requests Dropdown */}
        <div className={styles.appointmentWrap} ref={notifRef}>
          <button
            type="button"
            className={`${styles.iconBtn} ${appointmentOpen ? styles.iconBtnActive : ""}`}
            aria-label="Appointment requests"
            aria-expanded={appointmentOpen}
            onClick={() => {
              setAppointmentOpen((open) => !open);
              setProfileOpen(false);
            }}
          >
            <CalendarClock size={17} strokeWidth={1.8} />
            {appointmentNotifications.length > 0 && (
              <span className={styles.notifBadge}>{appointmentNotifications.length}</span>
            )}
          </button>

          {appointmentOpen && (
            <div className={styles.dropdownPanel}>
              <div className={styles.panelHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarClock size={16} className={styles.headerIcon} />
                  <h3 className={styles.panelTitle}>Appointment Requests</h3>
                </div>
                {appointmentNotifications.length > 0 && (
                  <span className={styles.panelBadge}>{appointmentNotifications.length} Action Needed</span>
                )}
              </div>

              {appointmentNotifications.length === 0 ? (
                <div className={styles.emptyState}>
                  <CheckCircle2 size={24} className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>All caught up</p>
                  <p className={styles.emptySub}>No pending appointment requests from patients.</p>
                </div>
              ) : (
                <div className={styles.appointmentList}>
                  {appointmentNotifications.map((appointment) => {
                    const meta = appointmentMeta(appointment.notes);
                    const draft = actionDrafts[appointment.id] ?? { date: "", time: "", remarks: "" };
                    const isCounterOffer = meta.workflow_status === "patient_requested_another";

                    return (
                      <div key={appointment.id} className={styles.appointmentCard}>
                        <div className={styles.cardTop}>
                          <div>
                            <p className={styles.patientName}>{appointment.patients?.name ?? "Patient"}</p>
                            <p className={styles.scheduledTime}>
                              <Clock size={12} />
                              {formatAppointmentDate(appointment.scheduled_at)}
                            </p>
                          </div>
                          <span className={isCounterOffer ? styles.tagCounter : styles.tagNew}>
                            {isCounterOffer ? "Patient Reschedule" : "New Request"}
                          </span>
                        </div>

                        {meta.reason && (
                          <div className={styles.reasonBox}>
                            <strong>Reason:</strong> {meta.reason} {meta.mode ? `(${meta.mode})` : ""}
                          </div>
                        )}

                        <textarea
                          className={styles.remarksInput}
                          rows={2}
                          placeholder="Add clinical remarks or instructions (optional)..."
                          value={draft.remarks}
                          onChange={(e) =>
                            setActionDrafts((curr) => ({
                              ...curr,
                              [appointment.id]: { ...draft, remarks: e.target.value },
                            }))
                          }
                        />

                        <div className={styles.actionButtons}>
                          <button
                            type="button"
                            className={styles.approveBtn}
                            onClick={() => updateAppointment(appointment.id, "approved")}
                          >
                            <CheckCircle2 size={13} />
                            Approve
                          </button>
                          <button
                            type="button"
                            className={styles.rejectBtn}
                            onClick={() => updateAppointment(appointment.id, "rejected")}
                          >
                            <XCircle size={13} />
                            Decline
                          </button>
                        </div>

                        <div className={styles.rescheduleSection}>
                          <p className={styles.rescheduleLabel}>Or Propose New Schedule:</p>
                          <div className={styles.rescheduleInputs}>
                            <input
                              type="date"
                              className={styles.dateInput}
                              value={draft.date}
                              onChange={(e) =>
                                setActionDrafts((curr) => ({
                                  ...curr,
                                  [appointment.id]: { ...draft, date: e.target.value },
                                }))
                              }
                            />
                            <input
                              type="time"
                              className={styles.timeInput}
                              value={draft.time}
                              onChange={(e) =>
                                setActionDrafts((curr) => ({
                                  ...curr,
                                  [appointment.id]: { ...draft, time: e.target.value },
                                }))
                              }
                            />
                          </div>
                          <button
                            type="button"
                            className={styles.suggestBtn}
                            onClick={() => updateAppointment(appointment.id, "reschedule_suggested")}
                          >
                            Send Schedule Proposal
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Doctor Clinical Profile Dropdown (Replaces raw sign out button) */}
        <div className={styles.profileWrap} ref={profileRef}>
          <button
            type="button"
            className={`${styles.doctorPill} ${profileOpen ? styles.doctorPillActive : ""}`}
            aria-label="View doctor profile menu"
            onClick={() => {
              setProfileOpen((open) => !open);
              setAppointmentOpen(false);
            }}
          >
            <div className={styles.doctorAvatar}>{initials}</div>
            <div className={styles.doctorPillText}>
              <span className={styles.doctorName}>{doctorName}</span>
              <span className={styles.doctorRole}>Pulmonologist</span>
            </div>
            <ChevronDown size={14} className={styles.chevronIcon} />
          </button>

          {profileOpen && (
            <div className={styles.profileModal}>
              {/* Doctor Card Header */}
              <div className={styles.profileHeader}>
                <div className={styles.profileAvatarLarge}>{initials}</div>
                <div className={styles.profileHeaderInfo}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h4 className={styles.profileFullName}>{doctorName}</h4>
                    <span title="Verified Clinical Practitioner" style={{ display: "inline-flex" }}>
                      <ShieldCheck size={16} className={styles.verifiedIcon} />
                    </span>
                  </div>
                  <p className={styles.profileSpecialty}>
                    <Stethoscope size={12} />
                    Pulmonology &amp; Respiratory Care
                  </p>
                  <p className={styles.profileHospital}>
                    <Building2 size={12} />
                    {hospital}
                  </p>
                </div>
              </div>

              {/* Status & Scope Chips */}
              <div className={styles.profileStatsGrid}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Access Level</span>
                  <span className={styles.statVal}>Attending Doctor</span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Clinical Status</span>
                  <span className={styles.statVal} style={{ color: "#38bdf8" }}>Active Practice</span>
                </div>
              </div>

              {/* Professional Sign Out Action */}
              <button
                type="button"
                className={styles.signOutAction}
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>Sign Out of Workstation</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
