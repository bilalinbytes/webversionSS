"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  Trash2,
  Users,
} from "lucide-react";
import styles from "./AdminDoctorsView.module.css";

interface PatientUnderDoctor {
  id: string;
  name: string;
  mobile_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  created_at: string | null;
  primary_diagnosis: string | null;
  effective_dashboard: string | null;
}

interface Doctor {
  id: string;
  name: string;
  email: string | null;
  hospital: string;
  specialisation: string;
  created_at: string | null;
  patient_count: number;
  patients: PatientUnderDoctor[];
}

const DIAG_COLORS: Record<string, string> = {
  ild: "#1d9e75",
  copd: "#378add",
  asthma: "#639922",
  bronchiectasis: "#ef9f27",
  post_icu: "#a259e6",
};

function formatDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Confirm-delete dialog ─────────────────────────────────────────────────────
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  busy,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog}>
        <p className={styles.dialogMsg}>{message}</p>
        <p className={styles.dialogWarn}>⚠ This action cannot be undone.</p>
        <div className={styles.dialogBtns}>
          <button
            type="button"
            className={styles.dialogCancel}
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.dialogConfirm}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single doctor row (expandable) ───────────────────────────────────────────
function DoctorRow({
  doctor,
  onDeleteDoctor,
  onDeletePatient,
}: {
  doctor: Doctor;
  onDeleteDoctor: (id: string, name: string) => void;
  onDeletePatient: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const initials = doctor.name
    .split(" ").slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();

  return (
    <>
      {/* Doctor row */}
      <tr
        className={`${styles.row} ${expanded ? styles.rowExpanded : ""}`}
      >
        {/* Expand toggle + name */}
        <td className={styles.td}>
          <div className={styles.nameCell}>
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? "Collapse patients" : "Expand patients"}
              title={expanded ? "Hide patients" : "Show patients"}
            >
              {expanded
                ? <ChevronDown size={14} strokeWidth={2} />
                : <ChevronRight size={14} strokeWidth={2} />}
            </button>
            <div className={styles.avatar}>{initials}</div>
            <div>
              <p className={styles.doctorName}>{doctor.name}</p>
              <p className={styles.doctorEmail}>{doctor.email ?? "—"}</p>
            </div>
          </div>
        </td>
        <td className={styles.td}>
          <p className={styles.cell}>{doctor.hospital}</p>
        </td>
        <td className={styles.td}>
          <span className={styles.specBadge}>{doctor.specialisation}</span>
        </td>
        <td className={styles.td}>
          <button
            type="button"
            className={styles.patientCountBtn}
            onClick={() => setExpanded((e) => !e)}
            title="Click to toggle patients"
          >
            <Users size={12} strokeWidth={2} />
            {doctor.patient_count}
          </button>
        </td>
        <td className={styles.td}>
          <p className={styles.dateCell}>{formatDate(doctor.created_at)}</p>
        </td>
        <td className={styles.td}>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => onDeleteDoctor(doctor.id, doctor.name)}
            title="Remove doctor"
          >
            <Trash2 size={14} strokeWidth={1.8} />
            Remove
          </button>
        </td>
      </tr>

      {/* Expanded patients */}
      {expanded && (
        <tr className={styles.expandedRow}>
          <td colSpan={6} className={styles.expandedCell}>
            {doctor.patients.length === 0 ? (
              <p className={styles.noPatients}>No patients assigned to this doctor.</p>
            ) : (
              <table className={styles.innerTable}>
                <thead>
                  <tr>
                    <th className={styles.innerTh}>Patient</th>
                    <th className={styles.innerTh}>Diagnosis</th>
                    <th className={styles.innerTh}>Gender</th>
                    <th className={styles.innerTh}>Enrolled</th>
                    <th className={styles.innerTh}></th>
                  </tr>
                </thead>
                <tbody>
                  {doctor.patients.map((p) => {
                    const diagKey = (
                      p.effective_dashboard ?? p.primary_diagnosis ?? ""
                    ).toLowerCase().replace(/\s+/g, "_");
                    const diagColor = DIAG_COLORS[diagKey] ?? "#888";
                    const pInitials = p.name
                      .split(" ").slice(0, 2)
                      .map((w) => w[0]).join("").toUpperCase();

                    return (
                      <tr key={p.id} className={styles.innerRow}>
                        <td className={styles.innerTd}>
                          <div className={styles.pNameCell}>
                            <div className={styles.pAvatar}>{pInitials}</div>
                            <div>
                              <p className={styles.pName}>{p.name}</p>
                              <p className={styles.pPhone}>
                                {p.mobile_number ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={styles.innerTd}>
                          <span
                            className={styles.diagBadge}
                            style={{
                              background: `${diagColor}18`,
                              color: diagColor,
                            }}
                          >
                            {(
                              p.effective_dashboard ??
                              p.primary_diagnosis ??
                              "—"
                            ).toUpperCase()}
                          </span>
                        </td>
                        <td className={styles.innerTd}>
                          <p className={styles.pMeta}>{p.gender ?? "—"}</p>
                        </td>
                        <td className={styles.innerTd}>
                          <p className={styles.pMeta}>
                            {formatDate(p.created_at)}
                          </p>
                        </td>
                        <td className={styles.innerTd}>
                          <button
                            type="button"
                            className={styles.deletePatientBtn}
                            onClick={() => onDeletePatient(p.id, p.name)}
                            title="Remove patient"
                          >
                            <Trash2 size={12} strokeWidth={1.8} />
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export function AdminDoctorsView() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Delete dialog state
  const [confirm, setConfirm] = useState<{
    type: "doctor" | "patient";
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/doctors", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { doctors?: Doctor[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setDoctors(data.doctors ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load.");
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.hospital.toLowerCase().includes(q) ||
        d.specialisation.toLowerCase().includes(q),
    );
  }, [doctors, search]);

  const handleDeleteConfirmed = async () => {
    if (!confirm) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/admin/delete", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: confirm.type, id: confirm.id }),
      });
      const payload = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Delete failed.");

      // Remove from local state immediately
      if (confirm.type === "doctor") {
        setDoctors((prev) => prev.filter((d) => d.id !== confirm.id));
      } else {
        setDoctors((prev) =>
          prev.map((d) => ({
            ...d,
            patients: d.patients.filter((p) => p.id !== confirm.id),
            patient_count: d.patients.filter((p) => p.id !== confirm.id).length,
          })),
        );
      }
      setConfirm(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.view}>
      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          message={`Remove ${confirm.type} "${confirm.name}" from the platform?`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => { setConfirm(null); setDeleteError(null); }}
          busy={deleting}
        />
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>All Doctors</h1>
          <p className={styles.sub}>
            {doctors.length} registered doctor{doctors.length !== 1 ? "s" : ""} — click a row to see their patients
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} strokeWidth={1.8} />
          <input
            type="search"
            placeholder="Search by name, email, hospital…"
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.resultCount}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {deleteError && (
        <p className={styles.deleteErrorBanner}>{deleteError}</p>
      )}

      {/* Table */}
      <div className={styles.tableWrap}>
        {error && <p className={styles.error}>{error}</p>}

        {loading ? (
          <div className={styles.loadingRows}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <Stethoscope size={32} strokeWidth={1.3} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No doctors found</p>
            <p className={styles.emptySub}>Try adjusting your search query.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr className={styles.thead}>
                <th className={styles.th}>Doctor</th>
                <th className={styles.th}>Hospital</th>
                <th className={styles.th}>Specialisation</th>
                <th className={styles.th}>Patients</th>
                <th className={styles.th}>Enrolled</th>
                <th className={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <DoctorRow
                  key={d.id}
                  doctor={d}
                  onDeleteDoctor={(id, name) =>
                    setConfirm({ type: "doctor", id, name })
                  }
                  onDeletePatient={(id, name) =>
                    setConfirm({ type: "patient", id, name })
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
