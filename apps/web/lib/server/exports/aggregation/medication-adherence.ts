import type { Database, Json } from "@/lib/database.types";

type MedicationRow = Database["public"]["Tables"]["medications"]["Row"];
type DailyLogRow = Database["public"]["Tables"]["daily_logs"]["Row"];

function parseLogComplianceCounts(compliance: Json | null): { taken: number; total: number } {
  if (!compliance) return { taken: 0, total: 0 };
  if (typeof compliance === "boolean") return { taken: compliance ? 1 : 0, total: 1 };
  if (typeof compliance === "object" && !Array.isArray(compliance)) {
    const values = Object.values(compliance as Record<string, Json>);
    const bools = values.filter((v): v is boolean => typeof v === "boolean");
    return {
      taken: bools.filter(Boolean).length,
      total: bools.length,
    };
  }
  return { taken: 0, total: 0 };
}

export function calculateAdherencePercentage(logs: DailyLogRow[]): string {
  let taken = 0;
  let total = 0;

  for (const log of logs) {
    const counts = parseLogComplianceCounts(log.medication_compliance);
    taken += counts.taken;
    total += counts.total;
  }

  if (total === 0) return "—";
  const pct = Math.round((taken / total) * 100);
  return `${pct}%`;
}

export function formatActiveMedications(medications: MedicationRow[]): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeMeds = medications.filter((m) => {
    if (!m.end_date) return true;
    try {
      const end = new Date(m.end_date);
      return end >= today;
    } catch {
      return true;
    }
  });

  if (activeMeds.length === 0) return "None active";

  return activeMeds
    .map((m) => {
      const drug = m.drug_name.trim();
      const dose = m.dose !== null && m.dose !== undefined ? ` ${m.dose}${m.dose_unit ? m.dose_unit.trim() : ""}` : "";
      const freq = m.frequency ? ` ${m.frequency.trim()}` : "";
      return `${drug}${dose}${freq}`.trim();
    })
    .join(", ");
}
