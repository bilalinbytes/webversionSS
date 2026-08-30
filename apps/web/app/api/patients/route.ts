import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import type { Json } from "@/lib/database.types";

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

function parseDiagnosisLabel(primary: string | null): {
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
  const label = primary ?? "";
  const parts = label.split("/").map((part) => part.trim()).filter(Boolean);
  const lower = label.toLowerCase();
  if (lower.startsWith("ild")) {
    const fibroticPart = parts.find((part) => /fibrotic/i.test(part));
    return {
      disease_category: "ILD",
      primary_diagnosis: "ild",
      ild_subtype: parts[1] ?? "",
      ild_other_text: "",
      is_fibrotic: fibroticPart ? !/^non/i.test(fibroticPart) : null,
      oad_diagnosis: "",
      oad_other_text: "",
      bronchiectasis_cause: "",
      bronchiectasis_other_text: "",
      posticu_cause: "",
      posticu_other_text: "",
    };
  }
  if (lower.startsWith("oad") || lower.includes("copd") || lower.includes("asthma") || lower.includes("bronchiolitis")) {
    const isBronchiolitis = lower.includes("bronchiolitis");
    const isOverlap = lower.includes("overlap") || lower.includes("aco") || (lower.includes("asthma") && lower.includes("copd"));
    const isAsthma = lower.includes("asthma") && !isOverlap;

    const oadDiag = parts[1] ?? (
      isBronchiolitis ? "Bronchiolitis Obliterans" :
      isOverlap ? "Asthma-COPD Overlap (ACO)" :
      isAsthma ? "Asthma" : "COPD"
    );
    const primDiag = isBronchiolitis ? "asthma" :
      isOverlap ? "copd" :
      isAsthma ? "asthma" : "copd";

    return {
      disease_category: "OAD",
      primary_diagnosis: primDiag,
      ild_subtype: "",
      ild_other_text: "",
      is_fibrotic: null,
      oad_diagnosis: oadDiag,
      oad_other_text: "",
      bronchiectasis_cause: "",
      bronchiectasis_other_text: "",
      posticu_cause: "",
      posticu_other_text: "",
    };
  }
  if (lower.startsWith("bronchiectasis")) {
    return {
      disease_category: "Bronchiectasis",
      primary_diagnosis: "bronchiectasis",
      ild_subtype: "",
      ild_other_text: "",
      is_fibrotic: null,
      oad_diagnosis: "",
      oad_other_text: "",
      bronchiectasis_cause: parts[1] ?? "",
      bronchiectasis_other_text: "",
      posticu_cause: "",
      posticu_other_text: "",
    };
  }
  if (lower.startsWith("post icu") || lower.startsWith("post_icu") || lower.startsWith("post-icu")) {
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
      posticu_cause: parts[1] ?? "",
      posticu_other_text: "",
    };
  }
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

  // Resolve occupation and significant illness exposure
  let resolvedOccupation = "";
  let resolvedOtherOccupation = "";
  let resolvedSignificantExposure = "";

  if (pftRes.data && pftRes.data.length > 0) {
    for (const rec of pftRes.data) {
      const other = (rec.other_fields as Record<string, string | null>) ?? {};
      if (!resolvedOccupation && other.occupation) {
        resolvedOccupation = String(other.occupation);
      }
      if (!resolvedOtherOccupation && other.other_occupation) {
        resolvedOtherOccupation = String(other.other_occupation);
      }
      if (!resolvedSignificantExposure && other.significant_exposure) {
        resolvedSignificantExposure = String(other.significant_exposure);
      }
    }
  }

  const addrStr = patientRes.data.address ?? "";
  if (!resolvedOccupation && addrStr.includes("Occupation: ")) {
    const occMatch = addrStr.match(/Occupation:\s*([^|\]]+)/);
    if (occMatch?.[1]) resolvedOccupation = occMatch[1].trim();
  }
  if (!resolvedSignificantExposure && (addrStr.includes("Exposure: ") || addrStr.includes("Illness Exposure: "))) {
    const expMatch = addrStr.match(/(?:Exposure|Illness Exposure):\s*([^|\]]+)/);
    if (expMatch?.[1]) resolvedSignificantExposure = expMatch[1].trim();
  }

  const formData = {
    name: patientRes.data.name ?? "",
    age: ageFromDob(patientRes.data.date_of_birth),
    gender: patientRes.data.gender ?? "",
    mobile_number: nationalPhone(patientRes.data.mobile_number),
    alternate_mobile: nationalPhone(patientRes.data.alternate_mobile_number),
    emergency_contact_name: patientRes.data.emergency_contact_name ?? "",
    emergency_contact_phone: patientRes.data.emergency_contact_phone ?? "",
    occupation: resolvedOccupation,
    other_occupation: resolvedOtherOccupation,
    significant_exposure: resolvedSignificantExposure,
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

  const addressParts = [
    basicInfo.street_address,
    basicInfo.city,
    basicInfo.state,
    basicInfo.pincode,
  ].filter(Boolean);
  let address = addressParts.length > 0 ? addressParts.join(", ") : null;
  if (effectiveOccupation || significantExposure) {
    const occTag = effectiveOccupation ? `Occupation: ${effectiveOccupation}` : "";
    const expTag = significantExposure ? `Exposure: ${significantExposure}` : "";
    const metaStr = [occTag, expTag].filter(Boolean).join(" | ");
    address = address ? `${address} [${metaStr}]` : metaStr;
  }

  // 1. Insert patient
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .insert({
      name: basicInfo.name,
      date_of_birth: dobFromAge,
      mobile_number: normalizedMobile,
      alternate_mobile_number: normalizedAlternateMobile,
      gender: basicInfo.gender || null,
      address,
      doctor_id: user.id,
      emergency_contact_name: basicInfo.emergency_contact_name || null,
      emergency_contact_phone: basicInfo.emergency_contact_phone || null,
    })
    .select("id")
    .single();

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
    const diseaseCategory = (diagnosis.disease_category as string) ?? "";
    const ildSubtype = (diagnosis.ild_subtype as string) ?? "";
    const ildOtherText = (diagnosis.ild_other_text as string) ?? "";
    const isFibrotic = diagnosis.is_fibrotic as boolean | null;
    const oadDiagnosis = (diagnosis.oad_diagnosis as string) ?? "";
    const oadOtherText = (diagnosis.oad_other_text as string) ?? "";
    const bronchiectasisCause = (diagnosis.bronchiectasis_cause as string) ?? "";
    const bronchiectasisOtherText = (diagnosis.bronchiectasis_other_text as string) ?? "";
    const posticuCause = (diagnosis.posticu_cause as string) ?? "";
    const posticuOtherText = (diagnosis.posticu_other_text as string) ?? "";

    // Build structured primary_diagnosis string
    let structuredDiagnosis = primaryDiagnosis;
    if (diseaseCategory === "ILD" && ildSubtype) {
      const subtype = ildSubtype === "Others" ? (ildOtherText || "Others") : ildSubtype;
      const fibroticLabel = isFibrotic === true ? "Fibrotic" : isFibrotic === false ? "Non-Fibrotic" : "";
      structuredDiagnosis = ["ILD", subtype, fibroticLabel].filter(Boolean).join(" / ");
    } else if (diseaseCategory === "OAD" && oadDiagnosis) {
      const specific = oadDiagnosis === "Other OAD" ? (oadOtherText || "Other OAD") : oadDiagnosis;
      structuredDiagnosis = `OAD / ${specific}`;
    } else if (diseaseCategory === "Bronchiectasis" && bronchiectasisCause) {
      const cause = bronchiectasisCause === "Other" ? (bronchiectasisOtherText || "Other") : bronchiectasisCause;
      structuredDiagnosis = `Bronchiectasis / ${cause}`;
    } else if (diseaseCategory === "Post ICU Recovery" && posticuCause) {
      const cause = posticuCause === "Other cause" ? (posticuOtherText || "Other") : posticuCause;
      structuredDiagnosis = `Post ICU Recovery / ${cause}`;
    }

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
  if (respSupport?.hasRespSupport) {
    const rs = respSupport;
    const { error: rsError } = await supabase
      .from("respiratory_support")
      .insert({
        patient_id: patientId,
        requires_support: true,
        ltot_enabled: !!(rs.ltot_litres),
        ltot_litres: rs.ltot_litres ? parseFloat(rs.ltot_litres as string) : null,
        bipap_enabled: !!(rs.bipap_ipap),
        bipap_ipap: rs.bipap_ipap ? parseFloat(rs.bipap_ipap as string) : null,
        bipap_epap: rs.bipap_epap ? parseFloat(rs.bipap_epap as string) : null,
        bipap_pressure_support: rs.bipap_pressure_support ? parseFloat(rs.bipap_pressure_support as string) : null,
        bipap_respiratory_rate: rs.bipap_respiratory_rate ? parseFloat(rs.bipap_respiratory_rate as string) : null,
        bipap_requires_oxygen: (rs.bipap_requires_oxygen as boolean) ?? false,
        bipap_oxygen_litres: rs.bipap_oxygen_litres ? parseFloat(rs.bipap_oxygen_litres as string) : null,
        bipap_overnight: rs.bipap_usage === "Overnight only",
        bipap_all_time: rs.bipap_usage === "All-time",
        invasive_vent_enabled: !!(rs.vent_ipap),
        vent_ipap: rs.vent_ipap ? parseFloat(rs.vent_ipap as string) : null,
        vent_epap: rs.vent_epap ? parseFloat(rs.vent_epap as string) : null,
        vent_pressure_support: rs.vent_pressure_support ? parseFloat(rs.vent_pressure_support as string) : null,
        vent_fio2_percent: rs.vent_fio2_percent ? parseFloat(rs.vent_fio2_percent as string) : null,
        vent_respiratory_rate: rs.vent_respiratory_rate ? parseFloat(rs.vent_respiratory_rate as string) : null,
        tracheostomy_enabled: !!(rs.trach_tube_size),
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
        // Store additional PFT fields in other_fields JSON
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
    // If no PFT records entered, create a baseline record to persist occupation and exposures
    await supabase.from("pft_records").insert({
      patient_id: patientId,
      test_date: new Date().toISOString().split("T")[0]!,
      other_fields: {
        baseline_spo2: (body.baselineVitals as { baseline_spo2?: string })?.baseline_spo2 || null,
        baseline_heart_rate: (body.baselineVitals as { baseline_heart_rate?: string })?.baseline_heart_rate || null,
        occupation: effectiveOccupation || null,
        other_occupation: otherOccupation || null,
        significant_exposure: significantExposure || null,
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

  const age = basicInfo.age ? parseInt(basicInfo.age, 10) : null;
  const currentYear = new Date().getFullYear();
  const dobYear = age && age > 0 && age < 130 ? currentYear - age : currentYear - 40;
  const dobFromAge = basicInfo.date_of_birth || `${dobYear}-06-15`;

  const rawAlternateMobile = basicInfo.alternate_mobile?.replace(/\D/g, "") ?? "";
  const normalizedAlternateMobile = rawAlternateMobile
    ? rawAlternateMobile.startsWith("91") && rawAlternateMobile.length === 12
      ? `+${rawAlternateMobile}`
      : `+91${rawAlternateMobile}`
    : null;

  const occupation = (basicInfo.occupation as string) || null;
  const otherOccupation = (basicInfo.other_occupation as string) || null;
  const significantExposure = (basicInfo.significant_exposure as string) || null;
  const effectiveOccupation = occupation === "Other" && otherOccupation ? otherOccupation : occupation;

  let updateAddress: string | null | undefined = undefined;
  if (effectiveOccupation || significantExposure) {
    const occTag = effectiveOccupation ? `Occupation: ${effectiveOccupation}` : "";
    const expTag = significantExposure ? `Exposure: ${significantExposure}` : "";
    updateAddress = [occTag, expTag].filter(Boolean).join(" | ");
  }

  const { error: patientError } = await admin
    .from("patients")
    .update({
      name: basicInfo.name,
      date_of_birth: dobFromAge,
      alternate_mobile_number: normalizedAlternateMobile,
      gender: basicInfo.gender || null,
      emergency_contact_name: basicInfo.emergency_contact_name || null,
      emergency_contact_phone: basicInfo.emergency_contact_phone || null,
      ...(updateAddress ? { address: updateAddress } : {}),
    })
    .eq("id", patientId);

  if (patientError) {
    return NextResponse.json({ error: patientError.message }, { status: 500 });
  }

  if (diagnosis) {
    const primaryDiagnosis = (diagnosis.primary_diagnosis as string) ?? "";
    const postIcuSub = (diagnosis.post_icu_sub_diagnosis as string) ?? "";
    const diseaseCategory = (diagnosis.disease_category as string) ?? "";
    const ildSubtype = (diagnosis.ild_subtype as string) ?? "";
    const ildOtherText = (diagnosis.ild_other_text as string) ?? "";
    const isFibrotic = diagnosis.is_fibrotic as boolean | null;
    const oadDiagnosis = (diagnosis.oad_diagnosis as string) ?? "";
    const oadOtherText = (diagnosis.oad_other_text as string) ?? "";
    const bronchiectasisCause = (diagnosis.bronchiectasis_cause as string) ?? "";
    const bronchiectasisOtherText = (diagnosis.bronchiectasis_other_text as string) ?? "";
    const posticuCause = (diagnosis.posticu_cause as string) ?? "";
    const posticuOtherText = (diagnosis.posticu_other_text as string) ?? "";

    let structuredDiagnosis = primaryDiagnosis;
    if (diseaseCategory === "ILD" && ildSubtype) {
      const subtype = ildSubtype === "Others" ? (ildOtherText || "Others") : ildSubtype;
      const fibroticLabel = isFibrotic === true ? "Fibrotic" : isFibrotic === false ? "Non-Fibrotic" : "";
      structuredDiagnosis = ["ILD", subtype, fibroticLabel].filter(Boolean).join(" / ");
    } else if (diseaseCategory === "OAD" && oadDiagnosis) {
      const specific = oadDiagnosis === "Other OAD" ? (oadOtherText || "Other OAD") : oadDiagnosis;
      structuredDiagnosis = `OAD / ${specific}`;
    } else if (diseaseCategory === "Bronchiectasis" && bronchiectasisCause) {
      const cause = bronchiectasisCause === "Other" ? (bronchiectasisOtherText || "Other") : bronchiectasisCause;
      structuredDiagnosis = `Bronchiectasis / ${cause}`;
    } else if (diseaseCategory === "Post ICU Recovery" && posticuCause) {
      const cause = posticuCause === "Other cause" ? (posticuOtherText || "Other") : posticuCause;
      structuredDiagnosis = `Post ICU Recovery / ${cause}`;
    }

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
        } as Json,
        created_by_doctor_id: user.id,
      }));
    if (pftInserts.length > 0) {
      const { error: pftError } = await admin.from("pft_records").insert(pftInserts);
      if (pftError) return NextResponse.json({ error: pftError.message }, { status: 500 });
    }
  } else if (effectiveOccupation || significantExposure) {
    await admin.from("pft_records").insert({
      patient_id: patientId,
      test_date: new Date().toISOString().split("T")[0]!,
      other_fields: {
        baseline_spo2: (body.baselineVitals as { baseline_spo2?: string })?.baseline_spo2 || null,
        baseline_heart_rate: (body.baselineVitals as { baseline_heart_rate?: string })?.baseline_heart_rate || null,
        occupation: effectiveOccupation || null,
        other_occupation: otherOccupation || null,
        significant_exposure: significantExposure || null,
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
