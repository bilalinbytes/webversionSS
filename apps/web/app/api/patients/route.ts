import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import type { Json } from "@/lib/database.types";
import { parseDiagnosisLabel, buildStructuredDiagnosis } from "@o2plus/core";

// ── Effective dashboard logic ─────────────────────────────────────────────────
function computeEffectiveDashboard(
  primaryDiagnosis: string,
  postIcuSubDiagnosis?: string
): string {
  const lower = primaryDiagnosis.toLowerCase();
  if (lower === "post_icu" || lower.startsWith("post icu") || lower.startsWith("post-icu")) {
    if (postIcuSubDiagnosis) {
      const sub = postIcuSubDiagnosis.toLowerCase();
      if (sub.includes("ild")) return "ild";
      if (sub.includes("asthma")) return "asthma";
      if (sub.includes("copd") || sub.includes("obstructive")) return "copd";
      if (sub.includes("bronchiectasis")) return "bronchiectasis";
    }
    return "post_icu";
  }
  if (lower === "ild" || lower.startsWith("ild /") || lower.startsWith("ild/")) return "ild";

  // OAD sub-type mapping (strict order matters)
  // Bronchiolitis Obliterans → asthma dashboard
  if (lower.includes("bronchiolitis")) return "asthma";
  // Bronchitis → asthma dashboard
  if (lower.includes("bronchitis")) return "asthma";
  // Asthma-COPD Overlap (ACO) → copd dashboard
  if (lower.includes("overlap") || lower.includes("aco") || (lower.includes("asthma") && lower.includes("copd"))) return "copd";
  // OAD / Asthma → asthma
  if ((lower.startsWith("oad /") || lower.startsWith("oad/")) && lower.includes("asthma")) return "asthma";
  // Pure asthma (including standalone "asthma")
  if (lower === "asthma" || (lower.includes("asthma") && !lower.includes("copd"))) return "asthma";
  // COPD and other OAD sub-types (COPD, generic OAD, etc.)
  if (lower === "copd" || lower.startsWith("oad /") || lower.startsWith("oad/") || lower.includes("copd")) return "copd";

  if (lower === "bronchiectasis" || lower.startsWith("bronchiectasis /")) return "bronchiectasis";
  // Legacy mapping
  if (lower === "Post-ICU Discharge".toLowerCase()) return "post_icu";
  return lower.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function ageFromDob(dob: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age > 0 ? String(age) : "";
}

function nationalPhone(phone: string | null): string {
  return (phone ?? "").replace(/\D/g, "").slice(-10);
}

async function canAccessPatient(admin: ReturnType<typeof createAdminClient>, doctorId: string, patientId: string) {
  const { data: patient } = await admin
    .from("patients")
    .select("id, doctor_id")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) return false;
  if (patient.doctor_id === doctorId) return true;
  const { data: grant } = await admin
    .from("audit_logs")
    .select("id")
    .eq("action", "patient_access_granted")
    .eq("actor_id", doctorId)
    .eq("target_patient_id", patientId)
    .limit(1)
    .maybeSingle();
  return Boolean(grant);
}

const PATIENT_INSTRUCTION_WORD_LIMIT = 50;

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function patientInstructionsFromMedications(medications?: Array<Record<string, unknown>>) {
  return (medications ?? [])
    .map((medication) => typeof medication.patient_instruction === "string" ? medication.patient_instruction.trim() : "")
    .filter(Boolean);
}

function extractAddressAndMetadata(rawAddress: string | null | undefined): {
  cleanAddress: string | null;
  occupation: string | null;
  significantExposure: string | null;
  smokingStatus: string | null;
  smokingIndex: string | null;
  alcoholStatus: string | null;
  pastHistory: string | null;
  pastHistoryYearsAgo: string | null;
} {
  const addr = rawAddress ?? "";
  let cleanAddress: string | null = addr || null;
  let occupation: string | null = null;
  let significantExposure: string | null = null;
  let smokingStatus: string | null = null;
  let smokingIndex: string | null = null;
  let alcoholStatus: string | null = null;
  let pastHistory: string | null = null;
  let pastHistoryYearsAgo: string | null = null;

  if (addr) {
    const occMatch = addr.match(/Occupation:\s*([^|\]]+)/i);
    if (occMatch?.[1]) occupation = occMatch[1].trim();

    const expMatch = addr.match(/(?:Exposure|Illness Exposure):\s*([^|\]]+)/i);
    if (expMatch?.[1]) significantExposure = expMatch[1].trim();

    const smokeMatch = addr.match(/Smoking:\s*([^|\]]+)/i);
    if (smokeMatch?.[1]) smokingStatus = smokeMatch[1].trim();

    const smokeIdxMatch = addr.match(/SmokingIndex:\s*([^|\]]+)/i);
    if (smokeIdxMatch?.[1]) smokingIndex = smokeIdxMatch[1].trim();

    const alcMatch = addr.match(/Alcohol:\s*([^|\]]+)/i);
    if (alcMatch?.[1]) alcoholStatus = alcMatch[1].trim();

    const histMatch = addr.match(/PastHistory:\s*([^|\]]+)/i);
    if (histMatch?.[1]) pastHistory = histMatch[1].trim();

    const histYrsMatch = addr.match(/PastHistoryYears:\s*([^|\]]+)/i);
    if (histYrsMatch?.[1]) pastHistoryYearsAgo = histYrsMatch[1].trim();

    const withoutBrackets = addr.replace(/\s*\[.*?\]\s*$/, "").trim();
    cleanAddress = withoutBrackets || null;
  }

  return {
    cleanAddress,
    occupation,
    significantExposure,
    smokingStatus,
    smokingIndex,
    alcoholStatus,
    pastHistory,
    pastHistoryYearsAgo,
  };
}

function buildAddressWithMetadata(
  baseAddress: string | null | undefined,
  meta: {
    occupation?: string | null;
    significantExposure?: string | null;
    smokingStatus?: string | null;
    smokingIndex?: string | null;
    alcoholStatus?: string | null;
    pastHistory?: string | null;
    pastHistoryYearsAgo?: string | null;
  }
): string | null {
  const cleanAddr = (baseAddress ?? "").replace(/\s*\[.*?\]\s*$/, "").trim();
  const parts: string[] = [];
  if (meta.occupation) parts.push(`Occupation: ${meta.occupation}`);
  if (meta.significantExposure) parts.push(`Exposure: ${meta.significantExposure}`);
  if (meta.smokingStatus) parts.push(`Smoking: ${meta.smokingStatus}`);
  if (meta.smokingIndex) parts.push(`SmokingIndex: ${meta.smokingIndex}`);
  if (meta.alcoholStatus) parts.push(`Alcohol: ${meta.alcoholStatus}`);
  if (meta.pastHistory) parts.push(`PastHistory: ${meta.pastHistory}`);
  if (meta.pastHistoryYearsAgo) parts.push(`PastHistoryYears: ${meta.pastHistoryYearsAgo}`);

  const tag = parts.length > 0 ? `[${parts.join(" | ")}]` : "";
  if (cleanAddr && tag) return `${cleanAddr} ${tag}`;
  if (cleanAddr) return cleanAddr;
  if (tag) return tag;
  return null;
}

async function safeInsertPatient(
  client: any,
  fullPayload: Record<string, unknown>,
  fallbackPayload: Record<string, unknown>
) {
  const res = await client.from("patients").insert(fullPayload).select("id").single();
  if (
    res.error &&
    (res.error.message?.includes("column") ||
      res.error.message?.includes("schema cache") ||
      res.error.code === "PGRST204")
  ) {
    console.warn(
      "Retrying patients insert with baseline columns due to schema cache mismatch:",
      res.error.message
    );
    return await client.from("patients").insert(fallbackPayload).select("id").single();
  }
  return res;
}

async function safeUpdatePatient(
  client: any,
  patientId: string,
  fullPayload: Record<string, unknown>,
  fallbackPayload: Record<string, unknown>
) {
  const res = await client.from("patients").update(fullPayload).eq("id", patientId);
  if (
    res.error &&
    (res.error.message?.includes("column") ||
      res.error.message?.includes("schema cache") ||
      res.error.code === "PGRST204")
  ) {
    console.warn(
      "Retrying patients update with baseline columns due to schema cache mismatch:",
      res.error.message
    );
    return await client.from("patients").update(fallbackPayload).eq("id", patientId);
  }
  return res;
}

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("id");
  if (!patientId) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!(await canAccessPatient(admin, user.id, patientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [patientRes, diagnosisRes, supportRes, pftRes, medsRes, baselineRes] = await Promise.all([
    admin
      .from("patients")
      .select("id,name,date_of_birth,mobile_number,alternate_mobile_number,gender,emergency_contact_name,emergency_contact_phone,address")
      .eq("id", patientId)
      .single(),
    admin
      .from("patient_diagnoses")
      .select("primary_diagnosis,post_icu_sub_diagnosis,comorbidities,comorbidities_other_text,diagnosed_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("respiratory_support")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("pft_records")
      .select("id,test_date,fvc,fev1,fev1_fvc_ratio,dlco,other_fields")
      .eq("patient_id", patientId)
      .order("test_date", { ascending: true }),
    admin
      .from("medications")
      .select("id,route,drug_name,dose,dose_unit,frequency,start_date,end_date,serial_number")
      .eq("patient_id", patientId)
      .order("start_date", { ascending: true }),
    admin
      .from("patient_baselines")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle(),
  ]);

  if (patientRes.error || !patientRes.data) {
    return NextResponse.json({ error: patientRes.error?.message ?? "Patient not found" }, { status: 404 });
  }

  const parsedDiagnosis = parseDiagnosisLabel(diagnosisRes.data?.primary_diagnosis ?? null);
  const support = supportRes.data;

  // Resolve baseline vitals from patient_baselines table or previous PFT other_fields
  let resolvedBaselineSpo2 = "";
  let resolvedBaselineHeartRate = "";

  if (baselineRes.data?.baseline_spo2) {
    resolvedBaselineSpo2 = String(baselineRes.data.baseline_spo2);
  }

  if (pftRes.data && pftRes.data.length > 0) {
    for (const rec of pftRes.data) {
      const other = (rec.other_fields as Record<string, string | null>) ?? {};
      if (!resolvedBaselineSpo2 && other.baseline_spo2) {
        resolvedBaselineSpo2 = String(other.baseline_spo2);
      }
      if (!resolvedBaselineHeartRate && other.baseline_heart_rate) {
        resolvedBaselineHeartRate = String(other.baseline_heart_rate);
      }
    }
  }

  // Fallback to clinical default baselines for existing patients so faint reference values always display
  if (!resolvedBaselineSpo2) {
    resolvedBaselineSpo2 = "96";
  }
  if (!resolvedBaselineHeartRate) {
    resolvedBaselineHeartRate = "78";
  }

  const rawPatient = patientRes.data as Record<string, any>;
  const addrMeta = extractAddressAndMetadata(rawPatient.address);

  // Multi-source resolution for habits, past history, occupation, exposure:
  let resolvedOccupation = rawPatient.occupation ?? "";
  let resolvedOtherOccupation = "";
  let resolvedSignificantExposure = rawPatient.significant_exposure ?? "";
  let resolvedSmoking = rawPatient.smoking_status ?? "";
  let resolvedSmokingIndex = rawPatient.smoking_index ?? "";
  let resolvedAlcohol = rawPatient.alcohol_status ?? "";
  let resolvedPastHistory = rawPatient.past_history ?? "";
  let resolvedPastHistoryYears = rawPatient.past_history_years_ago ?? "";

  // 1. Check pft_records.other_fields
  if (pftRes.data && pftRes.data.length > 0) {
    for (const rec of pftRes.data) {
      const other = (rec.other_fields as Record<string, string | null>) ?? {};
      if (!resolvedOccupation && other.occupation) resolvedOccupation = String(other.occupation);
      if (!resolvedOtherOccupation && other.other_occupation) resolvedOtherOccupation = String(other.other_occupation);
      if (!resolvedSignificantExposure && other.significant_exposure) resolvedSignificantExposure = String(other.significant_exposure);
      if (!resolvedSmoking && (other.smoking_status || other.smoking)) resolvedSmoking = String(other.smoking_status || other.smoking);
      if (!resolvedSmokingIndex && other.smoking_index) resolvedSmokingIndex = String(other.smoking_index);
      if (!resolvedAlcohol && (other.alcohol_status || other.alcohol)) resolvedAlcohol = String(other.alcohol_status || other.alcohol);
      if (!resolvedPastHistory && other.past_history) resolvedPastHistory = String(other.past_history);
      if (!resolvedPastHistoryYears && other.past_history_years_ago) resolvedPastHistoryYears = String(other.past_history_years_ago);
    }
  }

  // 2. Check address metadata
  if (!resolvedOccupation && addrMeta.occupation) resolvedOccupation = addrMeta.occupation;
  if (!resolvedSignificantExposure && addrMeta.significantExposure) resolvedSignificantExposure = addrMeta.significantExposure;
  if (!resolvedSmoking && addrMeta.smokingStatus) resolvedSmoking = addrMeta.smokingStatus;
  if (!resolvedSmokingIndex && addrMeta.smokingIndex) resolvedSmokingIndex = addrMeta.smokingIndex;
  if (!resolvedAlcohol && addrMeta.alcoholStatus) resolvedAlcohol = addrMeta.alcoholStatus;
  if (!resolvedPastHistory && addrMeta.pastHistory) resolvedPastHistory = addrMeta.pastHistory;
  if (!resolvedPastHistoryYears && addrMeta.pastHistoryYearsAgo) resolvedPastHistoryYears = addrMeta.pastHistoryYearsAgo;

  const formData = {
    name: rawPatient.name ?? "",
    age: ageFromDob(rawPatient.date_of_birth),
    gender: rawPatient.gender ?? "",
    mobile_number: nationalPhone(rawPatient.mobile_number),
    alternate_mobile: nationalPhone(rawPatient.alternate_mobile_number),
    emergency_contact_name: rawPatient.emergency_contact_name ?? "",
    emergency_contact_phone: rawPatient.emergency_contact_phone ?? "",
    occupation: resolvedOccupation,
    other_occupation: resolvedOtherOccupation,
    significant_exposure: resolvedSignificantExposure,
    smoking: resolvedSmoking,
    smoking_status: resolvedSmoking,
    smoking_index: resolvedSmokingIndex,
    alcohol: resolvedAlcohol,
    alcohol_status: resolvedAlcohol,
    past_history_selected: Boolean(resolvedPastHistory),
    past_history: resolvedPastHistory,
    past_history_text: resolvedPastHistory,
    past_history_years_ago: resolvedPastHistoryYears,
    ...parsedDiagnosis,
    post_icu_sub_diagnosis: diagnosisRes.data?.post_icu_sub_diagnosis ?? null,
    comorbidities: Array.isArray(diagnosisRes.data?.comorbidities) ? diagnosisRes.data.comorbidities : [],
    comorbidities_other_text: diagnosisRes.data?.comorbidities_other_text ?? null,
    diagnosed_at: diagnosisRes.data?.diagnosed_at ?? null,
    respiratory_support: {
      requires_support: Boolean(support?.requires_support),
      ltot_enabled: Boolean(support?.ltot_enabled),
      ltot_litres: support?.ltot_litres ?? null,
      bipap_enabled: Boolean(support?.bipap_enabled),
      bipap_overnight: Boolean(support?.bipap_overnight),
      bipap_all_time: Boolean(support?.bipap_all_time),
      bipap_requires_oxygen: Boolean(support?.bipap_requires_oxygen),
      bipap_oxygen_litres: support?.bipap_oxygen_litres ?? null,
      bipap_ipap: support?.bipap_ipap ?? null,
      bipap_epap: support?.bipap_epap ?? null,
      bipap_pressure_support: support?.bipap_pressure_support ?? null,
      bipap_respiratory_rate: support?.bipap_respiratory_rate ?? null,
      invasive_vent_enabled: Boolean(support?.invasive_vent_enabled),
      vent_ipap: support?.vent_ipap ?? null,
      vent_epap: support?.vent_epap ?? null,
      vent_pressure_support: support?.vent_pressure_support ?? null,
      vent_respiratory_rate: support?.vent_respiratory_rate ?? null,
      vent_fio2_percent: support?.vent_fio2_percent ?? null,
      tracheostomy_enabled: Boolean(support?.tracheostomy_enabled),
      trach_for_airway_patency: Boolean(support?.trach_for_airway_patency),
      trach_requires_oxygen: Boolean(support?.trach_requires_oxygen),
      trach_oxygen_litres: support?.trach_oxygen_litres ?? null,
      trach_requires_vent: Boolean(support?.trach_requires_vent),
      trach_vent_ipap: support?.trach_vent_ipap ?? null,
      trach_vent_epap: support?.trach_vent_epap ?? null,
      trach_vent_pressure_support: support?.trach_vent_pressure_support ?? null,
      trach_vent_respiratory_rate: support?.trach_vent_respiratory_rate ?? null,
      trach_vent_tidal_volume: support?.trach_vent_tidal_volume ?? null,
      trach_vent_fio2_percent: support?.trach_vent_fio2_percent ?? null,
    },
    baseline_spo2: resolvedBaselineSpo2,
    baseline_heart_rate: resolvedBaselineHeartRate,
    pft_records: (pftRes.data ?? []).map((row) => {
      const other = (row.other_fields ?? {}) as Record<string, string | null>;
      return {
        _clientId: Date.now() + Math.floor(Math.random() * 100000),
        test_date: row.test_date,
        fvc: row.fvc,
        fev1: row.fev1,
        fev1_fvc_ratio: row.fev1_fvc_ratio,
        dlco: row.dlco,
        fev1_pct_pred: other.fev1_pct_pred ?? null,
        fvc_pct_pred: other.fvc_pct_pred ?? null,
        six_mwd: other.six_mwd ?? null,
        min_spo2: other.min_spo2 ?? null,
        max_spo2: other.max_spo2 ?? null,
        baseline_spo2: other.baseline_spo2 ?? null,
        baseline_heart_rate: other.baseline_heart_rate ?? null,
      };
    }),
    medications: (medsRes.data ?? []).map((row) => ({
      _clientId: Date.now() + (row.serial_number ?? 0) + Math.floor(Math.random() * 100000),
      route: row.route,
      drug_name: row.drug_name,
      dose: row.dose,
      dose_unit: row.dose_unit,
      frequency: row.frequency ?? "OD",
      start_date: row.start_date,
      end_date: row.end_date,
      prescription_date: row.start_date,
    })),
  };

  return NextResponse.json({ formData });
}

// ── POST /api/patients ────────────────────────────────────────────────────────
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const basicInfo = body.basicInfo as Record<string, string> | undefined;
  const diagnosis = body.diagnosis as Record<string, unknown> | undefined;
  const respSupport = body.respSupport as Record<string, unknown> | undefined;
  const pftRows = body.pftRows as Array<Record<string, string>> | undefined;
  const medications = body.medications as Array<Record<string, unknown>> | undefined;
  const patientInstructions = patientInstructionsFromMedications(medications);

  // Basic validation
  if (!basicInfo?.name || !basicInfo.mobile_number) {
    return NextResponse.json(
      { error: "name and mobile_number are required" },
      { status: 400 }
    );
  }

  if (patientInstructions.some((instruction) => wordCount(instruction) > PATIENT_INSTRUCTION_WORD_LIMIT)) {
    return NextResponse.json(
      { error: "Patient instructions must be 50 words or fewer" },
      { status: 400 }
    );
  }

  // Compute date_of_birth from age if provided, otherwise use a placeholder
  const age = basicInfo.age ? parseInt(basicInfo.age as string) : null;
  const currentYear = new Date().getFullYear();
  const dobYear = age && age > 0 && age < 130 ? currentYear - age : currentYear - 40;
  const dobFromAge = basicInfo.date_of_birth || `${dobYear}-06-15`;

  // Normalize mobile number — strip non-digits, ensure it's stored consistently
  const rawMobile = basicInfo.mobile_number.replace(/\D/g, "");
  const normalizedMobile = rawMobile.startsWith("91") && rawMobile.length === 12
    ? `+${rawMobile}`
    : rawMobile.startsWith("+91")
      ? rawMobile
      : `+91${rawMobile}`;

  const rawAlternateMobile = basicInfo.alternate_mobile?.replace(/\D/g, "") ?? "";
  const normalizedAlternateMobile = rawAlternateMobile
    ? rawAlternateMobile.startsWith("91") && rawAlternateMobile.length === 12
      ? `+${rawAlternateMobile}`
      : `+91${rawAlternateMobile}`
    : null;

  if (normalizedAlternateMobile) {
    const alternateNational = normalizedAlternateMobile.replace(/^\+91/, "");
    if (!/^[6-9]\d{9}$/.test(alternateNational)) {
      return NextResponse.json(
        { error: "Alternate mobile number must be a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    if (normalizedAlternateMobile === normalizedMobile) {
      return NextResponse.json(
        { error: "Alternate mobile number cannot be the same as the primary mobile number." },
        { status: 400 }
      );
    }
  }

  // Build address and metadata string
  const occupation = (basicInfo.occupation as string) || null;
  const otherOccupation = (basicInfo.other_occupation as string) || null;
  const significantExposure = (basicInfo.significant_exposure as string) || null;
  const effectiveOccupation = occupation === "Other" && otherOccupation ? otherOccupation : occupation;

  // Habits and past medical history
  const smokingStatus = (basicInfo.smoking_status || basicInfo.smoking as string) || null;
  const smokingIndex = smokingStatus === "Yes" ? ((basicInfo.smoking_index as string) || null) : null;
  const alcoholStatus = (basicInfo.alcohol_status || basicInfo.alcohol as string) || null;
  const pastHistory = (basicInfo.past_history || basicInfo.past_history_text as string) || null;
  const pastHistoryYearsAgo = pastHistory ? ((basicInfo.past_history_years_ago as string) || null) : null;

  const rawBaseAddress = [
    basicInfo.street_address,
    basicInfo.city,
    basicInfo.state,
    basicInfo.pincode,
  ].filter(Boolean).join(", ") || null;

  const address = buildAddressWithMetadata(rawBaseAddress, {
    occupation: effectiveOccupation,
    significantExposure,
    smokingStatus,
    smokingIndex,
    alcoholStatus,
    pastHistory,
    pastHistoryYearsAgo,
  });

  const fullPatientPayload = {
    name: basicInfo.name,
    date_of_birth: dobFromAge,
    mobile_number: normalizedMobile,
    alternate_mobile_number: normalizedAlternateMobile,
    gender: basicInfo.gender || null,
    address,
    occupation: effectiveOccupation || null,
    significant_exposure: significantExposure || null,
    smoking_status: smokingStatus,
    smoking_index: smokingIndex,
    alcohol_status: alcoholStatus,
    past_history: pastHistory,
    past_history_years_ago: pastHistoryYearsAgo,
    doctor_id: user.id,
    emergency_contact_name: basicInfo.emergency_contact_name || null,
    emergency_contact_phone: basicInfo.emergency_contact_phone || null,
  };

  const fallbackPatientPayload = {
    name: basicInfo.name,
    date_of_birth: dobFromAge,
    mobile_number: normalizedMobile,
    alternate_mobile_number: normalizedAlternateMobile,
    gender: basicInfo.gender || null,
    address,
    doctor_id: user.id,
    emergency_contact_name: basicInfo.emergency_contact_name || null,
    emergency_contact_phone: basicInfo.emergency_contact_phone || null,
  };

  // 1. Insert patient with safe fallback
  const { data: patient, error: patientError } = await safeInsertPatient(
    supabase,
    fullPatientPayload,
    fallbackPatientPayload
  );

  if (patientError || !patient) {
    console.error("patients insert error:", JSON.stringify(patientError));
    // Surface the actual DB error message to help diagnose
    const errMsg = patientError?.message ?? "Failed to create patient";
    if (patientError?.code === "23505") {
      return NextResponse.json({ error: "Mobile number already registered." }, { status: 409 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  const patientId = patient.id;

  // 2. Insert patient_diagnoses
  if (diagnosis) {
    const primaryDiagnosis = (diagnosis.primary_diagnosis as string) ?? "";
    const postIcuSub = (diagnosis.post_icu_sub_diagnosis as string) ?? "";
    const comorbidities = (diagnosis.comorbidities as string[]) ?? [];

    // Build a structured diagnosis label from the new disease category fields
    const structuredDiagnosis = buildStructuredDiagnosis(diagnosis as any);
    const finalPrimaryDiagnosis = structuredDiagnosis || primaryDiagnosis;
    const effectiveDashboard = computeEffectiveDashboard(finalPrimaryDiagnosis, postIcuSub || undefined);

    const { error: diagError } = await supabase
      .from("patient_diagnoses")
      .insert({
        patient_id: patientId,
        primary_diagnosis: finalPrimaryDiagnosis,
        effective_dashboard: effectiveDashboard,
        comorbidities: comorbidities as unknown as import("@/lib/database.types").Json,
        comorbidities_other_text: (diagnosis.comorbidities_other_text as string) || null,
        diagnosed_at: (diagnosis.diagnosed_at as string) || null,
        post_icu_sub_diagnosis: postIcuSub || null,
      });

    if (diagError) {
      console.error("patient_diagnoses insert error:", diagError);
      return NextResponse.json({ error: "Failed to save diagnosis" }, { status: 500 });
    }
  }

  // 3. Insert respiratory_support (if applicable)
  if (respSupport?.hasRespSupport || respSupport?.requires_support) {
    const rs = respSupport;
    const { error: rsError } = await supabase
      .from("respiratory_support")
      .insert({
        patient_id: patientId,
        requires_support: true,
        ltot_enabled: Boolean(rs.ltot_enabled || rs.ltot_litres),
        ltot_litres: rs.ltot_litres ? parseFloat(rs.ltot_litres as string) : null,
        bipap_enabled: Boolean(rs.bipap_enabled || rs.bipap_ipap),
        bipap_overnight: Boolean(rs.bipap_overnight || rs.bipap_usage === "Overnight only"),
        bipap_all_time: Boolean(rs.bipap_all_time || rs.bipap_usage === "All-time"),
        bipap_requires_oxygen: Boolean(rs.bipap_requires_oxygen),
        bipap_oxygen_litres: rs.bipap_oxygen_litres ? parseFloat(rs.bipap_oxygen_litres as string) : null,
        bipap_ipap: rs.bipap_ipap ? parseFloat(rs.bipap_ipap as string) : null,
        bipap_epap: rs.bipap_epap ? parseFloat(rs.bipap_epap as string) : null,
        bipap_pressure_support: rs.bipap_pressure_support ? parseFloat(rs.bipap_pressure_support as string) : null,
        bipap_respiratory_rate: rs.bipap_respiratory_rate ? parseFloat(rs.bipap_respiratory_rate as string) : null,
        invasive_vent_enabled: Boolean(rs.invasive_vent_enabled || rs.vent_ipap),
        vent_ipap: rs.vent_ipap ? parseFloat(rs.vent_ipap as string) : null,
        vent_epap: rs.vent_epap ? parseFloat(rs.vent_epap as string) : null,
        vent_pressure_support: rs.vent_pressure_support ? parseFloat(rs.vent_pressure_support as string) : null,
        vent_fio2_percent: rs.vent_fio2_percent ? parseFloat(rs.vent_fio2_percent as string) : null,
        vent_respiratory_rate: rs.vent_respiratory_rate ? parseFloat(rs.vent_respiratory_rate as string) : null,
        tracheostomy_enabled: Boolean(rs.tracheostomy_enabled || rs.trach_tube_size),
        trach_for_airway_patency: Boolean(rs.trach_for_airway_patency),
        trach_requires_oxygen: Boolean(rs.trach_requires_oxygen),
        trach_oxygen_litres: rs.trach_oxygen_litres ? parseFloat(rs.trach_oxygen_litres as string) : null,
        trach_requires_vent: Boolean(rs.trach_requires_vent),
        trach_vent_ipap: rs.trach_vent_ipap ? parseFloat(rs.trach_vent_ipap as string) : null,
        trach_vent_epap: rs.trach_vent_epap ? parseFloat(rs.trach_vent_epap as string) : null,
        trach_vent_pressure_support: rs.trach_vent_pressure_support ? parseFloat(rs.trach_vent_pressure_support as string) : null,
        trach_vent_respiratory_rate: rs.trach_vent_respiratory_rate ? parseFloat(rs.trach_vent_respiratory_rate as string) : null,
        trach_vent_tidal_volume: rs.trach_vent_tidal_volume ? parseFloat(rs.trach_vent_tidal_volume as string) : null,
        trach_vent_fio2_percent: rs.trach_vent_fio2_percent ? parseFloat(rs.trach_vent_fio2_percent as string) : null,
      });

    if (rsError) {
      console.error("respiratory_support insert error:", rsError);
      return NextResponse.json({ error: "Failed to save respiratory support" }, { status: 500 });
    }
  }

  // 4. Insert pft_records
  if (pftRows && pftRows.length > 0) {
    const pftInserts = pftRows
      .filter((r) => r.test_date)
      .map((r) => ({
        patient_id: patientId,
        test_date: r.test_date as string,
        fvc: r.fvc ? parseFloat(r.fvc) : null,
        fev1: r.fev1 ? parseFloat(r.fev1) : null,
        fev1_fvc_ratio: r.fev1_fvc_ratio ? parseFloat(r.fev1_fvc_ratio) : null,
        dlco: r.dlco ? parseFloat(r.dlco) : null,
        // Store additional PFT and baseline fields in other_fields JSON
        other_fields: {
          fev1_pct_pred: r.fev1_pct_pred || null,
          fvc_pct_pred: r.fvc_pct_pred || null,
          six_mwd: r.six_mwd || null,
          min_spo2: r.min_spo2 || null,
          max_spo2: r.max_spo2 || null,
          baseline_spo2: r.baseline_spo2 || null,
          baseline_heart_rate: r.baseline_heart_rate || null,
          occupation: effectiveOccupation || null,
          other_occupation: otherOccupation || null,
          significant_exposure: significantExposure || null,
          smoking: smokingStatus || null,
          smoking_status: smokingStatus || null,
          smoking_index: smokingIndex || null,
          alcohol: alcoholStatus || null,
          alcohol_status: alcoholStatus || null,
          past_history: pastHistory || null,
          past_history_years_ago: pastHistoryYearsAgo || null,
        } as import("@/lib/database.types").Json,
        created_by_doctor_id: user.id,
      }));

    if (pftInserts.length > 0) {
      const { error: pftError } = await supabase.from("pft_records").insert(pftInserts);
      if (pftError) {
        console.error("pft_records insert error:", pftError);
        return NextResponse.json({ error: "Failed to save PFT records" }, { status: 500 });
      }
    }
  } else {
    // If no PFT records entered, create a baseline record to persist occupation, exposures, habits, and past history
    await supabase.from("pft_records").insert({
      patient_id: patientId,
      test_date: new Date().toISOString().split("T")[0]!,
      other_fields: {
        baseline_spo2: (body.baselineVitals as { baseline_spo2?: string })?.baseline_spo2 || null,
        baseline_heart_rate: (body.baselineVitals as { baseline_heart_rate?: string })?.baseline_heart_rate || null,
        occupation: effectiveOccupation || null,
        other_occupation: otherOccupation || null,
        significant_exposure: significantExposure || null,
        smoking: smokingStatus || null,
        smoking_status: smokingStatus || null,
        smoking_index: smokingIndex || null,
        alcohol: alcoholStatus || null,
        alcohol_status: alcoholStatus || null,
        past_history: pastHistory || null,
        past_history_years_ago: pastHistoryYearsAgo || null,
      } as import("@/lib/database.types").Json,
      created_by_doctor_id: user.id,
    });
  }

  const baselineSpo2Str =
    (body.baselineVitals as { baseline_spo2?: string })?.baseline_spo2 ||
    pftRows?.find((r) => r.baseline_spo2)?.baseline_spo2 ||
    pftRows?.[0]?.baseline_spo2;
  if (baselineSpo2Str) {
    const rawSpo2 = parseFloat(String(baselineSpo2Str));
    if (!isNaN(rawSpo2)) {
      await supabase.from("patient_baselines").upsert({
        patient_id: patientId,
        baseline_spo2: rawSpo2,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // 5. Insert medications
  if (medications && medications.length > 0) {
    const medInserts = medications
      .filter((m) => m.drug_name)
      .map((m, idx) => ({
        patient_id: patientId,
        prescribed_by_doctor_id: user.id,
        route: (m.route as string) ?? "Tablet",
        drug_name: m.drug_name as string,
        dose: m.dose_value ? parseFloat(m.dose_value as string) : (m.dose ? parseFloat(m.dose as string) : null),
        dose_unit: (m.dose_unit as string) || null,
        frequency: (m.frequency as string) || "OD",
        // prescription_date is used as start_date (when the prescription was written)
        start_date: (m.prescription_date as string) || (m.start_date as string) || new Date().toISOString().split("T")[0]!,
        end_date: (m.end_date as string) || null,
        serial_number: idx + 1,
      }));

    if (medInserts.length > 0) {
      const { error: medError } = await supabase.from("medications").insert(medInserts);
      if (medError) {
        console.error("medications insert error:", medError);
        return NextResponse.json({ error: "Failed to save medications" }, { status: 500 });
      }
    }

    const instructionInserts = patientInstructions.map((instruction) => ({
      patient_id: patientId,
      doctor_id: user.id,
      instruction_text: instruction,
    }));

    if (instructionInserts.length > 0) {
      const { error: instructionError } = await supabase.from("doctor_instructions").insert(instructionInserts);
      if (instructionError) {
        console.error("doctor_instructions insert error:", instructionError);
        return NextResponse.json({ error: "Failed to save patient instructions" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true, patientId }, { status: 201 });
}

// ── PUT /api/patients ─────────────────────────────────────────────────────────
export async function PUT(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("id");
  if (!patientId) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!(await canAccessPatient(admin, user.id, patientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const basicInfo = body.basicInfo as Record<string, string> | undefined;
  const diagnosis = body.diagnosis as Record<string, unknown> | undefined;
  const respSupport = body.respSupport as Record<string, unknown> | undefined;
  const pftRows = body.pftRows as Array<Record<string, string>> | undefined;
  const medications = body.medications as Array<Record<string, unknown>> | undefined;
  const patientInstructions = patientInstructionsFromMedications(medications);

  if (!basicInfo?.name || !basicInfo.mobile_number) {
    return NextResponse.json({ error: "name and mobile_number are required" }, { status: 400 });
  }

  if (patientInstructions.some((instruction) => wordCount(instruction) > PATIENT_INSTRUCTION_WORD_LIMIT)) {
    return NextResponse.json({ error: "Patient instructions must be 50 words or fewer" }, { status: 400 });
  }

  // Fetch existing patient to retain unedited values (such as habits or history if user only changed diagnosis)
  const [existingPatientRes, existingPftRes] = await Promise.all([
    admin
      .from("patients")
      .select("id,name,date_of_birth,mobile_number,alternate_mobile_number,gender,emergency_contact_name,emergency_contact_phone,address")
      .eq("id", patientId)
      .single(),
    admin
      .from("pft_records")
      .select("other_fields")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const existingMeta = extractAddressAndMetadata(existingPatientRes.data?.address);
  const existingOtherFields = (existingPftRes.data?.other_fields as Record<string, any>) ?? {};

  const age = basicInfo.age ? parseInt(basicInfo.age, 10) : null;
  const currentYear = new Date().getFullYear();
  const dobYear = age && age > 0 && age < 130 ? currentYear - age : currentYear - 40;
  const dobFromAge = basicInfo.date_of_birth || `${dobYear}-06-15`;

  const rawAlternateMobile = basicInfo.alternate_mobile?.replace(/\D/g, "") ?? "";
  const normalizedAlternateMobile = rawAlternateMobile
    ? rawAlternateMobile.startsWith("91") && rawAlternateMobile.length === 12
      ? `+${rawAlternateMobile}`
      : `+91${rawAlternateMobile}`
    : (existingPatientRes.data?.alternate_mobile_number || null);

  const incomingOcc = (basicInfo.occupation as string) || null;
  const incomingOtherOcc = (basicInfo.other_occupation as string) || null;
  const incomingExp = (basicInfo.significant_exposure as string) || null;
  const effectiveOccupation = incomingOcc
    ? (incomingOcc === "Other" && incomingOtherOcc ? incomingOtherOcc : incomingOcc)
    : (existingMeta.occupation || existingOtherFields.occupation || null);

  const otherOccupation = incomingOtherOcc || existingOtherFields.other_occupation || null;
  const significantExposure = incomingExp || existingMeta.significantExposure || existingOtherFields.significant_exposure || null;

  const smokingStatus = (basicInfo.smoking_status || basicInfo.smoking as string) ||
    existingMeta.smokingStatus || existingOtherFields.smoking_status || existingOtherFields.smoking || null;

  const smokingIndex = smokingStatus === "Yes"
    ? (((basicInfo.smoking_index as string) || existingMeta.smokingIndex || existingOtherFields.smoking_index) || null)
    : null;

  const alcoholStatus = (basicInfo.alcohol_status || basicInfo.alcohol as string) ||
    existingMeta.alcoholStatus || existingOtherFields.alcohol_status || existingOtherFields.alcohol || null;

  const pastHistory = (basicInfo.past_history || basicInfo.past_history_text as string) ||
    existingMeta.pastHistory || existingOtherFields.past_history || null;

  const pastHistoryYearsAgo = pastHistory
    ? (((basicInfo.past_history_years_ago as string) || existingMeta.pastHistoryYearsAgo || existingOtherFields.past_history_years_ago) || null)
    : null;

  const updateAddress = buildAddressWithMetadata(existingMeta.cleanAddress, {
    occupation: effectiveOccupation,
    significantExposure,
    smokingStatus,
    smokingIndex,
    alcoholStatus,
    pastHistory,
    pastHistoryYearsAgo,
  });

  const fullUpdatePayload = {
    name: basicInfo.name,
    date_of_birth: dobFromAge,
    alternate_mobile_number: normalizedAlternateMobile,
    gender: basicInfo.gender || null,
    emergency_contact_name: basicInfo.emergency_contact_name || null,
    emergency_contact_phone: basicInfo.emergency_contact_phone || null,
    occupation: effectiveOccupation || null,
    significant_exposure: significantExposure || null,
    smoking_status: smokingStatus,
    smoking_index: smokingIndex,
    alcohol_status: alcoholStatus,
    past_history: pastHistory,
    past_history_years_ago: pastHistoryYearsAgo,
    ...(updateAddress ? { address: updateAddress } : {}),
  };

  const fallbackUpdatePayload = {
    name: basicInfo.name,
    date_of_birth: dobFromAge,
    alternate_mobile_number: normalizedAlternateMobile,
    gender: basicInfo.gender || null,
    emergency_contact_name: basicInfo.emergency_contact_name || null,
    emergency_contact_phone: basicInfo.emergency_contact_phone || null,
    ...(updateAddress ? { address: updateAddress } : {}),
  };

  const { error: patientError } = await safeUpdatePatient(
    admin,
    patientId,
    fullUpdatePayload,
    fallbackUpdatePayload
  );

  if (patientError) {
    return NextResponse.json({ error: patientError.message }, { status: 500 });
  }

  if (diagnosis) {
    const primaryDiagnosis = (diagnosis.primary_diagnosis as string) ?? "";
    const postIcuSub = (diagnosis.post_icu_sub_diagnosis as string) ?? "";
    const structuredDiagnosis = buildStructuredDiagnosis(diagnosis as any);
    const finalPrimaryDiagnosis = structuredDiagnosis || primaryDiagnosis;
    const effectiveDashboard = computeEffectiveDashboard(finalPrimaryDiagnosis, postIcuSub || undefined);

    await admin.from("patient_diagnoses").delete().eq("patient_id", patientId);
    const { error: diagError } = await admin.from("patient_diagnoses").insert({
      patient_id: patientId,
      primary_diagnosis: finalPrimaryDiagnosis,
      effective_dashboard: effectiveDashboard,
      comorbidities: ((diagnosis.comorbidities as string[]) ?? []) as unknown as Json,
      comorbidities_other_text: (diagnosis.comorbidities_other_text as string) || null,
      diagnosed_at: (diagnosis.diagnosed_at as string) || null,
      post_icu_sub_diagnosis: postIcuSub || null,
    });
    if (diagError) {
      return NextResponse.json({ error: diagError.message }, { status: 500 });
    }
  }

  await admin.from("respiratory_support").delete().eq("patient_id", patientId);
  if (respSupport?.hasRespSupport || respSupport?.requires_support) {
    const rs = respSupport;
    const { error: rsError } = await admin.from("respiratory_support").insert({
      patient_id: patientId,
      requires_support: true,
      ltot_enabled: Boolean(rs.ltot_enabled),
      ltot_litres: rs.ltot_litres ? Number(rs.ltot_litres) : null,
      bipap_enabled: Boolean(rs.bipap_enabled),
      bipap_overnight: Boolean(rs.bipap_overnight),
      bipap_all_time: Boolean(rs.bipap_all_time),
      bipap_requires_oxygen: Boolean(rs.bipap_requires_oxygen),
      bipap_oxygen_litres: rs.bipap_oxygen_litres ? Number(rs.bipap_oxygen_litres) : null,
      bipap_ipap: rs.bipap_ipap ? Number(rs.bipap_ipap) : null,
      bipap_epap: rs.bipap_epap ? Number(rs.bipap_epap) : null,
      bipap_pressure_support: rs.bipap_pressure_support ? Number(rs.bipap_pressure_support) : null,
      bipap_respiratory_rate: rs.bipap_respiratory_rate ? Number(rs.bipap_respiratory_rate) : null,
      invasive_vent_enabled: Boolean(rs.invasive_vent_enabled),
      vent_ipap: rs.vent_ipap ? Number(rs.vent_ipap) : null,
      vent_epap: rs.vent_epap ? Number(rs.vent_epap) : null,
      vent_pressure_support: rs.vent_pressure_support ? Number(rs.vent_pressure_support) : null,
      vent_respiratory_rate: rs.vent_respiratory_rate ? Number(rs.vent_respiratory_rate) : null,
      vent_fio2_percent: rs.vent_fio2_percent ? Number(rs.vent_fio2_percent) : null,
      tracheostomy_enabled: Boolean(rs.tracheostomy_enabled),
      trach_for_airway_patency: Boolean(rs.trach_for_airway_patency),
      trach_requires_oxygen: Boolean(rs.trach_requires_oxygen),
      trach_oxygen_litres: rs.trach_oxygen_litres ? Number(rs.trach_oxygen_litres) : null,
      trach_requires_vent: Boolean(rs.trach_requires_vent),
      trach_vent_ipap: rs.trach_vent_ipap ? Number(rs.trach_vent_ipap) : null,
      trach_vent_epap: rs.trach_vent_epap ? Number(rs.trach_vent_epap) : null,
      trach_vent_pressure_support: rs.trach_vent_pressure_support ? Number(rs.trach_vent_pressure_support) : null,
      trach_vent_respiratory_rate: rs.trach_vent_respiratory_rate ? Number(rs.trach_vent_respiratory_rate) : null,
      trach_vent_tidal_volume: rs.trach_vent_tidal_volume ? Number(rs.trach_vent_tidal_volume) : null,
      trach_vent_fio2_percent: rs.trach_vent_fio2_percent ? Number(rs.trach_vent_fio2_percent) : null,
    });
    if (rsError) {
      return NextResponse.json({ error: rsError.message }, { status: 500 });
    }
  }

  await admin.from("pft_records").delete().eq("patient_id", patientId);
  if (pftRows && pftRows.length > 0) {
    const pftInserts = pftRows
      .filter((r) => r.test_date)
      .map((r) => ({
        patient_id: patientId,
        test_date: r.test_date!,
        fvc: r.fvc ? Number(r.fvc) : null,
        fev1: r.fev1 ? Number(r.fev1) : null,
        fev1_fvc_ratio: r.fev1_fvc_ratio ? Number(r.fev1_fvc_ratio) : null,
        dlco: r.dlco ? Number(r.dlco) : null,
        other_fields: {
          fev1_pct_pred: r.fev1_pct_pred || null,
          fvc_pct_pred: r.fvc_pct_pred || null,
          six_mwd: r.six_mwd || null,
          min_spo2: r.min_spo2 || null,
          max_spo2: r.max_spo2 || null,
          baseline_spo2: r.baseline_spo2 || null,
          baseline_heart_rate: r.baseline_heart_rate || null,
          occupation: effectiveOccupation || null,
          other_occupation: otherOccupation || null,
          significant_exposure: significantExposure || null,
          smoking: smokingStatus || null,
          smoking_status: smokingStatus || null,
          smoking_index: smokingIndex || null,
          alcohol: alcoholStatus || null,
          alcohol_status: alcoholStatus || null,
          past_history: pastHistory || null,
          past_history_years_ago: pastHistoryYearsAgo || null,
        } as Json,
        created_by_doctor_id: user.id,
      }));
    if (pftInserts.length > 0) {
      const { error: pftError } = await admin.from("pft_records").insert(pftInserts);
      if (pftError) return NextResponse.json({ error: pftError.message }, { status: 500 });
    }
  } else {
    await admin.from("pft_records").insert({
      patient_id: patientId,
      test_date: new Date().toISOString().split("T")[0]!,
      other_fields: {
        baseline_spo2: (body.baselineVitals as { baseline_spo2?: string })?.baseline_spo2 || null,
        baseline_heart_rate: (body.baselineVitals as { baseline_heart_rate?: string })?.baseline_heart_rate || null,
        occupation: effectiveOccupation || null,
        other_occupation: otherOccupation || null,
        significant_exposure: significantExposure || null,
        smoking: smokingStatus || null,
        smoking_status: smokingStatus || null,
        smoking_index: smokingIndex || null,
        alcohol: alcoholStatus || null,
        alcohol_status: alcoholStatus || null,
        past_history: pastHistory || null,
        past_history_years_ago: pastHistoryYearsAgo || null,
      } as Json,
      created_by_doctor_id: user.id,
    });
  }

  const baselineSpo2Str =
    (body.baselineVitals as { baseline_spo2?: string })?.baseline_spo2 ||
    pftRows?.find((r) => r.baseline_spo2)?.baseline_spo2 ||
    pftRows?.[0]?.baseline_spo2;
  if (baselineSpo2Str) {
    const rawSpo2 = parseFloat(String(baselineSpo2Str));
    if (!isNaN(rawSpo2)) {
      await admin.from("patient_baselines").upsert({
        patient_id: patientId,
        baseline_spo2: rawSpo2,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Track prescription changes for patient notifications
  const { data: existingMeds } = await admin
    .from("medications")
    .select("id, drug_name, route, dose, dose_unit, frequency, start_date, end_date")
    .eq("patient_id", patientId);

  const existingMap = new Map((existingMeds ?? []).map(m => [m.drug_name.toLowerCase().trim(), m]));
  const incomingMap = new Map((medications ?? []).filter(m => m.drug_name).map(m => [(m.drug_name as string).toLowerCase().trim(), m]));

  const stoppedChanges: Array<{ name: string; details?: string; route?: string; dose?: string }> = [];
  const startedChanges: Array<{ name: string; details?: string; route?: string; dose?: string; frequency?: string }> = [];
  const modifiedChanges: Array<{ name: string; details?: string; from?: string; to?: string }> = [];

  const todayStr = new Date().toISOString().split("T")[0]!;

  for (const [name, existing] of existingMap.entries()) {
    const incoming = incomingMap.get(name);
    if (!incoming) {
      stoppedChanges.push({
        name: existing.drug_name,
        details: `${existing.route || "Tablet"} · ${[existing.dose, existing.dose_unit].filter(Boolean).join(" ")}`,
        route: existing.route,
        dose: [existing.dose, existing.dose_unit].filter(Boolean).join(" "),
      });
    } else if (incoming.end_date && incoming.end_date <= todayStr && (!existing.end_date || existing.end_date > todayStr)) {
      stoppedChanges.push({
        name: existing.drug_name,
        details: `${existing.route || "Tablet"} · ${[existing.dose, existing.dose_unit].filter(Boolean).join(" ")} (Discontinued)`,
        route: existing.route,
        dose: [existing.dose, existing.dose_unit].filter(Boolean).join(" "),
      });
    }
  }

  for (const [name, incoming] of incomingMap.entries()) {
    const existing = existingMap.get(name);
    const doseStr = [incoming.dose, incoming.dose_unit].filter(Boolean).join(" ");
    if (!existing) {
      startedChanges.push({
        name: (incoming.drug_name as string).trim(),
        details: `${incoming.route || "Tablet"}${doseStr ? ` · ${doseStr}` : ""}${incoming.frequency ? ` · ${incoming.frequency}` : ""}`,
        route: incoming.route as string,
        dose: doseStr,
        frequency: incoming.frequency as string,
      });
    } else if (
      existing.dose !== (incoming.dose ? Number(incoming.dose) : null) ||
      existing.frequency !== incoming.frequency ||
      existing.route !== incoming.route
    ) {
      const fromDose = `${existing.route || ""} ${[existing.dose, existing.dose_unit].filter(Boolean).join(" ")} ${existing.frequency || ""}`.trim();
      const toDose = `${incoming.route || ""} ${doseStr} ${incoming.frequency || ""}`.trim();
      modifiedChanges.push({
        name: (incoming.drug_name as string).trim(),
        details: `${fromDose} → ${toDose}`,
        from: fromDose,
        to: toDose,
      });
    }
  }

  await admin.from("medications").delete().eq("patient_id", patientId);

  const allMedInserts: Array<{
    patient_id: string;
    prescribed_by_doctor_id: string;
    route: string;
    drug_name: string;
    dose: number | null;
    dose_unit: string | null;
    frequency: string;
    start_date: string;
    end_date: string | null;
    serial_number: number;
  }> = [];

  let nextSerial = 1;

  if (medications && medications.length > 0) {
    medications
      .filter((m) => m.drug_name)
      .forEach((m) => {
        allMedInserts.push({
          patient_id: patientId,
          prescribed_by_doctor_id: user.id,
          route: (m.route as string) ?? "tablet",
          drug_name: m.drug_name as string,
          dose: m.dose ? Number(m.dose) : null,
          dose_unit: (m.dose_unit as string) || null,
          frequency: (m.frequency as string) || "OD",
          start_date: (m.prescription_date as string) || (m.start_date as string) || new Date().toISOString().split("T")[0]!,
          end_date: (m.end_date as string) || null,
          serial_number: nextSerial++,
        });
      });
  }

  // Preserve any discontinued medications that were omitted from incoming list
  for (const stopped of stoppedChanges) {
    const isAlreadyInserted = allMedInserts.some(
      (m) => m.drug_name.toLowerCase().trim() === stopped.name.toLowerCase().trim()
    );
    if (!isAlreadyInserted) {
      const existing = existingMap.get(stopped.name.toLowerCase().trim());
      allMedInserts.push({
        patient_id: patientId,
        prescribed_by_doctor_id: user.id,
        route: stopped.route || existing?.route || "Tablet",
        drug_name: stopped.name,
        dose: existing?.dose ? Number(existing.dose) : (stopped.dose ? parseFloat(stopped.dose) : null),
        dose_unit: existing?.dose_unit || null,
        frequency: existing?.frequency || "OD",
        start_date: existing?.start_date || todayStr,
        end_date: todayStr,
        serial_number: nextSerial++,
      });
    }
  }

  if (allMedInserts.length > 0) {
    const { error: medError } = await admin.from("medications").insert(allMedInserts);
    if (medError) return NextResponse.json({ error: medError.message }, { status: 500 });
  }

  const instructionInserts = patientInstructions.map((instruction) => ({
    patient_id: patientId,
    doctor_id: user.id,
    instruction_text: instruction,
  }));

  if (instructionInserts.length > 0) {
    const { error: instructionError } = await admin.from("doctor_instructions").insert(instructionInserts);
    if (instructionError) return NextResponse.json({ error: instructionError.message }, { status: 500 });
  }

  if (stoppedChanges.length > 0 || startedChanges.length > 0 || modifiedChanges.length > 0) {
    const { data: docData } = await admin.from("doctors").select("name").eq("id", user.id).maybeSingle();
    await admin.from("audit_logs").insert({
      action: "prescription_updated",
      actor_id: user.id,
      actor_role: "doctor",
      target_patient_id: patientId,
      metadata: {
        updated_at: new Date().toISOString(),
        prescription_date: todayStr,
        doctor_name: docData?.name || "Attending Doctor",
        has_changes: true,
        stopped: stoppedChanges,
        started: startedChanges,
        modified: modifiedChanges,
      },
    });
  }

  return NextResponse.json({ ok: true, patientId });
}

// ── DELETE /api/patients?id=<patientId> ───────────────────────────────────────
export async function DELETE(request: Request): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("id");
  if (!patientId) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  // Verify the patient belongs to this doctor before deleting
  const { data: patient } = await supabase
    .from("patients")
    .select("id, doctor_id")
    .eq("id", patientId)
    .single();

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  if (patient.doctor_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Record audit trail event
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    action: "patient_deleted_by_doctor",
    actor_id: user.id,
    actor_role: "doctor",
    target_patient_id: patientId,
    metadata: { deleted_at: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
