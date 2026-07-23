export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type IndicatorColor = "green" | "yellow" | "orange" | "red";
export type AlertType = "red" | "yellow" | "green";
export type EffectiveDashboard = "asthma" | "copd" | "ild" | "bronchiectasis" | "post_icu";
export type PrimaryDiagnosis = "asthma" | "copd" | "ild" | "bronchiectasis" | "post_icu";
export type SymptomKey = "breathlessness" | "cough" | "wheeze" | "fatigue" | "chest_pain" | "chest_heaviness";
export type AsthmaControlClassification = "well_controlled" | "partly_controlled" | "poorly_controlled";
export type AsthmaDiseaseSpecificData = {
    rescue_inhaler_puffs: number | null;
    night_waking: boolean | null;
    pefr_lpm: number | null;
    pefr_personal_best: number | null;
    controller_taken: boolean | null;
    asthma_control_responses: boolean[] | null;
    asthma_control_yes_count?: number | null;
    asthma_control_status?: AsthmaControlClassification | null;
};
export type CopdDiseaseSpecificData = {
    sputum_colour: "clear" | "white" | "yellow" | "green" | null;
    sputum_volume: "none" | "less_than_usual" | "usual" | "large_amount" | null;
    energy_level: number | null;
    sleep_disturbed: boolean | null;
    wheezing: boolean | null;
    step_count_today: number | null;
    haemoptysis_volume?: "none" | "streaks" | "cup" | "massive" | null;
    exercise_tolerance_good?: boolean | null;
};
export type BronchiectasisDiseaseSpecificData = {
    sputum_colour: "clear" | "pale_yellow" | "yellow" | "light_green" | "dark_green" | null;
    sputum_volume: "none" | "less_than_usual" | "usual" | "more_than_usual" | "much_more_than_usual" | null;
    malaise: boolean | null;
    pedal_oedema: boolean | null;
    wheezing: boolean | null;
    haemoptysis_volume?: "none" | "streaks" | "glass" | "massive" | null;
};
export type IldDiseaseSpecificData = {
    kbild_score: number | null;
    kbild_previous: number | null;
    antifibrotic_taken: boolean | null;
    rash: boolean | null;
    diarrhoea: boolean | null;
    cough_vas_previous?: number | null;
};
export type DiseaseSpecificData = AsthmaDiseaseSpecificData | CopdDiseaseSpecificData | BronchiectasisDiseaseSpecificData | IldDiseaseSpecificData;
export type DailyLogInput = {
    patient_id: string;
    log_date: string;
    spo2_rest: number | null;
    spo2_exertion: number | null;
    mmrc_today: number | null;
    aqi_value: number | null;
    medication_compliance: Record<string, boolean> | null;
    vas_symptoms: Partial<Record<SymptomKey, number>> | null;
    disease_specific_data: DiseaseSpecificData | Record<string, unknown> | null;
    temperature_f: number | null;
    haemoptysis: boolean | null;
    heart_rate?: number | null;
    respiratory_rate: number | null;
    pedal_oedema: boolean | null;
    oxygen_requirement_litres: number | null;
    side_effects?: Record<string, unknown> | string[] | null;
    step_count_today?: number | null;
};
export type PreviousLog = DailyLogInput;
export type PatientBaseline = {
    baseline_spo2: number | null;
    baseline_mmrc: number | null;
    baseline_oxygen_litres: number | null;
    primary_diagnosis: PrimaryDiagnosis;
    effective_dashboard: EffectiveDashboard;
    baseline_cough_vas?: number | null;
    baseline_exertional_spo2?: number | null;
};
export type ScoreBreakdownItem = {
    factor: string;
    points: number;
    triggered: boolean;
};
export type RedFlagScoreResult = {
    global_score: number;
    risk_level: RiskLevel;
    indicator_color: IndicatorColor;
    score_breakdown: ScoreBreakdownItem[];
    auto_triggered: boolean;
    auto_trigger_reason: string | null;
};
export type AlertEngineResult = {
    alert_type: AlertType;
    reason_text: string;
    triggering_metrics: Record<string, unknown>;
    suppression_key: string;
};
//# sourceMappingURL=types.d.ts.map