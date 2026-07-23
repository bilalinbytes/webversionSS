import type { EffectiveDashboardValue, DiagnosisValue, PostIcuSubDiagnosisValue } from "@o2plus/types";
import type { z } from "zod";

/**
 * Derives the effective dashboard for post_icu patients based on their sub-diagnosis.
 * Used during patient enrolment and updates.
 */
export function deriveEffectiveDashboard(
  primaryDiagnosis: DiagnosisValue,
  postIcuSubDiagnosis?: PostIcuSubDiagnosisValue | null,
): EffectiveDashboardValue {
  if (primaryDiagnosis !== "post_icu") {
    return primaryDiagnosis;
  }

  if (!postIcuSubDiagnosis) {
    throw new Error(
      "post_icu patients require post_icu_sub_diagnosis to derive effective_dashboard.",
    );
  }

  return postIcuSubDiagnosis === "post_infection"
    ? "bronchiectasis"
    : postIcuSubDiagnosis;
}

/**
 * Normalizes a dashboard string from either the patient's effective_dashboard
 * column or by parsing their primary diagnosis text as a fallback.
 * Used by the patient home screen and doctor patient detail view.
 */
export function normalizeDashboard(
  primaryDiagnosis: string | null | undefined,
  storedDashboard: string | null | undefined,
): EffectiveDashboardValue | null {
  // stored effective_dashboard is ground truth
  const stored = (storedDashboard ?? "").toLowerCase().trim();
  if (["asthma", "copd", "bronchiectasis", "ild", "post_icu"].includes(stored)) {
    return stored as EffectiveDashboardValue;
  }

  // fall back to parsing primary_diagnosis text
  const primary = (primaryDiagnosis ?? "").toLowerCase();
  if (primary.includes("bronchiolitis")) return "asthma";  // Bronchiolitis Obliterans → asthma
  if (primary.includes("overlap") || primary.includes("aco") ||
      (primary.includes("asthma") && primary.includes("copd"))) return "copd"; // ACO → copd
  if (primary.includes("asthma") && !primary.includes("copd")) return "asthma";
  if (primary.includes("copd") || primary.startsWith("oad")) return "copd";
  if (primary.includes("bronchiectasis")) return "bronchiectasis";
  if (primary.includes("ild") || primary.includes("interstitial")) return "ild";
  if (primary.includes("post_icu") || primary.includes("post icu")) return "post_icu";
  return null;
}

/**
 * Flattens Zod validation errors into a simple record.
 */
export function formatZodErrors(error: z.ZodError) {
  return error.flatten().fieldErrors;
}
