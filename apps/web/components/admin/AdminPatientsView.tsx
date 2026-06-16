"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Users } from "lucide-react";
import styles from "./AdminPatientsView.module.css";

interface Patient {
  id: string;
  name: string;
  mobile_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  enrolled_at: string | null;
  doctor_name: string | null;
  doctor_hospital: string | null;
  primary_diagnosis: string | null;
  effective_dashboard: string | null;
  risk_level: string | null;
  global_score: number | null;
}

const DISEASE_COLORS: Record<string, string> = {
  ild: "#1d9e75",
  copd: "#378add",
  asthma: "#639922",
  bronchiectasis: "#ef9f27",
  post_icu: "#a259e6",
};

const RISK_COLORS: Record<string, string> = {
  critical: "#c94d49",
  high: "#d85a30",
  moderate: "#cc9900",
  stable: "#2d7a38",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PatientRow({ patient }: { patient: Patient }) {
  const initials = patient.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const diagKey = (patient.effective_dashboard ?? patient.primary_diagnosis ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  const diagColor = DISEASE_COLORS[diagKey] ?? "#888";

  const riskKey = (patient.risk_level ?? "").toLowerCase();
  const riskColor = RISK_COLORS[riskKey] ?? "#6d8794";

  return (
    <tr className={styles.row}>
      <td className={styles.td}>
        <div className={styles.nameCell}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <p className={styles.patientName}>{patient.name}</p>
            <p className={styles.patientPhone}>{patient.mobile_number ?? "—"}</p>
          </div>
        </div>
      </td>
      <td className={styles.td}>
        <span
          className={styles.diagBadge}
          style={{ background: `${diagColor}18`, color: diagColor }}
        >
          {(patient.effective_dashboard ?? patient.primary_diagnosis ?? "—").toUpperCase()}
        </span>
      </td>
      <td className={styles.td}>
        <div>
          <p className={styles.cell}>{patient.doctor_name ?? "—"}</p>
          <p className={styles.cellSub}>{patient.doctor_hospital ?? ""}</p>
        </div>
      </td>
      <td className={styles.td}>
        <span
          className={styles.riskBadge}
          style={{
            background: `${riskColor}14`,
            color: riskColor,
          }}
        >
          {patient.risk_level ?? "—"}
        </span>
      </td>
      <td className={styles.td}>
        <p className={styles.dateCell}>{formatDate(patient.enrolled_at)}</p>
      </td>
    </tr>
  );
}

export function AdminPatientsView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/patients", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { patients?: Patient[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setPatients(data.patients ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load patients.");
        setLoading(false);
      });
  }, []);

  const diseaseOptions = useMemo(() => {
    const s = new Set<string>();
    patients.forEach((p) => {
      const d = p.effective_dashboard ?? p.primary_diagnosis;
      if (d) s.add(d.toLowerCase());
    });
    return Array.from(s).sort();
  }, [patients]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.mobile_number?.includes(q) ||
        p.doctor_name?.toLowerCase().includes(q) ||
        p.doctor_hospital?.toLowerCase().includes(q);

      const diagKey = (p.effective_dashboard ?? p.primary_diagnosis ?? "").toLowerCase();
      const matchDisease = diseaseFilter === "all" || diagKey === diseaseFilter;

      return matchSearch && matchDisease;
    });
  }, [patients, search, diseaseFilter]);

  return (
    <div className={styles.view}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>All Patients</h1>
          <p className={styles.sub}>
            {patients.length} patients registered across all doctors
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} strokeWidth={1.8} />
          <input
            type="search"
            placeholder="Search by name, phone, doctor…"
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.select}
          value={diseaseFilter}
          onChange={(e) => setDiseaseFilter(e.target.value)}
        >
          <option value="all">All diseases</option>
          {diseaseOptions.map((d) => (
            <option key={d} value={d}>
              {d.toUpperCase()}
            </option>
          ))}
        </select>

        <span className={styles.resultCount}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {error && <p className={styles.error}>{error}</p>}

        {loading ? (
          <div className={styles.loadingRows}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <Users size={32} strokeWidth={1.3} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No patients found</p>
            <p className={styles.emptySub}>Try adjusting your search or filter.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr className={styles.thead}>
                <th className={styles.th}>Patient</th>
                <th className={styles.th}>Diagnosis</th>
                <th className={styles.th}>Assigned Doctor</th>
                <th className={styles.th}>Risk Level</th>
                <th className={styles.th}>Date of Enrollment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <PatientRow key={p.id} patient={p} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
