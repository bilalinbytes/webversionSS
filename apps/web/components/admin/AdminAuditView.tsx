"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, ShieldAlert, ShieldCheck, FileSpreadsheet, Lock } from "lucide-react";
import styles from "./AdminPatientsView.module.css";

interface AuditLog {
  id: string;
  timestamp: string | null;
  actor: string;
  action: string;
  resource: string;
  status: string;
  details: string;
  type: "access" | "export";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminAuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "access" | "export">("all");

  useEffect(() => {
    fetch("/api/admin/audit", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { logs?: AuditLog[]; error?: string }) => {
        if (data.logs) {
          setLogs(data.logs);
        } else {
          setError(data.error ?? "Failed to load audit logs.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load audit logs.");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (typeFilter !== "all" && log.type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.resource.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    });
  }, [logs, search, typeFilter]);

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit Log &amp; Legal Compliance</h1>
          <p className={styles.sub}>
            Immutable legal trail of patient data access, exports, and platform actions
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(18,105,105,0.08)", color: "#126969", fontSize: 12, fontWeight: 700 }}>
            <Lock size={14} /> Total Events: {logs.length}
          </span>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* Filter toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by doctor ID, patient, action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "all", label: "All Logs" },
            { id: "access", label: "Patient Access" },
            { id: "export", label: "Data Exports" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id as any)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid rgba(19,45,54,0.12)",
                background: typeFilter === t.id ? "#126969" : "#fff",
                color: typeFilter === t.id ? "#fff" : "#132d36",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className={styles.loading}>Loading audit records…</p>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#6d8794" }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>No audit events found</p>
          <p style={{ fontSize: 12 }}>Events will appear here as doctors and admins interact with the system.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource / Target</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: 11, color: "#6d8794", whiteSpace: "nowrap" }}>
                    {formatDate(log.timestamp)}
                  </td>
                  <td style={{ fontWeight: 600, color: "#132d36" }}>
                    {log.actor}
                  </td>
                  <td>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: log.type === "export" ? "rgba(55,138,221,0.1)" : "rgba(29,158,117,0.1)",
                      color: log.type === "export" ? "#378add" : "#1d9e75",
                    }}>
                      {log.type === "export" ? <FileSpreadsheet size={12} /> : <ShieldCheck size={12} />}
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "#132d36" }}>
                    {log.resource}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0f6e56" }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: "#6d8794", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
