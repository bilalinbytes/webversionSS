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
  const primary = (primaryDiagnosis ?? "").toLowerCase();

  // Bronchiolitis / Bronchiolitis Obliterans → asthma dashboard
  if (primary.includes("bronchiolitis")) return "asthma";

  // Asthma-COPD Overlap (ACO) → copd dashboard
  if (
    primary.includes("overlap") ||
    primary.includes("aco") ||
    (primary.includes("asthma") && primary.includes("copd"))
  ) {
    return "copd";
  }

  // stored effective_dashboard is ground truth for post_icu and other standard categories
  const stored = (storedDashboard ?? "").toLowerCase().trim();
  if (["asthma", "copd", "bronchiectasis", "ild", "post_icu"].includes(stored)) {
    return stored as EffectiveDashboardValue;
  }

  // fall back to parsing primary_diagnosis text
  if ((primary.startsWith("oad /") || primary.startsWith("oad/")) && primary.includes("asthma")) return "asthma";
  if (primary.includes("asthma") && !primary.includes("copd")) return "asthma";
  if (primary.includes("copd") || primary.startsWith("oad")) return "copd";
  if (primary.includes("bronchiectasis")) return "bronchiectasis";
  if (primary.includes("ild") || primary.includes("interstitial")) return "ild";
  if (primary.includes("post_icu") || primary.includes("post icu") || primary.includes("post-icu")) return "post_icu";
  return null;
}

/**
 * Flattens Zod validation errors into a simple record.
 */
export function formatZodErrors(error: z.ZodError) {
  return error.flatten().fieldErrors;
}

/**
 * Formats the raw primary diagnosis text for display in the UI.
 */
export function formatDiagnosisDisplay(primaryDiagnosis: string | null | undefined): string | null {
  if (!primaryDiagnosis) return null;
  const trimmed = primaryDiagnosis.trim();
  const lower = trimmed.toLowerCase();

  // OAD / Bronchiolitis (and variations) → "OAD / Bronchiolitis Obliterans"
  if (lower.includes("bronchiolitis")) {
    return "OAD / Bronchiolitis Obliterans";
  }

  // OAD / Asthma COPD overlap (and variations) → "OAD / Asthma COPD overlap"
  if (
    lower.includes("overlap") ||
    lower.includes("aco") ||
    (lower.includes("asthma") && lower.includes("copd"))
  ) {
    return "OAD / Asthma COPD overlap";
  }

  const parts = trimmed.split("/");
  if ((lower.startsWith("oad /") || lower.startsWith("oad/")) && parts.length > 1) {
    const sub = parts.slice(1).join("/").trim();
    if (sub.toLowerCase() === "copd") {
      return "COPD";
    }
    if (sub.toLowerCase() === "asthma") {
      return "Asthma";
    }
    return sub ? sub.charAt(0).toUpperCase() + sub.slice(1) : trimmed;
  }

  if (lower === "copd") return "COPD";
  if (lower === "asthma") return "Asthma";

  return trimmed;
}