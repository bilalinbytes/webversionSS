import type { Database } from "@/lib/database.types";

type PatientDiagnosisRow = Database["public"]["Tables"]["patient_diagnoses"]["Row"];
type RespSupportRow = Database["public"]["Tables"]["respiratory_support"]["Row"];

export function resolveCompleteDiagnosis(
  diagnosis: PatientDiagnosisRow | undefined,
): { completeDiag: string; histopathology: string; connective: string; comorbidities: string } {
  if (!diagnosis) {
    return {
      completeDiag: "—",
      histopathology: "—",
      connective: "NA",
      comorbidities: "None recorded",
    };
  }

  const diagExt = diagnosis as PatientDiagnosisRow & Record<string, unknown>;

  const primary = (diagnosis.primary_diagnosis ?? "").trim();
  const effDash = (diagnosis.effective_dashboard ?? "").trim();
  const oadSub = (diagExt["oad_diagnosis"] as string | undefined)?.trim() ?? "";
  const ildSub = (diagExt["ild_subtype"] as string | undefined)?.trim() ?? "";
  const isFibrotic = diagExt["is_fibrotic"] as boolean | null | undefined;
  const bronchSub = (diagExt["bronchiectasis_cause"] as string | undefined)?.trim() ?? "";
  const postSub = (diagExt["posticu_cause"] as string | undefined)?.trim() ?? "";
  const connective = (diagExt["connective_tissue_disease"] as string | undefined)?.trim() ?? "NA";

  let completeDiag = primary || effDash || "—";
  let histopath = "—";

  if (oadSub) {
    completeDiag = `OAD / ${oadSub}`;
    histopath = oadSub;
  } else if (ildSub) {
    const fibroticTag = isFibrotic === true ? " (Fibrotic)" : isFibrotic === false ? " (Non-Fibrotic)" : "";
    completeDiag = `ILD / ${ildSub}${fibroticTag}`;
    histopath = ildSub;
  } else if (bronchSub) {
    completeDiag = `Bronchiectasis / ${bronchSub}`;
    histopath = bronchSub;
  } else if (postSub) {
    completeDiag = `Post ICU / ${postSub}`;
    histopath = postSub;
  } else if (primary) {
    histopath = primary;
  }

  const completeLower = completeDiag.toLowerCase();
  if (completeLower.includes("bronchiolitis")) {
    completeDiag = "Bronchiolitis Obliterans";
  } else if (
    completeLower.includes("overlap") ||
    completeLower.includes("aco") ||
    (completeLower.includes("asthma") && completeLower.includes("copd"))
  ) {
    completeDiag = "OAD / Asthma COPD overlap";
  }

  // Format co-morbidities
  const rawComorbid = diagnosis.comorbidities;
  let comorbidities = "None recorded";
  if (Array.isArray(rawComorbid)) {
    const realConditions = rawComorbid.filter((c): c is string => typeof c === "string" && c.trim() !== "" && c.toLowerCase() !== "none");
    if (realConditions.length > 0) {
      comorbidities = realConditions.join(", ");
    } else if (rawComorbid.some((c) => typeof c === "string" && c.toLowerCase() === "none")) {
      comorbidities = "None";
    }
  } else if (typeof rawComorbid === "string" && rawComorbid.trim()) {
    comorbidities = rawComorbid.trim();
  }

  return {
    completeDiag,
    histopathology: histopath || "—",
    connective: connective || "NA",
    comorbidities,
  };
}

export function formatRespiratorySupport(support: RespSupportRow | undefined): string {
  if (!support || !support.requires_support) {
    return "None";
  }

  const parts: string[] = [];

  if (support.ltot_enabled) {
    const litres = support.ltot_litres ? ` ${support.ltot_litres} L/min` : "";
    parts.push(`LTOT${litres}`);
  }

  if (support.bipap_enabled) {
    const ipap = support.bipap_ipap ?? "";
    const epap = support.bipap_epap ?? "";
    const pressures = ipap || epap ? ` ${ipap}/${epap}` : "";
    parts.push(`BiPAP${pressures}`);
  }

  if (support.invasive_vent_enabled) {
    parts.push("Invasive Vent");
  }

  if (support.tracheostomy_enabled) {
    parts.push("Tracheostomy");
  }

  return parts.length > 0 ? parts.join(", ") : "None";
}
