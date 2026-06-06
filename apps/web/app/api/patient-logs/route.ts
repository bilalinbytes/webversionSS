import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import { dailyLogSchema, type DailyLogPayload } from "@/lib/server/log-schema";
import {
  computeRedFlagScore,
  runAlertEngine,
  type DailyLogInput,
  type PatientBaseline,
  type PreviousLog,
} from "@saans/scoring-engine";
import type { Database, Json } from "@/lib/database.types";

interface ScoringEngineResult {
  global_score: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  indicator_color: "green" | "yellow" | "orange" | "red";
  score_breakdown: Array<{ factor: string; points: number; triggered: boolean }>;
  auto_triggered: boolean;
  auto_trigger_reason: string | null;
}

interface AlertEngineResultLocal {
  alert_type: "red" | "orange" | "yellow" | "green";
  reason_text: string;
  triggering_metrics: Record<string, unknown>;
  suppression_key: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberFromRecord(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" ? value : null;
}

function booleanFromRecord(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}

function validationMessage(details: ReturnType<typeof dailyLogSchema.safeParse>) {
  if (details.success) return "Validation failed";
  const flattened = details.error.flatten();
  const firstFieldError = Object.entries(flattened.fieldErrors)
    .find(([, messages]) => messages && messages.length > 0);

  if (firstFieldError) {
    const [field, messages] = firstFieldError;
    return `${field}: ${messages![0]}`;
  }

  return flattened.formErrors[0] ?? "Validation failed";
}

function classifyAsthmaControlStatus(
  responses: boolean[] | null | undefined,
): "well_controlled" | "partly_controlled" | "poorly_controlled" | null {
  if (!responses || responses.length !== 4) return null;

  const positiveCount = responses.filter(Boolean).length;
  if (positiveCount === 0) return "well_controlled";
  if (positiveCount <= 2) return "partly_controlled";
  return "poorly_controlled";
}

function scoreFromAlert(alert: AlertEngineResultLocal): ScoringEngineResult {
  if (alert.alert_type === "red") {
    return {
      global_score: 10,
      risk_level: "critical",
      indicator_color: "red",
      score_breakdown: [{ factor: alert.reason_text, points: 10, triggered: true }],
      auto_triggered: true,
      auto_trigger_reason: alert.reason_text,
    };
  }

  if (alert.alert_type === "yellow") {
    return {
      global_score: 5,
      risk_level: "moderate",
      indicator_color: "yellow",
      score_breakdown: [{ factor: alert.reason_text, points: 4, triggered: true }],
      auto_triggered: true,
      auto_trigger_reason: alert.reason_text,
    };
  }

  return {
    global_score: 1,
    risk_level: "low",
    indicator_color: "green",
    score_breakdown: [{ factor: alert.reason_text, points: 0, triggered: true }],
    auto_triggered: false,
    auto_trigger_reason: null,
  };
}

function mapPayloadToDailyLogInput(
  payload: DailyLogPayload,
  diseaseData: Record<string, unknown>
): DailyLogInput {
  return {
    patient_id: payload.patient_id,
    log_date: payload.log_date,
    spo2_rest: payload.spo2_rest ?? null,
    spo2_exertion: payload.spo2_exertion ?? null,
    mmrc_today: payload.mmrc_today ?? null,
    aqi_value: payload.aqi_value ?? null,
    medication_compliance: payload.medication_compliance ?? null,
    vas_symptoms: (payload.vas_symptoms as Partial<Record<string, number>> | null) ?? null,
    disease_specific_data: diseaseData as DailyLogInput["disease_specific_data"],
    temperature_f: payload.temperature_f ?? null,
    haemoptysis: payload.haemoptysis ?? null,
    heart_rate: payload.heart_rate ?? null,
    respiratory_rate: payload.respiratory_rate ?? null,
    pedal_oedema: payload.pedal_edema ?? null,
    oxygen_requirement_litres: payload.oxygen_requirement_litres ?? null,
    step_count_today: payload.step_count_today ?? null,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const admin = createAdminClient();

  // ── Auth: extract Bearer token and verify it's a valid patient ──────────────
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: sessionData, error: authError } = await admin.auth.getUser(token);
  if (authError || !sessionData.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const userId = sessionData.user.id;

  // ── Parse & validate body ───────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validation = dailyLogSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validationMessage(validation), details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const payload = validation.data as DailyLogPayload;

  // ── Patient authorization: the submitting user must be the patient ──────────
  if (payload.patient_id !== userId) {
    return NextResponse.json({ error: "Not authorized for this patient" }, { status: 403 });
  }

  const { data: patientData } = await admin
    .from("patients")
    .select("id, doctor_id")
    .eq("id", payload.patient_id)
    .single();

  if (!patientData) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // ── Build disease-specific data ─────────────────────────────────────────────
  const diseaseSpecificFields: Record<string, unknown> = {};
  diseaseSpecificFields.heart_rate = payload.heart_rate;
  diseaseSpecificFields.temperature_f = payload.temperature_f;
  diseaseSpecificFields.haemoptysis = payload.haemoptysis;
  diseaseSpecificFields.respiratory_rate = payload.respiratory_rate;
  diseaseSpecificFields.respiratory_support_status = payload.respiratory_support_status;
  diseaseSpecificFields.respiratory_support_type = payload.respiratory_support_type;
  if (payload.effective_dashboard === "asthma") {
    const asthmaControlStatus =
      classifyAsthmaControlStatus(payload.asthma_control_responses) ??
      payload.asthma_control_status ??
      null;
    const asthmaControlYesCount =
      payload.asthma_control_responses?.filter(Boolean).length ??
      payload.asthma_control_yes_count ??
      null;
    const controllerTaken =
      payload.controller_taken ??
      (payload.medication_compliance
        ? Object.values(payload.medication_compliance).every(Boolean)
        : null);

    diseaseSpecificFields.rescue_inhaler_puffs = payload.rescue_inhaler_puffs;
    diseaseSpecificFields.night_waking = payload.night_waking;
    diseaseSpecificFields.pefr_lpm = payload.pefr_lpm;
    diseaseSpecificFields.pefr_reading = payload.pefr_reading;
    diseaseSpecificFields.pefr_personal_best = payload.pefr_personal_best;
    diseaseSpecificFields.controller_taken = controllerTaken;
    diseaseSpecificFields.asthma_control_responses = payload.asthma_control_responses;
    diseaseSpecificFields.asthma_control_yes_count = asthmaControlYesCount;
    diseaseSpecificFields.asthma_control_status = asthmaControlStatus;
  } else if (payload.effective_dashboard === "copd") {
    diseaseSpecificFields.sputum_colour = payload.sputum_colour;
    diseaseSpecificFields.sputum_volume = payload.sputum_volume;
    diseaseSpecificFields.energy_level = payload.energy_level;
    diseaseSpecificFields.sleep_disturbed = payload.sleep_disturbed;
    diseaseSpecificFields.wheezing = payload.wheezing;
    diseaseSpecificFields.step_count_today = payload.step_count_today;
    diseaseSpecificFields.chest_heaviness = payload.chest_heaviness;
    diseaseSpecificFields.exercise_tolerance = payload.exercise_tolerance;
    // Alert engine inputs
    diseaseSpecificFields.exercise_tolerance_good = payload.exercise_tolerance_good;
    diseaseSpecificFields.cough_frequency = payload.cough_frequency;
    diseaseSpecificFields.haemoptysis_volume = payload.haemoptysis_volume;
  } else if (payload.effective_dashboard === "bronchiectasis") {
    diseaseSpecificFields.sputum_colour = payload.sputum_colour;
    diseaseSpecificFields.sputum_volume = payload.sputum_volume;
    diseaseSpecificFields.ease_of_clearance = payload.ease_of_clearance;
    diseaseSpecificFields.ease_of_sputum_clearance = payload.ease_of_sputum_clearance;
    diseaseSpecificFields.feverish_or_temp_gt_102 = payload.feverish_or_temp_gt_102;
    diseaseSpecificFields.recorded_temperature_f = payload.recorded_temperature_f;
    diseaseSpecificFields.malaise = payload.malaise;
    diseaseSpecificFields.pedal_edema = payload.pedal_edema;
    diseaseSpecificFields.pedal_oedema = payload.pedal_edema; // engine reads both spellings
    diseaseSpecificFields.wheezing = payload.wheezing;
    diseaseSpecificFields.haemoptysis_volume = payload.haemoptysis_volume;
  } else if (payload.effective_dashboard === "ild") {
    diseaseSpecificFields.kbild_responses = payload.kbild_responses;
    diseaseSpecificFields.kbild_score = payload.kbild_score;
    diseaseSpecificFields.kbild_answered_count = payload.kbild_answered_count;
    diseaseSpecificFields.kbild_previous = payload.kbild_previous;
    diseaseSpecificFields.antifibrotic_taken = payload.antifibrotic_taken;
    diseaseSpecificFields.rash = payload.rash;
    diseaseSpecificFields.diarrhoea = payload.diarrhoea;
    diseaseSpecificFields.pedal_edema = payload.pedal_edema;
    diseaseSpecificFields.respiratory_support_status = payload.respiratory_support_status;
  } else if (payload.effective_dashboard === "post_icu") {
    diseaseSpecificFields.energy_level = payload.energy_level;
    diseaseSpecificFields.sleep_quality = payload.sleep_quality;
    diseaseSpecificFields.anxiety = payload.anxiety;
    diseaseSpecificFields.confusion = payload.confusion;
    diseaseSpecificFields.sputum_colour = payload.sputum_colour;
    diseaseSpecificFields.sputum_volume = payload.sputum_volume;
    diseaseSpecificFields.ease_of_clearance = payload.ease_of_clearance;
    diseaseSpecificFields.ease_of_sputum_clearance = payload.ease_of_sputum_clearance;
    diseaseSpecificFields.feverish_or_temp_gt_102 = payload.feverish_or_temp_gt_102;
    diseaseSpecificFields.recorded_temperature_f = payload.recorded_temperature_f;
    diseaseSpecificFields.malaise = payload.malaise;
    diseaseSpecificFields.haemoptysis_volume = payload.haemoptysis_volume;
  }
  diseaseSpecificFields.effective_dashboard = payload.effective_dashboard;

  // Patient can submit at most two logs per day. Extra updates must go through the emergency note path.
  const dayStart = `${payload.log_date}T00:00:00`;
  const dayEnd   = `${payload.log_date}T23:59:59`;
  const { count: todayCount } = await admin
    .from("daily_logs")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", payload.patient_id)
    .gte("logged_at", dayStart)
    .lte("logged_at", dayEnd);

  if ((todayCount ?? 0) >= 2) {
    return NextResponse.json(
      {
        error: "Daily logs finished. You can submit up to 2 logs per day.",
        code: "daily_log_limit_reached",
      },
      { status: 429 }
    );
  }

  // ── Insert daily log ────────────────────────────────────────────────────────
  const submittedAt = new Date().toISOString();
  const logInsert = {
    patient_id: payload.patient_id,
    logged_at: submittedAt,
    submitted_at: submittedAt,
    spo2_rest: payload.spo2_rest,
    spo2_exertion: payload.spo2_exertion,
    mmrc_today: payload.mmrc_today,
    aqi_value: payload.aqi_value,
    medication_compliance: payload.medication_compliance as Json,
    vas_symptoms: payload.vas_symptoms as Json,
    pedal_edema: payload.pedal_edema,
    side_effects: payload.side_effects as Json,
    oxygen_condition_static: payload.respiratory_support_status === "static" ? true : payload.respiratory_support_status ? false : null,
    oxygen_change_direction: payload.respiratory_support_status && payload.respiratory_support_status !== "static" ? payload.respiratory_support_status : null,
    oxygen_change_litres: payload.oxygen_requirement_litres,
    step_count_today: payload.step_count_today,
    disease_specific_data: diseaseSpecificFields as unknown as Json,
  } as unknown as Database["public"]["Tables"]["daily_logs"]["Insert"];

  const logInsertId = crypto.randomUUID();
  const { data: inserted } = await admin.from("daily_logs").insert({ id: logInsertId, ...logInsert }).select("id").single();
  const logId = inserted?.id ?? logInsertId;

  if (!logId) {
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }

  // ── DQI + FI (signal quality) ───────────────────────────────────────────────
  const dqiKeys = Object.keys(diseaseSpecificFields).filter((k) => k !== "effective_dashboard");
  let dqiScore = 100;
  if (!payload.spo2_rest) dqiScore -= 20;
  if (payload.mmrc_today === null || payload.mmrc_today === undefined) dqiScore -= 15;
  if (!payload.aqi_value) dqiScore -= 10;
  if (payload.medication_compliance === null || payload.medication_compliance === undefined) dqiScore -= 10;
  if (dqiKeys.length === 0) dqiScore -= 15;
  if (!payload.vas_symptoms || Object.keys(payload.vas_symptoms as object).length === 0) dqiScore -= 5;
  if (!payload.spo2_exertion) dqiScore -= 5;
  dqiScore = Math.max(dqiScore, 10);

  // ── Scoring + Alert engines ─────────────────────────────────────────────────
  const [baselineRes, diagnosisRes, prevLogsRes] = await Promise.all([
    admin.from("patient_baselines")
      .select("baseline_spo2, baseline_mmrc, baseline_oxygen_flow, baseline_cough_vas")
      .eq("patient_id", payload.patient_id)
      .single(),
    admin.from("patient_diagnoses")
      .select("primary_diagnosis, effective_dashboard")
      .eq("patient_id", payload.patient_id)
      .single(),
    admin.from("daily_logs")
      .select("logged_at, spo2_rest, spo2_exertion, mmrc_today, disease_specific_data, vas_symptoms, pedal_edema, oxygen_change_litres, step_count_today, side_effects")
      .eq("patient_id", payload.patient_id)
      .lt("logged_at", payload.log_date)
      .order("logged_at", { ascending: false })
      .limit(2),
  ]);

  const baseline: PatientBaseline = {
    baseline_spo2: baselineRes.data?.baseline_spo2 ?? null,
    baseline_mmrc: baselineRes.data?.baseline_mmrc ?? null,
    baseline_oxygen_litres: baselineRes.data?.baseline_oxygen_flow ?? null,
    baseline_cough_vas: baselineRes.data?.baseline_cough_vas ?? null,
    primary_diagnosis: (diagnosisRes.data?.primary_diagnosis as PatientBaseline["primary_diagnosis"]) ?? "asthma",
    effective_dashboard: (diagnosisRes.data?.effective_dashboard as PatientBaseline["effective_dashboard"]) ?? "asthma",
  };

  const previousLogs: PreviousLog[] = (prevLogsRes.data ?? []).map((log) => {
    const diseaseRecord = isRecord(log.disease_specific_data) ? log.disease_specific_data : {};

    return {
      patient_id: payload.patient_id,
      log_date: log.logged_at,
      spo2_rest: log.spo2_rest,
      spo2_exertion: log.spo2_exertion,
      mmrc_today: log.mmrc_today,
      aqi_value: null,
      medication_compliance: null,
      vas_symptoms: log.vas_symptoms as DailyLogInput["vas_symptoms"],
      disease_specific_data: log.disease_specific_data as DailyLogInput["disease_specific_data"],
      temperature_f: numberFromRecord(diseaseRecord, "temperature_f"),
      haemoptysis: booleanFromRecord(diseaseRecord, "haemoptysis"),
      heart_rate: numberFromRecord(diseaseRecord, "heart_rate"),
      respiratory_rate: numberFromRecord(diseaseRecord, "respiratory_rate"),
      pedal_oedema: log.pedal_edema,
      oxygen_requirement_litres: log.oxygen_change_litres,
      side_effects: log.side_effects as DailyLogInput["side_effects"],
      step_count_today: log.step_count_today,
    };
  });

  // FI score — physiological plausibility
  let fiScore = 100;
  const spo2 = payload.spo2_rest;
  if (spo2 !== null && spo2 !== undefined) {
    if (spo2 < 50 || spo2 > 100) fiScore -= 40;
    else if (spo2 < 70) fiScore -= 20;
  }
  if (payload.mmrc_today !== null && payload.mmrc_today !== undefined && (payload.mmrc_today < 0 || payload.mmrc_today > 4)) fiScore -= 20;
  if (payload.respiratory_rate !== null && payload.respiratory_rate !== undefined && (payload.respiratory_rate < 4 || payload.respiratory_rate > 60)) fiScore -= 20;
  if (payload.temperature_f !== null && payload.temperature_f !== undefined && (payload.temperature_f < 90 || payload.temperature_f > 115)) fiScore -= 15;
  const prevSpo2 = (prevLogsRes.data ?? [])[0]?.spo2_rest;
  if (prevSpo2 !== null && prevSpo2 !== undefined && spo2 !== null && spo2 !== undefined) {
    if (prevSpo2 - spo2 > 15 && !payload.haemoptysis && !payload.temperature_f) fiScore -= 25;
  }
  fiScore = Math.max(fiScore, 0);
  const isOutlier = fiScore < 30;

  // Persist DQI + FI flags
  await admin.from("daily_logs").update({ dqi_score: dqiScore, fi_score: fiScore, is_outlier_suppressed: isOutlier }).eq("id", logId);

  const logForScoring = mapPayloadToDailyLogInput(payload, diseaseSpecificFields);

  let scoringResult: ScoringEngineResult;
  let alertResult: AlertEngineResultLocal;
  let scoringError: string | null = null;

  try {
    const scoreRaw = computeRedFlagScore(logForScoring, baseline);
    scoringResult = {
      global_score: scoreRaw.global_score,
      risk_level: scoreRaw.risk_level,
      indicator_color: scoreRaw.indicator_color,
      score_breakdown: scoreRaw.score_breakdown,
      auto_triggered: scoreRaw.auto_triggered,
      auto_trigger_reason: scoreRaw.auto_trigger_reason,
    };

    const alertRaw = runAlertEngine(logForScoring, previousLogs, baseline);
    alertResult = {
      alert_type: alertRaw.alert_type,
      reason_text: alertRaw.reason_text,
      triggering_metrics: alertRaw.triggering_metrics,
      suppression_key: alertRaw.suppression_key,
    };
    if (
      baseline.effective_dashboard === "ild" ||
      baseline.effective_dashboard === "asthma" ||
      baseline.effective_dashboard === "copd" ||
      baseline.effective_dashboard === "bronchiectasis" ||
      baseline.effective_dashboard === "post_icu"
    ) {
      scoringResult = scoreFromAlert(alertResult);
    }
  } catch (e) {
    scoringError = e instanceof Error ? e.message : "Unknown error";
    scoringResult = { global_score: 1, risk_level: "low", indicator_color: "green", score_breakdown: [], auto_triggered: false, auto_trigger_reason: null };
    alertResult = { alert_type: "green", reason_text: "Scoring engine error", triggering_metrics: {}, suppression_key: "error" };
  }

  // Persist score
  const scoreInsert = {
    id: crypto.randomUUID(),
    patient_id: payload.patient_id,
    log_id: logId,
    global_score: scoringResult.global_score,
    risk_level: scoringResult.risk_level,
    indicator_color: scoringResult.indicator_color,
    score_breakdown: scoringResult.score_breakdown as unknown as Json,
    computed_at: new Date().toISOString(),
  } as unknown as Database["public"]["Tables"]["red_flag_scores"]["Insert"];

  await admin.from("red_flag_scores").insert(scoreInsert);

  // Persist alert if not green
  if (alertResult.alert_type !== "green") {
    const storedAlertType = alertResult.alert_type.toUpperCase();
    // Suppression windows per spec: RED = 72h, YELLOW = 48h
    const suppressionHours = alertResult.alert_type === "red" ? 72 : 48;
    const suppressionCutoff = new Date(Date.now() - suppressionHours * 60 * 60 * 1000).toISOString();

    const { data: recentAlerts } = await admin
      .from("disease_alerts")
      .select("id, triggering_metrics, is_suppressed")
      .eq("patient_id", payload.patient_id)
      .eq("alert_type", storedAlertType)
      .gte("created_at", suppressionCutoff)
      .eq("is_suppressed", false);

    // Suppression windows: YELLOW repeats suppress, RED repeats only notify
    // when the current trigger is worse than recent RED alerts.
    const currentSeverity =
      typeof alertResult.triggering_metrics.severity_rank === "number"
        ? alertResult.triggering_metrics.severity_rank
        : 0;
    const alreadySuppressed = (recentAlerts ?? []).some((alert) => {
      if (alertResult.alert_type === "yellow") {
        return true;
      }

      const metrics = isRecord(alert.triggering_metrics) ? alert.triggering_metrics : {};
      const previousSeverity =
        typeof metrics.severity_rank === "number" ? metrics.severity_rank : 0;
      return previousSeverity >= currentSeverity;
    });

    if (!alreadySuppressed) {
      await admin.from("disease_alerts").insert({
        id: crypto.randomUUID(),
        patient_id: payload.patient_id,
        log_id: logId,
        score_id: scoreInsert.id,
        alert_type: storedAlertType,
        reason_text: alertResult.reason_text,
        triggering_metrics: {
          ...alertResult.triggering_metrics,
          suppression_key: alertResult.suppression_key,
        } as unknown as Json,
        acknowledged_by_doctor: false,
        created_at: new Date().toISOString(),
        is_suppressed: false,
      } as unknown as Database["public"]["Tables"]["disease_alerts"]["Insert"]);
    }
  }

  if (scoringError) {
    return NextResponse.json({ log_id: logId, score: scoringResult, alert: alertResult, warning: `Scoring engine error: ${scoringError}` }, { status: 207 });
  }

  return NextResponse.json({ log_id: logId, score: scoringResult, alert: alertResult, dqi_score: dqiScore, fi_score: fiScore, is_outlier: isOutlier });
}
