"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock, CheckCircle, Clock, XCircle,
  Building2, Monitor, AlertTriangle, Calendar,
  RotateCcw, Mail, Check,
} from "lucide-react";
import styles from "./BookAppointmentView.module.css";

type Mode = "Clinic" | "Online Consultation";

interface AppointmentMeta {
  reason?: string;
  mode?: Mode;
  doctor_remarks?: string;
  workflow_status?: string;
  history?: Array<{
    action: string;
    actor: "patient" | "doctor";
    at: string;
    scheduled_at?: string;
    remarks?: string;
  }>;
}

interface AppointmentItem {
  id: string;
  scheduled_at: string;
  status: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
  meta?: AppointmentMeta;
}

interface DoctorSettings {
  accepts_appointments: boolean;
  consultation_type: "online" | "offline" | "both";
  available_days: string[];
  time_slots: Record<string, { start?: string; end?: string }>;
  availability_configured: boolean;
  slot_duration?: number;
  doctor_name?: string | null;
  doctor_email?: string | null;
}

/* ── Helpers ──────────────────────────────────────────────── */

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTimeOnly(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
}

const DAY_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;

function dayKeyFromDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAY_KEYS[new Date(y!, m! - 1, d!).getDay()] ?? "";
}

function generateTimeSlots(start: string, end: string, durationMins: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  if (startH === undefined || startM === undefined || endH === undefined || endM === undefined) return slots;
  let cur = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  while (cur < endTotal) {
    const h = Math.floor(cur / 60).toString().padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    cur += durationMins;
  }
  return slots;
}

function workflowStatus(appt: AppointmentItem) {
  return appt.meta?.workflow_status ?? appt.status;
}

interface BadgeProps { status: string }
function StatusBadge({ status }: BadgeProps) {
  if (status === "requested") {
    return (
      <span className={`${styles.badge} ${styles.badgePending}`}>
        <Clock size={11} /> Pending
      </span>
    );
  }
  if (status === "approved" || status === "patient_accepted") {
    return (
      <span className={`${styles.badge} ${styles.badgeConfirmed}`}>
        <CheckCircle size={11} /> Confirmed
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className={`${styles.badge} ${styles.badgeRejected}`}>
        <XCircle size={11} /> Rejected
      </span>
    );
  }
  if (status === "reschedule_suggested") {
    return (
      <span className={`${styles.badge} ${styles.badgeSuggested}`}>
        <RotateCcw size={11} /> New Time Suggested
      </span>
    );
  }
  if (status === "patient_requested_another") {
    return (
      <span className={`${styles.badge} ${styles.badgeSuggested}`}>
        <RotateCcw size={11} /> Another Slot Requested
      </span>
    );
  }
  return (
    <span className={`${styles.badge} ${styles.badgeOther}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ── Component ───────────────────────────────────────────── */

export function BookAppointmentView() {
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<Mode>("Clinic");
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [doctorSettings, setDoctorSettings] = useState<DoctorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [anotherSlot, setAnotherSlot] = useState<Record<string, { date: string; time: string; remarks: string }>>({});
  const [activeStep, setActiveStep] = useState(1);

  async function loadAppointments() {
    setLoading(true);
    const response = await fetch("/api/patient/appointments", { credentials: "include" });
    const body = await response.json().catch(() => null) as {
      appointments?: AppointmentItem[];
      doctor_settings?: DoctorSettings | null;
      error?: string;
    } | null;
    if (response.ok) {
      setAppointments(body?.appointments ?? []);
      setDoctorSettings(body?.doctor_settings ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { void loadAppointments(); }, []);

  useEffect(() => {
    if (!doctorSettings) return;
    if (doctorSettings.consultation_type === "online") setMode("Online Consultation");
    if (doctorSettings.consultation_type === "offline") setMode("Clinic");
  }, [doctorSettings]);

  // Derive available time slots for the selected date
  const selectedDayKey = dayKeyFromDate(date);
  const selectedDaySlot = doctorSettings?.time_slots?.[selectedDayKey];
  const isDayAvailable = doctorSettings?.available_days?.includes(selectedDayKey) ?? false;
  const availableSlots: string[] = isDayAvailable && selectedDaySlot?.start && selectedDaySlot?.end
    ? generateTimeSlots(selectedDaySlot.start, selectedDaySlot.end, doctorSettings?.slot_duration ?? 15)
    : [];

  const bookingDisabledReason = !doctorSettings
    ? null
    : !doctorSettings.availability_configured
      ? "Your doctor has not yet configured their availability. Please check back later."
      : null;
  const canBook = !bookingDisabledReason;

  const allowedModes: Mode[] = doctorSettings?.consultation_type === "online"
    ? ["Online Consultation"]
    : doctorSettings?.consultation_type === "offline"
      ? ["Clinic"]
      : ["Clinic", "Online Consultation"];

  async function submitRequest() {
    if (!date || !timeSlot || submitting) return;
    setSubmitting(true);
    setMessage(null);
    const response = await fetch("/api/patient/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ date, time_slot: timeSlot, reason: reason.trim() || undefined, mode }),
    });
    const body = await response.json().catch(() => null) as { error?: string } | null;
    setSubmitting(false);
    if (!response.ok) {
      setMessage({ text: body?.error ?? "Could not send appointment request.", type: "error" });
      return;
    }
    setDate(""); setTimeSlot(""); setReason(""); setMode("Clinic");
    setActiveStep(1);
    setMessage({ text: "Appointment request sent to your doctor.", type: "success" });
    await loadAppointments();
  }

  async function respondToReschedule(id: string, action: "accept_reschedule" | "request_another_slot") {
    const slot = anotherSlot[id] ?? { date: "", time: "", remarks: "" };
    if (action === "request_another_slot" && (!slot.date || !slot.time)) {
      setMessage({ text: "Please choose another date and time.", type: "error" });
      return;
    }
    const response = await fetch("/api/patient/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id, action,
        date: action === "request_another_slot" ? slot.date : undefined,
        time_slot: action === "request_another_slot" ? slot.time : undefined,
        remarks: slot.remarks || undefined,
      }),
    });
    const body = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setMessage({ text: body?.error ?? "Could not update appointment.", type: "error" });
      return;
    }
    setMessage({
      text: action === "accept_reschedule" ? "Appointment accepted successfully." : "Another slot request sent.",
      type: "success",
    });
    await loadAppointments();
  }

  /* ── No appointments state ────────────────────────────── */
  if (!loading && doctorSettings !== null && !doctorSettings.accepts_appointments) {
    return (
      <div className={styles.page}>
        <div className={styles.noApptHero}>
          <div className={styles.heroContent}>
            <div className={styles.heroTop}>
              <div className={styles.heroIconWrap}><CalendarClock size={22} /></div>
              <h1 className={styles.heroTitle}>Book Appointment</h1>
            </div>
            <p className={styles.heroSub}>Online scheduling status</p>
          </div>
        </div>
        <div className={styles.noApptContainer}>
          <div className={styles.noApptCard}>
            <div className={styles.noApptIconWrap}><XCircle size={28} strokeWidth={1.8} /></div>
            <h2 className={styles.noApptTitle}>Online Booking Not Available</h2>
            <p className={styles.noApptSub}>
              {doctorSettings.doctor_name ? `Dr. ${doctorSettings.doctor_name}` : "Your assigned doctor"} has not enabled
              online appointment booking. Please contact the clinic or hospital directly.
            </p>
            {doctorSettings.doctor_email && (
              <a href={`mailto:${doctorSettings.doctor_email}`} className={styles.emailLink}>
                <Mail size={15} />
                {doctorSettings.doctor_email}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Main page ────────────────────────────────────────── */
  return (
    <div className={styles.page}>
      {/* Hero Header */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroTop}>
            <div className={styles.heroIconWrap}><CalendarClock size={22} /></div>
            <h1 className={styles.heroTitle}>Book Appointment</h1>
          </div>
          <p className={styles.heroSub}>Schedule a visit with your doctor, manage your sessions, and track requests.</p>
        </div>
      </div>

      {/* Main Container */}
      <div className={styles.container}>
        {/* Availability Strip */}
        {doctorSettings?.available_days?.length ? (
          <div className={styles.availStrip}>
            <span className={styles.availLabel}>Available</span>
            {doctorSettings.available_days.map((day) => {
              const slot = doctorSettings.time_slots?.[day];
              return (
                <span key={day} className={styles.availPill}>
                  <Clock size={10} />
                  {day.slice(0, 3).toUpperCase()}{slot?.start && slot?.end ? ` · ${slot.start}–${slot.end}` : ""}
                </span>
              );
            })}
          </div>
        ) : null}

        {/* Reschedule Suggestion Notifications (Notification-First Design) */}
        {appointments.filter((a) => workflowStatus(a) === "reschedule_suggested").map((appt) => {
          const slotData = anotherSlot[appt.id] ?? { date: "", time: "", remarks: "" };
          return (
            <div key={appt.id} className={styles.notifCard}>
              <div className={styles.notifHeader}>
                <Clock size={14} color="#fff" />
                <h3 className={styles.notifHeaderTitle}>Reschedule Suggestion</h3>
              </div>
              <div className={styles.notifBody}>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "#374151" }}>
                  Dr. {doctorSettings?.doctor_name || "Doctor"} has suggested a new time for your appointment on <strong>{formatDateOnly(appt.scheduled_at)} at {formatTimeOnly(appt.scheduled_at)}</strong>.
                  {appt.meta?.doctor_remarks && (
                    <span style={{ display: "block", marginTop: 6, fontStyle: "italic", color: "#6B7280" }}>
                     Note: &quot;{appt.meta.doctor_remarks}&quot;
                    </span>
                  )}
                </p>
                <div className={styles.notifActions}>
                  <button
                    type="button"
                    className={styles.btnAccept}
                    onClick={() => respondToReschedule(appt.id, "accept_reschedule")}
                  >
                    <CheckCircle size={14} /> Accept Suggested Slot
                  </button>
                  <button
                    type="button"
                    className={styles.btnRequestSlot}
                    onClick={() => respondToReschedule(appt.id, "request_another_slot")}
                  >
                    <RotateCcw size={14} /> Request Another Slot
                  </button>
                </div>
                <div className={styles.altSlotGrid}>
                  <input
                    className={styles.altInput}
                    type="date"
                    value={slotData.date}
                    onChange={(e) => setAnotherSlot((cur) => ({
                      ...cur,
                      [appt.id]: { ...slotData, date: e.target.value },
                    }))}
                  />
                  <input
                    className={styles.altInput}
                    type="time"
                    value={slotData.time}
                    onChange={(e) => setAnotherSlot((cur) => ({
                      ...cur,
                      [appt.id]: { ...slotData, time: e.target.value },
                    }))}
                  />
                </div>
                <textarea
                  className={styles.altTextarea}
                  rows={2}
                  placeholder="Optional note for your doctor about this slot request..."
                  value={slotData.remarks}
                  onChange={(e) => setAnotherSlot((cur) => ({
                    ...cur,
                    [appt.id]: { ...slotData, remarks: e.target.value },
                  }))}
                />
              </div>
            </div>
          );
        })}

        {/* Booking Card */}
        <div className={styles.card}>
          <div className={styles.cardInner}>
            {/* Step progress bar */}
            <div className={styles.stepBar}>
              <div className={`${styles.stepItem} ${activeStep >= 1 ? styles.stepDone : ""} ${activeStep === 1 ? styles.stepActive : ""}`}>
                <div className={`${styles.stepCircle} ${activeStep === 1 ? styles.stepCircleActive : activeStep > 1 ? styles.stepCircleDone : ""}`}>
                  {activeStep > 1 ? <Check size={12} /> : "1"}
                </div>
                <span className={`${styles.stepLabel} ${activeStep === 1 ? styles.stepLabelActive : activeStep > 1 ? styles.stepLabelDone : ""}`}>
                  Date & Time
                </span>
              </div>
              <div className={`${styles.stepItem} ${activeStep >= 2 ? styles.stepDone : ""} ${activeStep === 2 ? styles.stepActive : ""}`}>
                <div className={`${styles.stepCircle} ${activeStep === 2 ? styles.stepCircleActive : activeStep > 2 ? styles.stepCircleDone : ""}`}>
                  {activeStep > 2 ? <Check size={12} /> : "2"}
                </div>
                <span className={`${styles.stepLabel} ${activeStep === 2 ? styles.stepLabelActive : activeStep > 2 ? styles.stepLabelDone : ""}`}>
                  Mode
                </span>
              </div>
              <div className={`${styles.stepItem} ${activeStep >= 3 ? styles.stepDone : ""} ${activeStep === 3 ? styles.stepActive : ""}`}>
                <div className={`${styles.stepCircle} ${activeStep === 3 ? styles.stepCircleActive : activeStep > 3 ? styles.stepCircleDone : ""}`}>
                  {activeStep > 3 ? <Check size={12} /> : "3"}
                </div>
                <span className={`${styles.stepLabel} ${activeStep === 3 ? styles.stepLabelActive : activeStep > 3 ? styles.stepLabelDone : ""}`}>
                  Confirm
                </span>
              </div>
            </div>

            {/* Disabled reason */}
            {bookingDisabledReason && (
              <div className={styles.disabledCard}>
                <AlertTriangle size={18} color="#92400E" style={{ flexShrink: 0 }} />
                <div>
                  <p className={styles.disabledTitle}>Booking Unavailable</p>
                  <p className={styles.disabledText}>{bookingDisabledReason}</p>
                </div>
              </div>
            )}

            {canBook && (
              <>
                {/* STEP 1: DATE & TIME */}
                {activeStep === 1 && (
                  <div>
                    <div className={styles.sectionHead}>
                      <span className={styles.sectionNum}>1</span>
                      <div>
                        <h3 className={styles.sectionTitle}>Select Date & Time</h3>
                        <p className={styles.sectionSub}>Choose a date to view available time slots.</p>
                      </div>
                    </div>

                    <div className={styles.dateSectionInner}>
                      <div className={styles.dateInputWrap}>
                        <input
                          className={styles.dateInput}
                          type="date"
                          value={date}
                          onChange={(e) => { setDate(e.target.value); setTimeSlot(""); }}
                        />
                        <Calendar className={styles.dateInputIcon} size={18} />
                      </div>
                      
                      {date && (
                        <span className={`${styles.dayOfWeekBadge} ${!isDayAvailable ? styles.dayUnavailable : ""}`}>
                          {selectedDayKey.toUpperCase()} {!isDayAvailable && "(Unavailable)"}
                        </span>
                      )}
                    </div>

                    <div className={styles.divider} />

                    <div className={styles.slotsWrap}>
                      <label className={styles.sectionTitle} style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                        Available Slots
                      </label>
                      {!date ? (
                        <div className={`${styles.slotsHint} ${styles.slotsHintInfo}`}>
                          <Clock size={14} /> Select a date to see available slots.
                        </div>
                      ) : !isDayAvailable ? (
                        <div className={`${styles.slotsHint} ${styles.slotsHintWarn}`}>
                          <XCircle size={14} /> Doctor is not available on this day.
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className={`${styles.slotsHint} ${styles.slotsHintWarn}`}>
                          <AlertTriangle size={14} /> No time slots configured for this day.
                        </div>
                      ) : (
                        <div className={styles.slotsGrid}>
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              className={`${styles.chip} ${timeSlot === slot ? styles.chipActive : ""}`}
                              onClick={() => setTimeSlot(slot)}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.submitArea}>
                      <span className={styles.submitHint}>
                        Selected: <span className={styles.submitHintStrong}>{date ? formatDateOnly(date) : "None"}</span> at <span className={styles.submitHintStrong}>{timeSlot || "None"}</span>
                      </span>
                      <button
                        type="button"
                        className={styles.submitBtn}
                        disabled={!date || !timeSlot}
                        onClick={() => setActiveStep(2)}
                      >
                        Continue to Mode
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: CONSULTATION MODE */}
                {activeStep === 2 && (
                  <div>
                    <div className={styles.sectionHead}>
                      <span className={styles.sectionNum}>2</span>
                      <div>
                        <h3 className={styles.sectionTitle}>Consultation Mode</h3>
                        <p className={styles.sectionSub}>Select whether you would like to visit the clinic or schedule an online video call.</p>
                      </div>
                    </div>

                    <div className={styles.modeGrid}>
                      {allowedModes.includes("Clinic") && (
                        <button
                          type="button"
                          className={`${styles.modeCard} ${mode === "Clinic" ? styles.modeCardActive : ""}`}
                          onClick={() => setMode("Clinic")}
                        >
                          <div className={styles.modeIcon}>
                            <Building2 size={18} />
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <p className={styles.modeName}>Clinic Visit</p>
                            <p className={styles.modeDesc}>In-person consultation at the doctor&apos;s office.</p>
                          </div>
                        </button>
                      )}

                      {allowedModes.includes("Online Consultation") && (
                        <button
                          type="button"
                          className={`${styles.modeCard} ${mode === "Online Consultation" ? styles.modeCardActive : ""}`}
                          onClick={() => setMode("Online Consultation")}
                        >
                          <div className={styles.modeIcon}>
                            <Monitor size={18} />
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <p className={styles.modeName}>Online Consultation</p>
                            <p className={styles.modeDesc}>Virtual video appointment from your browser.</p>
                          </div>
                        </button>
                      )}
                    </div>

                    <div className={styles.submitArea}>
                      <button
                        type="button"
                        className={styles.submitBtn}
                        style={{ background: "#f3f4f6", color: "#374151", boxShadow: "none" }}
                        onClick={() => setActiveStep(1)}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className={styles.submitBtn}
                        onClick={() => setActiveStep(3)}
                      >
                        Continue to Confirm
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: DETAILS & CONFIRM */}
                {activeStep === 3 && (
                  <div>
                    <div className={styles.sectionHead}>
                      <span className={styles.sectionNum}>3</span>
                      <div>
                        <h3 className={styles.sectionTitle}>Additional Details & Review</h3>
                        <p className={styles.sectionSub}>Optionally add the reason for your visit and submit the request.</p>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 14, margin: "16px 0" }}>
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px 16px", borderRadius: 12 }}>
                        <p style={{ margin: "0 0 6px", fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Appointment Details</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                          {formatDateOnly(date)} at {timeSlot}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>
                          Mode: <strong>{mode}</strong>
                        </p>
                      </div>

                      <div className={styles.fieldGroup}>
                        <label className={styles.sectionTitle} style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                          Reason for Visit <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(optional)</span>
                        </label>
                        <textarea
                          className={styles.textarea}
                          rows={3}
                          placeholder="Briefly describe your symptoms or reason for the visit…"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </div>
                    </div>

                    {message && (
                      <div className={message.type === "success" ? styles.toastSuccess : styles.toastError}>
                        {message.type === "success" ? <CheckCircle size={15} /> : <XCircle size={15} />}
                        {message.text}
                      </div>
                    )}

                    <div className={styles.submitArea}>
                      <button
                        type="button"
                        className={styles.submitBtn}
                        style={{ background: "#f3f4f6", color: "#374151", boxShadow: "none" }}
                        disabled={submitting}
                        onClick={() => setActiveStep(2)}
                      >
                        Back
                      </button>
                      
                      <button
                        type="button"
                        className={styles.submitBtn}
                        disabled={submitting}
                        onClick={submitRequest}
                      >
                        {submitting ? "Submitting..." : "Submit Appointment"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Appointment History */}
        <div className={styles.card}>
          <div className={styles.historyHead}>
            <h2 className={styles.historyTitle}>Appointment History</h2>
            {appointments.length > 0 && (
              <span className={styles.recordBadge}>{appointments.length} record{appointments.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {loading ? (
            <div className={styles.timeline} style={{ gap: 16 }}>
              {[1, 2].map((i) => (
                <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} style={{ height: 100 }} />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Calendar size={24} /></div>
              <h3 className={styles.emptyTitle}>No appointments yet</h3>
              <p className={styles.emptySub}>Your appointment requests will appear here once submitted.</p>
            </div>
          ) : (
            <div className={styles.timeline}>
              {appointments.map((appt) => {
                const displayStatus = workflowStatus(appt);
                const isConfirmed = displayStatus === "approved" || displayStatus === "patient_accepted";
                
                const downloadICS = () => {
                  const [h, m] = appt.scheduled_at.split("T")[1]?.split("+")[0]?.split(":") ?? ["09", "00"];
                  const dateStr = appt.scheduled_at.split("T")[0]?.replace(/-/g, "") ?? "";
                  const timeStr = `${h}${m}00`;
                  const endH = (parseInt(h ?? "09") + 1).toString().padStart(2, "0");
                  const endTimeStr = `${endH}${m}00`;
                  const icsContent = [
                    "BEGIN:VCALENDAR",
                    "VERSION:2.0",
                    "BEGIN:VEVENT",
                    `SUMMARY:Appointment with Dr. ${doctorSettings?.doctor_name || "Doctor"}`,
                    `DESCRIPTION:Mode: ${appt.meta?.mode ?? "Clinic"}. Reason: ${appt.meta?.reason || "Checkup"}`,
                    `DTSTART:${dateStr}T${timeStr}`,
                    `DTEND:${dateStr}T${endTimeStr}`,
                    "END:VEVENT",
                    "END:VCALENDAR"
                  ].join("\n");
                  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `appointment-${appt.id}.ics`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                };

                return (
                  <div key={appt.id} className={styles.tlItem}>
                    
                    {/* Timeline Line & Dot */}
                    <div className={styles.tlLineWrap}>
                      <div className={`${styles.tlDot} ${
                        displayStatus === "requested" ? styles.tlDotPending :
                        isConfirmed ? styles.tlDotConfirmed :
                        displayStatus === "rejected" ? styles.tlDotRejected :
                        styles.tlDotSuggested
                      }`}>
                        <Clock size={12} />
                      </div>
                    </div>

                    {/* Timeline Content */}
                    <div className={styles.tlContent}>
                      <div className={styles.apptCard}>
                        
                        <div className={styles.apptCardTop}>
                          <div className={styles.apptDateRow}>
                            <div className={styles.apptCalIcon}>
                              <Calendar size={18} />
                            </div>
                            <div>
                              <h4 className={styles.apptDate}>{formatDateOnly(appt.scheduled_at)}</h4>
                              <p className={styles.apptMeta}>
                                {formatTimeOnly(appt.scheduled_at)}
                                <span className={styles.apptMetaDot} />
                                {appt.meta?.mode ?? "Clinic"}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <StatusBadge status={displayStatus} />
                            
                            {isConfirmed && (
                              <button
                                type="button"
                                title="Add to Calendar (ICS)"
                                onClick={downloadICS}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0078D4",
                                  cursor: "pointer",
                                  padding: 4,
                                  borderRadius: 4,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "#EFF6FF"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                              >
                                <CalendarClock size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {appt.meta?.reason && (
                          <p style={{ margin: "0 16px 12px", fontSize: 13, color: "#4B5563", lineHeight: 1.4 }}>
                            {appt.meta.reason}
                          </p>
                        )}

                        {appt.meta?.doctor_remarks && (
                          <div className={styles.remarksBox}>
                            <span className={styles.remarksLabel}>Doctor note:</span>
                            {appt.meta.doctor_remarks}
                          </div>
                        )}

                        {/* Event history trail inside card */}
                        {appt.meta?.history && appt.meta.history.length > 0 && (
                          <div className={styles.eventsTrail}>
                            {appt.meta.history.map((ev) => (
                              <div key={`${ev.at}-${ev.action}`} className={styles.eventRow}>
                                <span className={styles.eventDot} />
                                <span>{formatDateTime(ev.at)} — {ev.action}</span>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
