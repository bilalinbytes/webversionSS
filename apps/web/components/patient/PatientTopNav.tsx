"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  Download,
  Eye,
  FileText,
  Pill,
  HeartPulse,
  ClipboardList,
  History,
  Activity,
  CalendarClock,
  LogOut,
  ChevronDown,
  User,
  Phone,
  Stethoscope,
  Building2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SaansBrandIcon } from "@/components/auth/SaansBrandIcon";
import { PatientReportModal } from "@/components/patient/PatientReportModal";
import { usePatient } from "@/contexts/PatientContext";
import { formatDiagnosisDisplay } from "@o2plus/core";
import { checkAndPlayNotificationAlert } from "@/lib/client/notification-sound";
import styles from "./PatientTopNav.module.css";

type View = "home" | "log" | "history" | "analytics" | "appointments";

interface PatientTopNavProps {
  activeView: View;
  onViewChange: (v: View) => void;
}

const TABS: { id: View; label: string; labelHi: string; icon: React.ElementType }[] = [
  { id: "home", label: "My Health", labelHi: "मेरा स्वास्थ्य", icon: HeartPulse },
  { id: "log", label: "Log Today", labelHi: "आज लॉग करें", icon: ClipboardList },
  { id: "history", label: "Daily Logs", labelHi: "दैनिक लॉग", icon: History },
  { id: "analytics", label: "Analytics", labelHi: "विश्लेषण", icon: Activity },
  { id: "appointments", label: "Appointments", labelHi: "अपॉइंटमेंट", icon: CalendarClock },
];

interface PrescriptionNotificationMed {
  id: string;
  drug_name: string;
  dose: number | null;
  dose_unit: string | null;
  route: string;
  frequency: string | null;
}

interface PrescriptionNotification {
  date: string;
  created_at: string | null;
  medications: PrescriptionNotificationMed[];
}

interface PrescriptionChanges {
  updated_at?: string;
  prescription_date?: string;
  doctor_name?: string;
  has_changes?: boolean;
  stopped?: Array<{ name: string; details?: string; route?: string; dose?: string }>;
  started?: Array<{ name: string; details?: string; route?: string; dose?: string; frequency?: string }>;
  modified?: Array<{ name: string; details?: string; from?: string; to?: string }>;
}

interface PatientInstruction {
  id: string;
  instruction_text: string;
  created_at: string | null;
  read_by_patient_at: string | null;
}

interface AppointmentNotification {
  id: string;
  scheduled_at: string;
  status: string;
  updated_at: string | null;
  created_at: string | null;
  meta?: {
    doctor_remarks?: string;
    mode?: string;
    reason?: string;
    workflow_status?: string;
  };
}

interface ProfileMeta {
  doctorName: string;
  doctorHospital: string;
  diagnosis: string;
  nextAppointment: string;
  age?: number | string | null;
  gender?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  enrolledDate?: string | null;
}

function formatDateTime(value: string | null | undefined, fallbackDate?: string) {
  const source = value ?? fallbackDate;
  if (!source) return "";
  return new Date(source).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isWithinOneDay(value: string | null | undefined, fallbackDate?: string) {
  const source = value ?? fallbackDate;
  if (!source) return false;
  const timestamp = new Date(source).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp < 24 * 60 * 60 * 1000;
}

function normalizeNotificationPart(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getPrescriptionNotificationKey(
  prescription: PrescriptionNotification | null,
  instruction: PatientInstruction | null,
) {
  if (!prescription) {
    if (!instruction?.instruction_text) return null;
    return `instruction:${instruction.id}:${normalizeNotificationPart(instruction.instruction_text)}:${instruction.created_at ?? ""}`;
  }

  const medicationParts = prescription.medications
    .map((medication) => [
      medication.drug_name,
      medication.route,
      medication.dose,
      medication.dose_unit,
      medication.frequency,
    ].map(normalizeNotificationPart).join("|"))
    .sort()
    .join(",");
  const instructionPart = normalizeNotificationPart(instruction?.instruction_text);

  return `${prescription.date}:${prescription.created_at ?? ""}:${medicationParts}:${instructionPart}`;
}

function getAppointmentNotificationKey(appointment: AppointmentNotification | null) {
  if (!appointment) return null;
  const status = appointment.meta?.workflow_status ?? appointment.status;
  return `${appointment.id}:${status}:${appointment.updated_at ?? appointment.created_at ?? appointment.scheduled_at}`;
}

export function PatientTopNav({ activeView, onViewChange }: PatientTopNavProps) {
  const router = useRouter();
  const { patient } = usePatient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [latestPrescription, setLatestPrescription] = useState<PrescriptionNotification | null>(null);
  const [latestInstruction, setLatestInstruction] = useState<PatientInstruction | null>(null);
  const [latestChanges, setLatestChanges] = useState<PrescriptionChanges | null>(null);
  const [seenPrescriptionKey, setSeenPrescriptionKey] = useState<string | null>(null);
  const [appointmentNotification, setAppointmentNotification] = useState<AppointmentNotification | null>(null);
  const [seenAppointmentKey, setSeenAppointmentKey] = useState<string | null>(null);
  const [doctorAcceptsAppointments, setDoctorAcceptsAppointments] = useState<boolean>(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [profileMeta, setProfileMeta] = useState<ProfileMeta>({
    doctorName: "Assigned Pulmonologist",
    doctorHospital: "",
    diagnosis: "Respiratory Care Plan",
    nextAppointment: "Not scheduled",
  });

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or mobile touch
  useEffect(() => {
    function handleClickOutside(e: Event) {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/patient/prescriptions", { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((body: { prescriptions?: PrescriptionNotification[]; instruction?: PatientInstruction | null; latest_changes?: PrescriptionChanges | null } | null) => {
        if (cancelled) return;
        setLatestPrescription(body?.prescriptions?.[0] ?? null);
        setLatestInstruction(body?.instruction ?? null);
        setLatestChanges(body?.latest_changes ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setLatestPrescription(null);
          setLatestInstruction(null);
          setLatestChanges(null);
        }
      });

    return () => { cancelled = true; };
  }, [patient?.id]);

  useEffect(() => {
    if (!patient?.id || typeof window === "undefined") {
      setSeenPrescriptionKey(null);
      return;
    }

    setSeenPrescriptionKey(window.localStorage.getItem(`saans:patient:${patient.id}:seen-prescription-notification`));
    setSeenAppointmentKey(window.localStorage.getItem(`saans:patient:${patient.id}:seen-appointment-notification`));
  }, [patient?.id]);

  useEffect(() => {
    const key = getPrescriptionNotificationKey(latestPrescription, latestInstruction);
    if (!patient?.id || !key || !latestInstruction?.read_by_patient_at || typeof window === "undefined") return;

    const prescriptionTime = new Date(latestPrescription?.created_at ?? latestPrescription?.date ?? "").getTime();
    const instructionTime = new Date(latestInstruction.created_at ?? "").getTime();
    if (
      !Number.isNaN(prescriptionTime) &&
      !Number.isNaN(instructionTime) &&
      instructionTime < prescriptionTime
    ) {
      return;
    }

    window.localStorage.setItem(`saans:patient:${patient.id}:seen-prescription-notification`, key);
    setSeenPrescriptionKey(key);
  }, [latestInstruction, latestPrescription, patient?.id]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/patient/appointments", { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((body: { appointments?: AppointmentNotification[]; doctor_settings?: { accepts_appointments?: boolean } | null } | null) => {
        if (cancelled) return;
        const latest = (body?.appointments ?? []).find((appointment) => {
          const status = appointment.meta?.workflow_status ?? appointment.status;
          return ["approved", "rejected", "reschedule_suggested"].includes(status);
        }) ?? null;
        setAppointmentNotification(latest);
        if (body?.doctor_settings !== undefined) {
          setDoctorAcceptsAppointments(body.doctor_settings?.accepts_appointments ?? false);
        }
      })
      .catch(() => {
        if (!cancelled) setAppointmentNotification(null);
      });

    return () => { cancelled = true; };
  }, [patient?.id]);

  useEffect(() => {
    if (!patient?.id) return;
    let cancelled = false;
    const supabase = createClient();
    const currentPatient = patient;

    async function loadProfileMeta() {
      const [doctorPayload, diagnosisRes, patientDetailsRes, sessionRes] = await Promise.all([
        currentPatient.doctor_id
          ? fetch("/api/patient-doctor", { credentials: "include" })
              .then((response) => response.ok ? response.json() : null)
              .catch(() => null)
          : Promise.resolve(null),
        supabase
          .from("patient_diagnoses")
          .select("primary_diagnosis, effective_dashboard")
          .eq("patient_id", currentPatient.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("patients")
          .select("name, date_of_birth, gender, mobile_number, alternate_mobile_number, emergency_contact_name, emergency_contact_phone, created_at")
          .eq("id", currentPatient.id)
          .maybeSingle(),
        supabase.auth.getSession(),
      ]);

      let nextAppointment = "Not scheduled";
      const token = sessionRes.data.session?.access_token;
      if (token) {
        const appointmentBody = await fetch("/api/appointments/next", {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((response) => response.ok ? response.json() : null)
          .catch(() => null);

        if (appointmentBody?.appointment?.scheduled_at) {
          nextAppointment = formatDate(appointmentBody.appointment.scheduled_at);
        }
      }

      if (cancelled) return;
      const doctor = doctorPayload?.doctor as { name?: string | null; hospital?: string | null } | null | undefined;
      const rawDiagnosis = diagnosisRes.data?.primary_diagnosis ?? currentPatient.effective_dashboard;
      const pt = patientDetailsRes.data;
      const computedAge = pt?.date_of_birth ? Math.floor((Date.now() - new Date(pt.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

      setProfileMeta({
        doctorName: doctor?.name ?? "Assigned Pulmonologist",
        doctorHospital: doctor?.hospital ?? "Pulmonology Clinic",
        diagnosis: (rawDiagnosis ? formatDiagnosisDisplay(rawDiagnosis) : null) ?? "Respiratory Care Plan",
        nextAppointment,
        age: Number.isFinite(computedAge) && computedAge !== null && computedAge > 0 ? computedAge : null,
        gender: pt?.gender ?? null,
        phone: pt?.mobile_number ?? currentPatient.phone ?? null,
        alternatePhone: pt?.alternate_mobile_number ?? null,
        emergencyName: pt?.emergency_contact_name ?? null,
        emergencyPhone: pt?.emergency_contact_phone ?? null,
        enrolledDate: pt?.created_at ? formatDate(pt.created_at) : null,
      });
    }

    loadProfileMeta().catch(() => {
      if (!cancelled) {
        setProfileMeta((current) => ({
          ...current,
          diagnosis: (currentPatient.effective_dashboard ? formatDiagnosisDisplay(currentPatient.effective_dashboard) : null) ?? current.diagnosis,
        }));
      }
    });

    return () => { cancelled = true; };
  }, [patient]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const markPrescriptionSeen = useCallback(() => {
    const prescriptionKey = getPrescriptionNotificationKey(latestPrescription, latestInstruction);
    if (!patient?.id || !prescriptionKey || typeof window === "undefined") return;

    window.localStorage.setItem(`saans:patient:${patient.id}:seen-prescription-notification`, prescriptionKey);
    setSeenPrescriptionKey(prescriptionKey);

    if (latestInstruction?.id && !latestInstruction.read_by_patient_at) {
      setLatestInstruction((instruction) =>
        instruction?.id === latestInstruction.id
          ? { ...instruction, read_by_patient_at: new Date().toISOString() }
          : instruction,
      );
      fetch("/api/patient/prescriptions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction_id: latestInstruction.id }),
      }).catch(() => undefined);
    }
  }, [latestInstruction, latestPrescription, patient?.id]);

  const markAppointmentSeen = useCallback(() => {
    const appointmentKey = getAppointmentNotificationKey(appointmentNotification);
    if (!patient?.id || !appointmentKey || typeof window === "undefined") return;

    window.localStorage.setItem(`saans:patient:${patient.id}:seen-appointment-notification`, appointmentKey);
    setSeenAppointmentKey(appointmentKey);
  }, [appointmentNotification, patient?.id]);

  const patientName = patient?.name || "Patient";
  const nameParts = patientName.trim().split(" ");
  const initials = nameParts.length >= 2
    ? `${nameParts[0]![0]}${nameParts[nameParts.length - 1]![0]}`.toUpperCase()
    : patientName.slice(0, 2).toUpperCase();

  const latestPrescriptionSummary = latestPrescription
    ? latestPrescription.medications
        .slice(0, 3)
        .map((medication) => {
          const dose = medication.dose !== null ? ` ${medication.dose} ${medication.dose_unit ?? ""}`.trimEnd() : "";
          return `${medication.drug_name}${dose}`;
        })
        .join(", ") + (latestPrescription.medications.length > 3 ? ` +${latestPrescription.medications.length - 3} more` : "")
    : "No prescription recorded";

  const prescriptionNotificationKey = getPrescriptionNotificationKey(latestPrescription, latestInstruction);
  const latestPrescriptionAt = latestPrescription?.created_at ?? latestPrescription?.date ?? null;
  const latestInstructionAt = latestInstruction?.created_at ?? null;
  const latestEmergencyAt =
    latestPrescriptionAt && latestInstructionAt
      ? (new Date(latestInstructionAt).getTime() > new Date(latestPrescriptionAt).getTime() ? latestInstructionAt : latestPrescriptionAt)
      : latestInstructionAt ?? latestPrescriptionAt;
  const prescriptionSeen = prescriptionNotificationKey !== null && prescriptionNotificationKey === seenPrescriptionKey;
  const prescriptionInstructionUnread = Boolean(latestInstruction?.instruction_text && !latestInstruction.read_by_patient_at);
  const prescriptionUnread = Boolean(prescriptionNotificationKey && !prescriptionSeen);
  const showPrescriptionBadge = prescriptionNotificationKey
    ? (prescriptionUnread || prescriptionInstructionUnread) &&
      isWithinOneDay(latestEmergencyAt) &&
      !prescriptionSeen
    : false;
  const showPrescriptionNotification = prescriptionNotificationKey !== null;
  const latestPrescriptionPdfUrl = latestPrescription
    ? `/api/patient/prescriptions?format=pdf&date=${encodeURIComponent(latestPrescription.date)}`
    : "";
  const latestPrescriptionFilename = latestPrescription
    ? `o2plus-prescription-${latestPrescription.date}.pdf`
    : "";
  const appointmentNotificationKey = getAppointmentNotificationKey(appointmentNotification);
  const showAppointmentBadge = appointmentNotification
    ? isWithinOneDay(appointmentNotification.updated_at, appointmentNotification.created_at ?? undefined)
      && appointmentNotificationKey !== seenAppointmentKey
    : false;
  const notificationCount = (showPrescriptionBadge ? 1 : 0) + (showAppointmentBadge ? 1 : 0);
  const appointmentStatus = appointmentNotification?.meta?.workflow_status ?? appointmentNotification?.status;

  useEffect(() => {
    if (notificationCount > 0) {
      const activeKey = (showPrescriptionBadge ? prescriptionNotificationKey : null) || (showAppointmentBadge ? appointmentNotificationKey : null);
      if (activeKey) {
        checkAndPlayNotificationAlert(activeKey);
      }
    }
  }, [notificationCount, showPrescriptionBadge, showAppointmentBadge, prescriptionNotificationKey, appointmentNotificationKey]);

  const handleNotificationToggle = () => {
    const nextOpen = !notificationsOpen;

    if (nextOpen) {
      if (prescriptionNotificationKey && showPrescriptionBadge) {
        markPrescriptionSeen();
      }
      if (appointmentNotification) markAppointmentSeen();
    }

    setNotificationsOpen(nextOpen);
    setProfileOpen(false);
  };

  return (
    <nav className={styles.nav}>
      {/* ── Brand ── */}
      <div className={styles.brand} onClick={() => onViewChange("home")}>
        <SaansBrandIcon className={styles.brandIcon} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className={styles.brandName}>O2Plus</span>
            <span className={styles.brandBadge}>Patient Portal</span>
          </div>
          <p className={styles.brandSub}>Respiratory Care Companion</p>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className={styles.tabs}>
        {TABS.filter((tab) => {
          if (tab.id === "appointments" && doctorAcceptsAppointments === false) return false;
          return true;
        }).map((tab) => {
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
              <div className={styles.tabText}>
                <span className={styles.tabEn}>{tab.label}</span>
                <span className={styles.tabHi}>{tab.labelHi}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Right Utility Strip ── */}
      <div className={styles.right}>
        {/* Notifications Center */}
        <div className={styles.notificationWrap} ref={notifRef}>
          <button
            type="button"
            className={`${styles.iconBtn} ${notificationsOpen ? styles.iconBtnActive : ""}`}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={handleNotificationToggle}
          >
            <Bell size={16} strokeWidth={1.8} />
            {notificationCount > 0 && <span className={styles.notifBadge}>{notificationCount}</span>}
          </button>

          {notificationsOpen && (
            <div className={styles.notifPanel} role="region" aria-label="Patient notifications">
              <div className={styles.notifPanelHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Bell size={16} className={styles.headerIcon} />
                  <h3 className={styles.notifHeading}>Care Notifications</h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {notificationCount > 0 && (
                    <span className={styles.notifUnreadPill}>{notificationCount} New</span>
                  )}
                  <button
                    type="button"
                    className={styles.modalCloseBtn}
                    onClick={() => setNotificationsOpen(false)}
                    aria-label="Close notifications"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className={styles.notifFeed}>
                {showPrescriptionNotification && (
                  <article className={`${styles.notifItem} ${styles.notifItemPrimary}`}>
                    <div className={styles.notifMarker} aria-hidden="true">
                      <FileText size={16} strokeWidth={1.9} />
                    </div>
                    <div className={styles.notifContent}>
                      <div className={styles.notifItemHeader}>
                        <div>
                          <p className={styles.notifStatus}>
                            {latestChanges?.has_changes ? "Prescription Updated" : latestPrescription ? "Prescription Ready" : "Doctor Note"}
                          </p>
                          <h4 className={styles.notifTitle}>
                            {latestChanges?.has_changes ? "Prescription Changes" : latestPrescription ? "New Prescription Issued" : "New Care Instruction"}
                          </h4>
                        </div>
                        {latestPrescription && (
                          <span className={styles.notifPrimaryBadge}>Active Regimen</span>
                        )}
                      </div>
                      <time className={styles.notifTime} dateTime={latestEmergencyAt ?? undefined}>
                        {formatDateTime(latestEmergencyAt)}
                      </time>
                      {latestInstruction?.instruction_text && (
                        <p className={styles.notifMessage}>{latestInstruction.instruction_text}</p>
                      )}

                      {/* Structured Changes Breakdown */}
                      {latestChanges?.has_changes && (
                        <div style={{ margin: "6px 0", padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11.5 }}>
                          {latestChanges.stopped && latestChanges.stopped.length > 0 && (
                            <div style={{ color: "#dc2626", marginBottom: 3 }}>
                              <strong>🔴 Stopped:</strong> {latestChanges.stopped.map(m => `${m.name} ${m.details || ""}`).join(", ")}
                            </div>
                          )}
                          {latestChanges.started && latestChanges.started.length > 0 && (
                            <div style={{ color: "#16a34a", marginBottom: 3 }}>
                              <strong>🟢 Started:</strong> {latestChanges.started.map(m => `${m.name} ${m.details || ""}`).join(", ")}
                            </div>
                          )}
                          {latestChanges.modified && latestChanges.modified.length > 0 && (
                            <div style={{ color: "#d97706" }}>
                              <strong>🟡 Modified:</strong> {latestChanges.modified.map(m => `${m.name} (${m.details || `${m.from} → ${m.to}`})`).join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                      {latestPrescription && (
                        <>
                          <div className={styles.notifMetaRow}>
                            <span>
                              <Pill size={14} strokeWidth={1.9} />
                              {latestPrescription.medications.length} medication{latestPrescription.medications.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className={styles.notifActions}>
                            <a
                              className={styles.notifViewLink}
                              href={`${latestPrescriptionPdfUrl}&disposition=inline`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={markPrescriptionSeen}
                            >
                              <Eye size={13} strokeWidth={2} />
                              <span>View PDF</span>
                            </a>
                            <a
                              className={styles.notifPdfLink}
                              href={latestPrescriptionPdfUrl}
                              download
                              onClick={markPrescriptionSeen}
                            >
                              <Download size={13} strokeWidth={2} />
                              <span>Download</span>
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                )}

                {appointmentNotification && (
                  <article className={styles.notifItem}>
                    <div className={styles.notifMarker} aria-hidden="true">
                      <Calendar size={16} strokeWidth={1.9} />
                    </div>
                    <div className={styles.notifContent}>
                      <div className={styles.notifItemHeader}>
                        <div>
                          <p className={styles.notifStatus}>
                            {appointmentStatus === "approved"
                              ? "Appointment Confirmed"
                              : appointmentStatus === "rejected"
                                ? "Schedule Update"
                                : "Reschedule Suggested"}
                          </p>
                          <h4 className={styles.notifTitle}>
                            {appointmentStatus === "approved"
                              ? "Appointment Approved"
                              : appointmentStatus === "rejected"
                                ? "Appointment Request Declined"
                                : "Doctor Suggested New Time"}
                          </h4>
                        </div>
                      </div>
                      <time className={styles.notifTime} dateTime={appointmentNotification.scheduled_at}>
                        {formatDateTime(appointmentNotification.scheduled_at)}
                      </time>
                      {appointmentNotification.meta?.doctor_remarks && (
                        <p className={styles.notifMessage}>{appointmentNotification.meta.doctor_remarks}</p>
                      )}
                    </div>
                  </article>
                )}

                {!appointmentNotification && !showPrescriptionNotification && (
                  <div className={styles.notifEmpty}>
                    <Bell size={20} strokeWidth={1.8} />
                    <p>No new care notifications today.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clinical Report Action Button */}
        <button
          type="button"
          className={styles.reportBtn}
          onClick={() => setReportModalOpen(true)}
          title="Download My Clinical Health Report (PDF)"
        >
          <FileText size={15} />
          <span className={styles.reportBtnText}>My Report</span>
        </button>

        <PatientReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          patientName={patientName}
        />

        {/* Dedicated 1-Tap Sign Out Action (Instantly visible on both mobile & desktop) */}
        <button
          type="button"
          className={styles.directSignOutBtn}
          onClick={handleLogout}
          aria-label="Sign out of patient portal"
          title="Sign Out · साइन आउट"
        >
          <LogOut size={15} />
          <span className={styles.directSignOutText}>Sign Out</span>
        </button>

        {/* Patient Identity Profile Dropdown */}
        <div className={styles.profileWrap} ref={profileRef}>
          <button
            type="button"
            className={`${styles.patientPill} ${profileOpen ? styles.patientPillActive : ""}`}
            aria-label="View patient health profile"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
            }}
          >
            <div className={styles.patientAvatar}>{initials}</div>
            <div className={styles.patientPillText}>
              <span className={styles.patientName}>{nameParts[0]}</span>
              <span className={styles.patientStatusPill}>{profileMeta.diagnosis.split("/")[0]?.trim()}</span>
            </div>
            <ChevronDown size={14} className={styles.chevronIcon} />
          </button>

          {profileOpen && (
            <div className={styles.profileModal}>
              {/* Profile Card Header */}
              <div className={styles.profileHeader}>
                <div className={styles.profileAvatarLarge}>{initials}</div>
                <div className={styles.profileHeaderInfo}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <h4 className={styles.profileFullName}>{patientName}</h4>
                    <button
                      type="button"
                      className={styles.modalCloseBtn}
                      onClick={() => setProfileOpen(false)}
                      aria-label="Close profile modal"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className={styles.profileBadgeRow}>
                    {profileMeta.age && <span className={styles.profileTag}>{profileMeta.age} yrs</span>}
                    {profileMeta.gender && <span className={styles.profileTag}>{profileMeta.gender}</span>}
                  </div>
                  <span className={styles.profileTagAccent}>{profileMeta.diagnosis}</span>
                </div>
              </div>

              {/* Patient Contact Details */}
              <div className={styles.profileSection}>
                <p className={styles.profileSectionTitle}>Patient Contacts</p>
                <div className={styles.profileGrid2}>
                  <div className={styles.profileInfoBox}>
                    <p className={styles.profileLabel}>Registered Phone</p>
                    <p className={styles.profileValue}>{profileMeta.phone || "Not recorded"}</p>
                  </div>
                  {profileMeta.emergencyName && (
                    <div className={styles.profileInfoBox}>
                      <p className={styles.profileLabel}>Emergency Contact</p>
                      <p className={styles.profileValue}>{profileMeta.emergencyName}</p>
                      {profileMeta.emergencyPhone && (
                        <p className={styles.profileMuted}>{profileMeta.emergencyPhone}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Pulmonologist */}
              <div className={styles.profileSection}>
                <p className={styles.profileSectionTitle}>Assigned Pulmonologist</p>
                <div className={styles.profileDoctorCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className={styles.doctorAvatarSmall}>
                      <Stethoscope size={16} />
                    </div>
                    <div>
                      <p className={styles.profileDoctorName}>{profileMeta.doctorName}</p>
                      <p className={styles.profileDoctorSpecialty}>Pulmonology Specialist</p>
                      {profileMeta.doctorHospital && (
                        <p className={styles.profileDoctorHospital}>{profileMeta.doctorHospital}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Appointment & Last Prescription */}
              <div className={styles.profileGrid2}>
                <div className={styles.profileInfoBox}>
                  <div className={styles.profileLabelIcon}>
                    <Calendar size={12} />
                    <p className={styles.profileLabel}>Next Visit</p>
                  </div>
                  <p className={styles.profileValue}>{profileMeta.nextAppointment}</p>
                </div>
                <div className={styles.profileInfoBox}>
                  <p className={styles.profileLabel}>Last Prescription</p>
                  <p className={styles.profileValue}>
                    {latestPrescription ? formatDate(latestPrescription.created_at ?? latestPrescription.date) : "None"}
                  </p>
                </div>
              </div>

              {/* Clean Professional Sign Out Action */}
              <button
                type="button"
                className={styles.signOutAction}
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Sign Out · साइन आउट</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Modal Backdrop Overlay */}
      {(notificationsOpen || profileOpen) && (
        <div
          className={styles.dropdownBackdrop}
          onClick={() => {
            setNotificationsOpen(false);
            setProfileOpen(false);
          }}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
