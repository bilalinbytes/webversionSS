export function getSymptomValue(log, key) {
    const value = log.vas_symptoms?.[key];
    return typeof value === "number" ? value : null;
}
export function hasMissedMedication(compliance) {
    if (!compliance) {
        return false;
    }
    return Object.values(compliance).some((taken) => taken === false);
}
export function numberDropFromBaseline(value, baseline) {
    if (typeof value !== "number" || typeof baseline !== "number") {
        return null;
    }
    return baseline - value;
}
export function numberIncreaseFromBaseline(value, baseline) {
    if (typeof value !== "number" || typeof baseline !== "number") {
        return null;
    }
    return value - baseline;
}
export function oxygenIncreaseFromBaseline(log, baseline) {
    return numberIncreaseFromBaseline(log.oxygen_requirement_litres, baseline.baseline_oxygen_litres);
}
export function classifyAsthmaControl(responses) {
    const positives = responses?.filter(Boolean).length ?? 0;
    if (positives === 0) {
        return "well_controlled";
    }
    if (positives <= 2) {
        return "partly_controlled";
    }
    return "poorly_controlled";
}
export function getAsthmaData(log) {
    const data = log.disease_specific_data;
    const record = isRecord(data) ? data : {};
    return {
        rescue_inhaler_puffs: getNullableNumber(record, "rescue_inhaler_puffs"),
        night_waking: getNullableBoolean(record, "night_waking"),
        pefr_lpm: getNullableNumber(record, "pefr_lpm"),
        pefr_personal_best: getNullableNumber(record, "pefr_personal_best"),
        controller_taken: getNullableBoolean(record, "controller_taken"),
        asthma_control_responses: getNullableBooleanArray(record, "asthma_control_responses"),
        asthma_control_yes_count: getNullableNumber(record, "asthma_control_yes_count"),
        asthma_control_status: getNullableEnum(record, "asthma_control_status", [
            "well_controlled",
            "partly_controlled",
            "poorly_controlled",
        ]),
    };
}
export function getCopdData(log) {
    const data = log.disease_specific_data;
    const record = isRecord(data) ? data : {};
    return {
        sputum_colour: getNullableEnum(record, "sputum_colour", [
            "clear",
            "white",
            "yellow",
            "green",
        ]),
        sputum_volume: getNullableEnum(record, "sputum_volume", [
            "none",
            "less_than_usual",
            "usual",
            "large_amount",
        ]),
        energy_level: getNullableNumber(record, "energy_level"),
        sleep_disturbed: getNullableBoolean(record, "sleep_disturbed"),
        wheezing: getNullableBoolean(record, "wheezing"),
        step_count_today: getNullableNumber(record, "step_count_today"),
        haemoptysis_volume: getNullableEnum(record, "haemoptysis_volume", [
            "none",
            "streaks",
            "cup",
            "massive",
        ]),
        exercise_tolerance_good: getNullableBoolean(record, "exercise_tolerance_good"),
    };
}
export function getBronchiectasisData(log) {
    const data = log.disease_specific_data;
    const record = isRecord(data) ? data : {};
    return {
        sputum_colour: getNullableEnum(record, "sputum_colour", [
            "clear",
            "pale_yellow",
            "yellow",
            "light_green",
            "dark_green",
        ]),
        sputum_volume: getNullableEnum(record, "sputum_volume", [
            "none",
            "less_than_usual",
            "usual",
            "more_than_usual",
            "much_more_than_usual",
        ]),
        malaise: getNullableBoolean(record, "malaise"),
        pedal_oedema: getNullableBoolean(record, "pedal_oedema") ?? log.pedal_oedema ?? null,
        wheezing: getNullableBoolean(record, "wheezing"),
        haemoptysis_volume: getNullableEnum(record, "haemoptysis_volume", [
            "none",
            "streaks",
            "glass",
            "massive",
        ]),
    };
}
export function getIldData(log) {
    const data = log.disease_specific_data;
    const record = isRecord(data) ? data : {};
    return {
        kbild_score: getNullableNumber(record, "kbild_score"),
        kbild_previous: getNullableNumber(record, "kbild_previous"),
        antifibrotic_taken: getNullableBoolean(record, "antifibrotic_taken"),
        rash: getNullableBoolean(record, "rash"),
        diarrhoea: getNullableBoolean(record, "diarrhoea"),
        cough_vas_previous: getNullableNumber(record, "cough_vas_previous"),
    };
}
export function getRiskBand(score) {
    if (score >= 9) {
        return { risk_level: "critical", indicator_color: "red" };
    }
    if (score >= 7) {
        return { risk_level: "high", indicator_color: "orange" };
    }
    if (score >= 4) {
        return { risk_level: "moderate", indicator_color: "yellow" };
    }
    return { risk_level: "low", indicator_color: "green" };
}
export function hasConsecutiveDayMatch(today, previousLogs, predicate) {
    const yesterday = previousLogs[0];
    if (!yesterday) {
        return false;
    }
    return predicate(today) && predicate(yesterday);
}
export function hasThreeDayMatch(today, previousLogs, predicate) {
    const yesterday = previousLogs[0];
    const dayBefore = previousLogs[1];
    if (!yesterday || !dayBefore) {
        return false;
    }
    return predicate(today) && predicate(yesterday) && predicate(dayBefore);
}
export function buildAlert(alert_type, reason_text, triggering_metrics, suppression_key) {
    const trimmed = reason_text.trim();
    if (trimmed.length === 0) {
        throw new Error("Alert engine produced an empty reason_text.");
    }
    return {
        alert_type,
        reason_text: trimmed,
        triggering_metrics,
        suppression_key,
    };
}
export function buildBreakdownItem(factor, points) {
    return {
        factor,
        points,
        triggered: true,
    };
}
export function getTopReasons(reasons) {
    return reasons
        .sort((left, right) => right.points - left.points)
        .slice(0, 3)
        .map((reason) => reason.label)
        .join("; ");
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function getNullableNumber(record, key) {
    const value = record[key];
    return typeof value === "number" ? value : null;
}
function getNullableBoolean(record, key) {
    const value = record[key];
    return typeof value === "boolean" ? value : null;
}
function getNullableBooleanArray(record, key) {
    const value = record[key];
    if (!Array.isArray(value)) {
        return null;
    }
    if (!value.every((entry) => typeof entry === "boolean")) {
        return null;
    }
    return value;
}
function getNullableEnum(record, key, values) {
    const value = record[key];
    if (typeof value !== "string") {
        return null;
    }
    return values.includes(value) ? value : null;
}
