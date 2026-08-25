import type { Database } from "@/lib/database.types";

type DailyLogRow = Database["public"]["Tables"]["daily_logs"]["Row"];

export function toTitleCase(str: string | null | undefined): string {
  if (!str) return "—";
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDateDDMMYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "—";
  }
}

export function computeAgeFromDob(dob: string | null | undefined): number | string {
  if (!dob) return "—";
  try {
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "—";
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 && age <= 130 ? age : "—";
  } catch {
    return "—";
  }
}

export function normalizeSex(gender: string | null | undefined): string {
  if (!gender) return "—";
  const g = gender.toLowerCase().trim();
  if (g.startsWith("m")) return "M";
  if (g.startsWith("f")) return "F";
  if (g.startsWith("o")) return "Other";
  return "—";
}

export function formatCleanMobile(mobile: string | null | undefined): string {
  if (!mobile) return "—";
  const digits = mobile.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits || "—";
}

export function safeValue(v: unknown): string {
  if (v === null || v === undefined || v === "" || v === "null" || v === "undefined") {
    return "—";
  }
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "—";
    return String(v);
  }
  if (typeof v === "boolean") {
    return v ? "Yes" : "No";
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : "—";
  }
  if (Array.isArray(v)) {
    const items = v.map(safeValue).filter((item) => item !== "—");
    return items.length > 0 ? items.join(", ") : "—";
  }
  return "—";
}

export interface PatientIntraDayStats {
  worstSpo2: number | string;
  worstMmrc: number | string;
  worstAqi: number | string;
  totalLogs: number;
  symptomatic: string;
}

export function aggregateClinicalLogs(logs: DailyLogRow[]): PatientIntraDayStats {
  if (!logs || logs.length === 0) {
    return {
      worstSpo2: "—",
      worstMmrc: "—",
      worstAqi: "—",
      totalLogs: 0,
      symptomatic: "No",
    };
  }

  const validSpo2List = logs
    .map((l) => l.spo2_rest)
    .filter((v): v is number => typeof v === "number" && v > 0 && !Number.isNaN(v));

  const validMmrcList = logs
    .map((l) => l.mmrc_today)
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

  const validAqiList = logs
    .map((l) => l.aqi_value)
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

  const worstSpo2 = validSpo2List.length > 0 ? Math.min(...validSpo2List) : "—";
  const worstMmrc = validMmrcList.length > 0 ? Math.max(...validMmrcList) : "—";
  const worstAqi = validAqiList.length > 0 ? Math.max(...validAqiList) : "—";

  return {
    worstSpo2,
    worstMmrc,
    worstAqi,
    totalLogs: logs.length,
    symptomatic: logs.length > 0 ? "Yes" : "No",
  };
}
