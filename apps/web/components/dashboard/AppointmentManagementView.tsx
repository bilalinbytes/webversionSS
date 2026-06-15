"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock } from "lucide-react";
import styles from "./AppointmentManagementView.module.css";

type ConsultationType = "online" | "offline" | "both";
type Queue = "pending" | "approved" | "rejected" | "completed";
type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

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
  patients?: { name?: string | null } | null;
}

interface Settings {
  accepts_appointments: boolean;
  consultation_type: ConsultationType;
  available_days: DayKey[];
  time_slots: Partial<Record<DayKey, { start?: string; end?: string }>>;
  slot_duration: number;
  max_patients_per_slot: number;
  availability_configured: boolean;
}

const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const DEFAULT_SETTINGS: Settings = {
  accepts_appointments: false,
  consultation_type: "both",
  available_days: [],
  time_slots: {},
  slot_duration: 15,
  max_patients_per_slot: 1,
  availability_configured: false,
};

function parseMeta(notes: string | null): AppointmentMeta {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as AppointmentMeta;
    return parsed && typeof parsed === "object" ? parsed : { reason: notes };
  } catch {
    return { reason: notes };
  }
}

function workflow(row: DoctorAppointment) {
  return parseMeta(row.notes).workflow_status ?? row.status;
}

function queueFor(row: DoctorAppointment): Queue {
  const status = workflow(row);
  if (status === "rejected" || row.status === "cancelled") return "rejected";
  if (status === "completed" || row.status === "completed") return "completed";
  if (status === "requested" || status === "patient_requested_another") return "pending";
  return "approved";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toScheduledAt(date: string, time: string) {
  return `${date}T${time}:00+05:30`;
}

export function AppointmentManagementView() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [queue, setQueue] = useState<Queue>("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { date: string; time: string; remarks: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [settingsRes, appointmentsRes] = await Promise.all([
      fetch("/api/doctor/appointment-settings", { credentials: "include" }),
      fetch("/api/appointments", { credentials: "include" }),
    ]);
    const settingsBody = await settingsRes.json().catch(() => null) as { settings?: Settings; error?: string } | null;
    const appointmentsBody = await appointmentsRes.json().catch(() => null) as { appointments?: DoctorAppointment[]; error?: string } | null;
    if (settingsRes.ok && settingsBody?.settings) {
      setSettings({ ...DEFAULT_SETTINGS, ...settingsBody.settings });
    } else {
      setError(settingsBody?.error ?? "Unable to load appointment settings.");
    }
    if (appointmentsRes.ok) {
      setAppointments(appointmentsBody?.appointments ?? []);
    } else {
      setError(appointmentsBody?.error ?? "Unable to load appointments.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const queueCounts = useMemo(() => ({
    pending: appointments.filter((item) => queueFor(item) === "pending").length,
    approved: appointments.filter((item) => queueFor(item) === "approved").length,
    rejected: appointments.filter((item) => queueFor(item) === "rejected").length,
    completed: appointments.filter((item) => queueFor(item) === "completed").length,
  }), [appointments]);

  const visibleAppointments = useMemo(
    () => appointments.filter((item) => queueFor(item) === queue),
    [appointments, queue],
  );

  function toggleDay(day: DayKey) {
    setSettings((current) => {
      const active = current.available_days.includes(day);
      const available_days = active
        ? current.available_days.filter((entry) => entry !== day)
        : [...current.available_days, day];
      const time_slots = { ...current.time_slots };
      if (!active && !time_slots[day]) time_slots[day] = { start: "09:00", end: "13:00" };
      return { ...current, available_days, time_slots };
    });
  }

  function updateSlot(day: DayKey, field: "start" | "end", value: string) {
    setSettings((current) => ({
      ...current,
      time_slots: {
        ...current.time_slots,
        [day]: { ...(current.time_slots[day] ?? {}), [field]: value },
      },
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const response = await fetch("/api/doctor/appointment-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        accepts_appointments: settings.accepts_appointments,
        consultation_type: settings.consultation_type,
        available_days: settings.available_days,
        time_slots: settings.time_slots,
        slot_duration: settings.slot_duration,
        max_patients_per_slot: settings.max_patients_per_slot,
      }),
    });
    const body = await response.json().catch(() => null) as { error?: string; details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } } | null;
    setSaving(false);
    if (!response.ok) {
      const firstFieldError = body?.details?.fieldErrors
        ? Object.values(body.details.fieldErrors).flat()[0]
        : null;
      setError(firstFieldError ?? body?.details?.formErrors?.[0] ?? body?.error ?? "Could not save settings.");
      return;
    }
    setMessage("Appointment settings saved.");
    await load();
  }

  async function updateAppointment(id: string, status: "approved" | "rejected" | "reschedule_suggested" | "completed") {
    const draft = drafts[id] ?? { date: "", time: "", remarks: "" };
    const scheduled_at = status === "reschedule_suggested" && draft.date && draft.time
      ? toScheduledAt(draft.date, draft.time)
      : undefined;
    if (status === "reschedule_suggested" && !scheduled_at) {
      setError("Choose date and time before rescheduling.");
      return;
    }
    setError(null);
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
    const body = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setError(body?.error ?? "Could not update appointment.");
      return;
    }
    await load();
  }

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Appointments</h1>
          <p className={styles.subtitle}>Configure availability and manage requests by status.</p>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <p className={styles.panelTitle}>Appointment Settings</p>
          {settings.accepts_appointments && !settings.availability_configured && (
            <div className={styles.warning}>
              <AlertCircle size={16} />
              <span>Appointment booking is enabled, but availability has not been configured.</span>
            </div>
          )}

          <div className={styles.field}>
            <span className={styles.label}>Accept Appointments</span>
            <div className={styles.toggleRow}>
              <button type="button" className={`${styles.toggleBtn} ${settings.accepts_appointments ? styles.active : ""}`} onClick={() => setSettings((current) => ({ ...current, accepts_appointments: true }))}>Yes</button>
              <button type="button" className={`${styles.toggleBtn} ${!settings.accepts_appointments ? styles.active : ""}`} onClick={() => setSettings((current) => ({ ...current, accepts_appointments: false }))}>No</button>
            </div>
          </div>

          {settings.accepts_appointments && (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="consultation-type">Consultation Type</label>
                <select id="consultation-type" className={styles.select} value={settings.consultation_type} onChange={(event) => setSettings((current) => ({ ...current, consultation_type: event.target.value as ConsultationType }))}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Available Days</span>
                <div className={styles.dayGrid}>
                  {DAYS.map((day) => (
                    <button key={day.key} type="button" className={`${styles.dayBtn} ${settings.available_days.includes(day.key) ? styles.active : ""}`} onClick={() => toggleDay(day.key)}>
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Time Slots</span>
                {settings.available_days.length === 0 ? (
                  <p className={styles.subtitle}>Select available days first.</p>
                ) : (
                  settings.available_days.map((day) => (
                    <div key={day} className={styles.timeRow}>
                      <span className={styles.dayName}>{DAYS.find((entry) => entry.key === day)?.label ?? day}</span>
                      <input className={styles.input} type="time" value={settings.time_slots[day]?.start ?? ""} onChange={(event) => updateSlot(day, "start", event.target.value)} />
                      <input className={styles.input} type="time" value={settings.time_slots[day]?.end ?? ""} onChange={(event) => updateSlot(day, "end", event.target.value)} />
                    </div>
                  ))
                )}
              </div>

              <div className={styles.timeGrid}>
                <div className={styles.field} style={{ flex: "1 1 150px" }}>
                  <label className={styles.label} htmlFor="slot-duration">Slot Duration</label>
                  <input id="slot-duration" className={styles.input} type="number" min={5} max={180} value={settings.slot_duration} onChange={(event) => setSettings((current) => ({ ...current, slot_duration: Number(event.target.value) }))} />
                </div>
                <div className={styles.field} style={{ flex: "1 1 150px" }}>
                  <label className={styles.label} htmlFor="max-patients">Max Patients</label>
                  <input id="max-patients" className={styles.input} type="number" min={1} max={25} value={settings.max_patients_per_slot} onChange={(event) => setSettings((current) => ({ ...current, max_patients_per_slot: Number(event.target.value) }))} />
                </div>
              </div>
            </>
          )}

          <button type="button" className={styles.saveBtn} onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {message && <p className={styles.message}>{message}</p>}
          {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
        </section>

        <section className={styles.panel}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <CalendarClock size={17} color="#126969" />
            <p className={styles.panelTitle} style={{ margin: 0 }}>Appointment Queue</p>
          </div>
          <div className={styles.queueTabs}>
            {([
              ["pending", "Pending Requests"],
              ["approved", "Approved"],
              ["rejected", "Rejected"],
              ["completed", "Completed"],
            ] as Array<[Queue, string]>).map(([id, label]) => (
              <button key={id} type="button" className={`${styles.queueTab} ${queue === id ? styles.active : ""}`} onClick={() => setQueue(id)}>
                {label} ({queueCounts[id]})
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.empty}>Loading appointments...</div>
          ) : visibleAppointments.length === 0 ? (
            <div className={styles.empty}>No appointments in this queue.</div>
          ) : (
            <div className={styles.list}>
              {visibleAppointments.map((appointment) => {
                const meta = parseMeta(appointment.notes);
                const draft = drafts[appointment.id] ?? { date: "", time: "", remarks: "" };
                return (
                  <article key={appointment.id} className={styles.appointment}>
                    <div className={styles.appointmentTop}>
                      <div>
                        <p className={styles.patient}>{appointment.patients?.name ?? "Patient"}</p>
                        <p className={styles.meta}>{formatDateTime(appointment.scheduled_at)} · {meta.mode ?? "Clinic"}</p>
                        {meta.reason && <p className={styles.meta}>Reason: {meta.reason}</p>}
                        {meta.doctor_remarks && <p className={styles.meta}>Remarks: {meta.doctor_remarks}</p>}
                      </div>
                      <span className={styles.status}>{workflow(appointment).replace(/_/g, " ")}</span>
                    </div>

                    {queue !== "completed" && queue !== "rejected" && (
                      <>
                        <div className={styles.rescheduleGrid}>
                          <input className={styles.input} type="date" value={draft.date} onChange={(event) => setDrafts((current) => ({ ...current, [appointment.id]: { ...draft, date: event.target.value } }))} />
                          <input className={styles.input} type="time" value={draft.time} onChange={(event) => setDrafts((current) => ({ ...current, [appointment.id]: { ...draft, time: event.target.value } }))} />
                          <input className={styles.input} placeholder="Remarks optional" value={draft.remarks} onChange={(event) => setDrafts((current) => ({ ...current, [appointment.id]: { ...draft, remarks: event.target.value } }))} />
                        </div>
                        <div className={styles.actions} style={{ marginTop: 10 }}>
                          {queue === "pending" && <button type="button" className={styles.approveBtn} onClick={() => updateAppointment(appointment.id, "approved")}>Approve</button>}
                          <button type="button" className={styles.rescheduleBtn} onClick={() => updateAppointment(appointment.id, "reschedule_suggested")}>Reschedule</button>
                          <button type="button" className={styles.rejectBtn} onClick={() => updateAppointment(appointment.id, "rejected")}>Reject</button>
                          {queue === "approved" && <button type="button" className={styles.completeBtn} onClick={() => updateAppointment(appointment.id, "completed")}>Complete</button>}
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
