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

  // OAD / Asthma (and variations)
  if (
    lower === "asthma" ||
    lower === "oad / asthma" ||
    lower === "oad/asthma" ||
    ((lower.startsWith("oad /") || lower.startsWith("oad/")) && lower.includes("asthma"))
  ) {
    return "OAD / Asthma";
  }

  // OAD / COPD (and variations)
  if (
    lower === "copd" ||
    lower === "oad / copd" ||
    lower === "oad/copd" ||
    ((lower.startsWith("oad /") || lower.startsWith("oad/")) && lower.includes("copd"))
  ) {
    return "OAD / COPD";
  }

  const parts = trimmed.split("/");
  if ((lower.startsWith("oad /") || lower.startsWith("oad/")) && parts.length > 1) {
    const sub = parts.slice(1).join("/").trim();
    return sub ? `OAD / ${sub.charAt(0).toUpperCase() + sub.slice(1)}` : "OAD";
  }

  if (lower === "copd") return "OAD / COPD";
  if (lower === "asthma") return "OAD / Asthma";
  if (lower === "ild") return "ILD";
  if (lower === "bronchiectasis") return "Bronchiectasis";
  if (lower === "post_icu" || lower === "post icu" || lower === "post-icu") return "Post ICU Recovery";
  if (lower === "oad") return "OAD";

  return trimmed;
}

export const ILD_SUBTYPES_STANDARD = [
  "Idiopathic pulmonary fibrosis",
  "Hypersensitivity pneumonitis",
  "Idiopathic NSIP",
  "CTD-ILD",
  "IPAF",
  "Sarcoidosis",
  "Occupational ILD",
  "COP",
  "RB-ILD",
  "DIP",
  "AIP",
  "Idiopathic pleuro-parenchysel fibroelastosis",
  "Idiopathic pleuro-parenchymal fibroelastosis",
  "LIP",
  "LCH",
  "LAM",
  "Eosinophilic pneumonia",
];

export const OAD_DIAGNOSES_STANDARD = [
  "COPD",
  "Asthma",
  "Asthma-COPD Overlap (ACO)",
  "Bronchiolitis Obliterans",
];

export const BRONCHIECTASIS_CAUSES_STANDARD = [
  "Post-infectious",
  "Cystic Fibrosis related",
  "ABPA related",
  "Primary Ciliary Dyskinesia",
  "Idiopathic",
];

export const POSTICU_CAUSES_STANDARD = [
  "ILD",
  "Obstructive Airway Disease",
  "Bronchiectasis",
];

export function findMatchingDiagnosisOption(options: string[], value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const directMatch = options.find((opt) => opt.toLowerCase() === lower);
  if (directMatch) return directMatch;
  return null;
}

export function buildStructuredDiagnosis(diagnosis: {
  disease_category?: string | null;
  primary_diagnosis?: string | null;
  ild_subtype?: string | null;
  ild_other_text?: string | null;
  is_fibrotic?: boolean | null;
  oad_diagnosis?: string | null;
  oad_other_text?: string | null;
  bronchiectasis_cause?: string | null;
  bronchiectasis_other_text?: string | null;
  posticu_cause?: string | null;
  posticu_other_text?: string | null;
} | undefined): string {
  if (!diagnosis) return "";

  const diseaseCategory = diagnosis.disease_category ?? "";
  const ildSubtype = diagnosis.ild_subtype ?? "";
  const ildOtherText = diagnosis.ild_other_text ?? "";
  const isFibrotic = diagnosis.is_fibrotic;
  const oadDiagnosis = diagnosis.oad_diagnosis ?? "";
  const oadOtherText = diagnosis.oad_other_text ?? "";
  const bronchiectasisCause = diagnosis.bronchiectasis_cause ?? "";
  const bronchiectasisOtherText = diagnosis.bronchiectasis_other_text ?? "";
  const posticuCause = diagnosis.posticu_cause ?? "";
  const posticuOtherText = diagnosis.posticu_other_text ?? "";
  const primaryDiagnosis = diagnosis.primary_diagnosis ?? "";

  if (diseaseCategory === "ILD") {
    if (ildSubtype) {
      const subtype = ildSubtype === "Others" ? (ildOtherText || "Others") : ildSubtype;
      const fibroticLabel = isFibrotic === true ? "Fibrotic" : isFibrotic === false ? "Non-Fibrotic" : "";
      return ["ILD", subtype, fibroticLabel].filter(Boolean).join(" / ");
    }
    return "ILD";
  }

  if (diseaseCategory === "OAD") {
    if (oadDiagnosis) {
      const specific = oadDiagnosis === "Other OAD" ? (oadOtherText || "Other OAD") : oadDiagnosis;
      return `OAD / ${specific}`;
    }
    return "OAD";
  }

  if (diseaseCategory === "Bronchiectasis") {
    if (bronchiectasisCause) {
      const cause = bronchiectasisCause === "Other" ? (bronchiectasisOtherText || "Other") : bronchiectasisCause;
      return `Bronchiectasis / ${cause}`;
    }
    return "Bronchiectasis";
  }

  if (diseaseCategory === "Post ICU Recovery") {
    if (posticuCause) {
      const cause = posticuCause === "Other cause" ? (posticuOtherText || "Other") : posticuCause;
      return `Post ICU Recovery / ${cause}`;
    }
    return "Post ICU Recovery";
  }

  return primaryDiagnosis;
}

export function parseDiagnosisLabel(primary: string | null | undefined): {
  disease_category: string;
  primary_diagnosis: string;
  ild_subtype: string;
  ild_other_text: string;
  is_fibrotic: boolean | null;
  oad_diagnosis: string;
  oad_other_text: string;
  bronchiectasis_cause: string;
  bronchiectasis_other_text: string;
  posticu_cause: string;
  posticu_other_text: string;
} {
  const label = (primary ?? "").trim();
  if (!label) {
    return {
      disease_category: "",
      primary_diagnosis: "",
      ild_subtype: "",
      ild_other_text: "",
      is_fibrotic: null,
      oad_diagnosis: "",
      oad_other_text: "",
      bronchiectasis_cause: "",
      bronchiectasis_other_text: "",
      posticu_cause: "",
      posticu_other_text: "",
    };
  }

  const parts = label.split("/").map((part) => part.trim()).filter(Boolean);
  const lower = label.toLowerCase();

  // 1. ILD
  if (lower.startsWith("ild")) {
    const fibroticPart = parts.find((part) => /fibrotic/i.test(part));
    const nonFibroticParts = parts.filter((part) => part.toLowerCase() !== "ild" && !/fibrotic/i.test(part));
    const rawSubtype = nonFibroticParts[0] ?? "";
    const matchedSubtype = findMatchingDiagnosisOption(ILD_SUBTYPES_STANDARD, rawSubtype);

    let ild_subtype = "";
    let ild_other_text = "";
    if (matchedSubtype) {
      ild_subtype = matchedSubtype;
    } else if (rawSubtype) {
      ild_subtype = "Others";
      ild_other_text = rawSubtype.toLowerCase() === "others" ? "" : rawSubtype;
    }

    return {
      disease_category: "ILD",
      primary_diagnosis: "ild",
      ild_subtype,
      ild_other_text,
      is_fibrotic: fibroticPart ? !/^non/i.test(fibroticPart) : null,
      oad_diagnosis: "",
      oad_other_text: "",
      bronchiectasis_cause: "",
      bronchiectasis_other_text: "",
      posticu_cause: "",
      posticu_other_text: "",
    };
  }

  // 2. Bronchiectasis
  if (lower.startsWith("bronchiectasis")) {
    const rawCauseParts = parts.filter((part) => part.toLowerCase() !== "bronchiectasis");
    const rawCause = rawCauseParts[0] ?? "";
    const matchedCause = findMatchingDiagnosisOption(BRONCHIECTASIS_CAUSES_STANDARD, rawCause);

    let bronchiectasis_cause = "";
    let bronchiectasis_other_text = "";
    if (matchedCause) {
      bronchiectasis_cause = matchedCause;
    } else if (rawCause) {
      bronchiectasis_cause = "Other";
      bronchiectasis_other_text = rawCause.toLowerCase() === "other" ? (rawCauseParts[1] ?? "") : rawCause;
    }

    return {
      disease_category: "Bronchiectasis",
      primary_diagnosis: "bronchiectasis",
      ild_subtype: "",
      ild_other_text: "",
      is_fibrotic: null,
      oad_diagnosis: "",
      oad_other_text: "",
      bronchiectasis_cause,
      bronchiectasis_other_text,
      posticu_cause: "",
      posticu_other_text: "",
    };
  }

  // 3. Post ICU Recovery
  if (lower.startsWith("post icu") || lower.startsWith("post_icu") || lower.startsWith("post-icu")) {
    const rawCauseParts = parts.filter((part) => !part.toLowerCase().startsWith("post icu") && !part.toLowerCase().startsWith("post_icu") && !part.toLowerCase().startsWith("post-icu"));
    const rawCause = rawCauseParts[0] ?? "";
    const matchedCause = findMatchingDiagnosisOption(POSTICU_CAUSES_STANDARD, rawCause);

    let posticu_cause = "";
    let posticu_other_text = "";
    if (matchedCause) {
      posticu_cause = matchedCause;
    } else if (rawCause) {
      posticu_cause = "Other cause";
      posticu_other_text = (rawCause.toLowerCase() === "other cause" || rawCause.toLowerCase() === "other") ? (rawCauseParts[1] ?? "") : rawCause;
    }

    return {
      disease_category: "Post ICU Recovery",
      primary_diagnosis: "post_icu",
      ild_subtype: "",
      ild_other_text: "",
      is_fibrotic: null,
      oad_diagnosis: "",
      oad_other_text: "",
      bronchiectasis_cause: "",
      bronchiectasis_other_text: "",
      posticu_cause,
      posticu_other_text,
    };
  }

  // 4. OAD & variations
  if (lower.startsWith("oad") || lower.includes("copd") || lower.includes("asthma") || lower.includes("bronchiolitis")) {
    const rawOadParts = parts.filter((part) => part.toLowerCase() !== "oad");
    const rawDiag = rawOadParts[0] ?? (
      lower.includes("bronchiolitis") ? "Bronchiolitis Obliterans" :
      (lower.includes("overlap") || lower.includes("aco") || (lower.includes("asthma") && lower.includes("copd"))) ? "Asthma-COPD Overlap (ACO)" :
      lower.includes("asthma") ? "Asthma" : "COPD"
    );

    const rawLower = rawDiag.toLowerCase();
    let matchedDiag = findMatchingDiagnosisOption(OAD_DIAGNOSES_STANDARD, rawDiag);
    if (!matchedDiag) {
      if (rawLower.includes("bronchiolitis")) matchedDiag = "Bronchiolitis Obliterans";
      else if (rawLower.includes("overlap") || rawLower.includes("aco") || (rawLower.includes("asthma") && rawLower.includes("copd"))) matchedDiag = "Asthma-COPD Overlap (ACO)";
      else if (rawLower === "asthma") matchedDiag = "Asthma";
      else if (rawLower === "copd") matchedDiag = "COPD";
    }

    let oad_diagnosis = "";
    let oad_other_text = "";
    if (matchedDiag) {
      oad_diagnosis = matchedDiag;
    } else if (rawDiag) {
      oad_diagnosis = "Other OAD";
      oad_other_text = rawDiag.toLowerCase() === "other oad" ? (rawOadParts[1] ?? "") : rawDiag;
    }

    const primDiag = (oad_diagnosis === "Asthma" || oad_diagnosis === "Bronchiolitis Obliterans") ? "asthma" : "copd";

    return {
      disease_category: "OAD",
      primary_diagnosis: primDiag,
      ild_subtype: "",
      ild_other_text: "",
      is_fibrotic: null,
      oad_diagnosis,
      oad_other_text,
      bronchiectasis_cause: "",
      bronchiectasis_other_text: "",
      posticu_cause: "",
      posticu_other_text: "",
    };
  }

  return {
    disease_category: "",
    primary_diagnosis: label,
    ild_subtype: "",
    ild_other_text: "",
    is_fibrotic: null,
    oad_diagnosis: "",
    oad_other_text: "",
    bronchiectasis_cause: "",
    bronchiectasis_other_text: "",
    posticu_cause: "",
    posticu_other_text: "",
  };
}