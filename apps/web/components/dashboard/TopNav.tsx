"use client";

import { Bell, CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import styles from "./TopNav.module.css";

type View = "dashboard" | "create" | "export" | "appointments";

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
  activeView: View;
  onViewChange: (view: View) => void;
}

const TABS: { id: View; label: string }[] = [
  { id: "dashboard", label: "Patients" },
  { id: "create",    label: "Add Patient" },
  { id: "appointments", label: "Appointments" },
  { id: "export",    label: "Export Data" },
];

export function TopNav({ activeView, onViewChange }: TopNavProps) {
  const router = useRouter();
  const [doctorName, setDoctorName] = useState("Doctor");
  const [initials, setInitials] = useState("DR");
  // SRS §2.1 — real unacknowledged alert count
  const [alertCount, setAlertCount] = useState(0);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [actionDrafts, setActionDrafts] = useState<Record<string, { date: string; time: string; remarks: string }>>({});

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
    const body = await response.json().catch(() => null) as { appointments?: DoctorAppointment[] } | null;
    if (response.ok) setAppointments(body?.appointments ?? []);
  }

  async function updateAppointment(id: string, status: "approved" | "rejected" | "reschedule_suggested") {
    const draft = actionDrafts[id] ?? { date: "", time: "", remarks: "" };
    const scheduled_at = status === "reschedule_suggested" && draft.date && draft.time
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
        .select("name")
        .eq("id", user.id)
        .single();
      if (data?.name) {
        setDoctorName(`Dr. ${data.name.split(" ")[0]}`);
        const parts = data.name.trim().split(" ");
        const ini = parts.length >= 2
          ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
          : parts[0]!.slice(0, 2);
        setInitials(ini.toUpperCase());
      }

      const refreshAlerts = async () => {
        const response = await fetch("/api/doctor/patients", { credentials: "include" });
        const body = await response.json().catch(() => null) as {
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
    router.push("/login");
  }

  const appointmentNotifications = appointments.filter((appointment) =>
    appointmentMeta(appointment.notes).workflow_status === "requested" ||
    appointmentMeta(appointment.notes).workflow_status === "patient_requested_another"
  );

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <SaansBrandIcon className={styles.brandIcon} />
        <div>
          <p className={styles.brandName}>Saans Sync</p>
          <p className={styles.brandSub}>Connecting missing dots with your doctor…</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeView === tab.id ? styles.tabActive : ""}`}
            onClick={() => onViewChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.signOutBtn}
          onClick={handleLogout}
        >
          Sign Out
        </button>
        <div className={styles.appointmentWrap}>
          <button
            type="button"
            className={styles.notifBtn}
            aria-label="Appointment notifications"
            aria-expanded={appointmentOpen}
            onClick={() => setAppointmentOpen((open) => !open)}
          >
            <CalendarClock size={16} strokeWidth={1.5} />
            {appointmentNotifications.length > 0 && <span className={styles.notifBadge}>{appointmentNotifications.length}</span>}
          </button>
          {appointmentOpen && (
            <div className={styles.appointmentPanel}>
              <p className={styles.appointmentPanelTitle}>Appointment Requests</p>
              {appointmentNotifications.length === 0 ? (
                <p className={styles.appointmentEmpty}>No appointment requests.</p>
              ) : (
                <div className={styles.appointmentList}>
                  {appointmentNotifications.map((appointment) => {
                    const meta = appointmentMeta(appointment.notes);
                    const draft = actionDrafts[appointment.id] ?? { date: "", time: "", remarks: "" };
                    return (
                      <div key={appointment.id} className={styles.appointmentItem}>
                        <div className={styles.appointmentItemTop}>
                          <div>
                            <p className={styles.appointmentPatient}>{appointment.patients?.name ?? "Patient"}</p>
                            <p className={styles.appointmentTime}>{formatAppointmentDate(appointment.scheduled_at)}</p>
                          </div>
                          <span className={styles.appointmentStatus}>
                          {appointmentMeta(appointment.notes).workflow_status === "patient_requested_another" ? "Patient response" : "New request"}
                          </span>
                        </div>
                        <p className={styles.appointmentMeta}>
                          {meta.mode ?? "Clinic"}{meta.reason ? ` - ${meta.reason}` : ""}
                        </p>
                        <textarea
                          className={styles.appointmentTextarea}
                          rows={2}
                          placeholder="Remarks optional"
                          value={draft.remarks}
                          onChange={(event) => setActionDrafts((current) => ({
                            ...current,
                            [appointment.id]: { ...draft, remarks: event.target.value },
                          }))}
                        />
                        <div className={styles.appointmentActions}>
                          <button type="button" className={styles.approveBtn} onClick={() => updateAppointment(appointment.id, "approved")}>Approve</button>
                          <button type="button" className={styles.rejectBtn} onClick={() => updateAppointment(appointment.id, "rejected")}>Reject</button>
                        </div>
                        <div className={styles.rescheduleGrid}>
                          <input
                            type="date"
                            value={draft.date}
                            onChange={(event) => setActionDrafts((current) => ({
                              ...current,
                              [appointment.id]: { ...draft, date: event.target.value },
                            }))}
                          />
                          <input
                            type="time"
                            value={draft.time}
                            onChange={(event) => setActionDrafts((current) => ({
                              ...current,
                              [appointment.id]: { ...draft, time: event.target.value },
                            }))}
                          />
                        </div>
                        <button type="button" className={styles.rescheduleBtn} onClick={() => updateAppointment(appointment.id, "reschedule_suggested")}>
                          Suggest New Date/Time
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <button type="button" className={styles.notifBtn} aria-label="Notifications">
          <Bell size={16} strokeWidth={1.5} />
          {alertCount > 0 && <span className={styles.notifBadge}>{alertCount}</span>}
        </button>
        <div className={styles.doctorPill}>
          <div className={styles.doctorAvatar}>{initials}</div>
          <span className={styles.doctorName}>{doctorName}</span>
        </div>
      </div>
    </nav>
  );
}
