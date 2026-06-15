import { buildBreakdownItem, getAsthmaData, getBronchiectasisData, getCopdData, getIldData, getRiskBand, getSymptomValue, hasMissedMedication, numberDropFromBaseline, numberIncreaseFromBaseline, } from "./utils/baseline";
export function computeRedFlagScore(log, baseline) {
    const immediateAutoTrigger = getImmediateAutoTrigger(log);
    if (immediateAutoTrigger) {
        return createAutoTriggeredResult(10, immediateAutoTrigger);
    }
    const diseaseAutoTrigger = getDiseaseAutoTrigger(log, baseline);
    if (diseaseAutoTrigger) {
        return createAutoTriggeredResult(diseaseAutoTrigger.score, diseaseAutoTrigger.reason);
    }
    const breakdown = [];
    let commonPoints = 0;
    let diseaseSpecificPoints = 0;
    if (typeof log.spo2_rest === "number" &&
        log.spo2_rest >= 89 &&
        log.spo2_rest <= 91) {
        commonPoints += 4;
        breakdown.push(buildBreakdownItem("SpO2 89-91%", 4));
    }
    else if (typeof log.spo2_rest === "number" && log.spo2_rest <= 88) {
        commonPoints += 6;
        breakdown.push(buildBreakdownItem("SpO2 88% or lower", 6));
    }
    const mmrcIncrease = numberIncreaseFromBaseline(log.mmrc_today, baseline.baseline_mmrc);
    if (typeof mmrcIncrease === "number" && mmrcIncrease >= 1) {
        commonPoints += 2;
        breakdown.push(buildBreakdownItem("mMRC increased by at least 1 grade", 2));
    }
    if (typeof log.aqi_value === "number" && log.aqi_value > 200) {
        commonPoints += 1;
        breakdown.push(buildBreakdownItem("AQI above 200", 1));
    }
    if (hasMissedMedication(log.medication_compliance)) {
        commonPoints += 1;
        breakdown.push(buildBreakdownItem("Missed maintenance medication", 1));
    }
    const hasHighNewSymptom = [
        getSymptomValue(log, "breathlessness"),
        getSymptomValue(log, "cough"),
        getSymptomValue(log, "wheeze"),
        getSymptomValue(log, "fatigue"),
        getSymptomValue(log, "chest_pain"),
        getSymptomValue(log, "chest_heaviness"),
    ].some((value) => typeof value === "number" && value > 7);
    if (hasHighNewSymptom) {
        commonPoints += 2;
        breakdown.push(buildBreakdownItem("New symptom VAS above 7", 2));
    }
    if (baseline.effective_dashboard === "asthma") {
        const asthma = getAsthmaData(log);
        if (asthma.night_waking === true) {
            diseaseSpecificPoints += 3;
            breakdown.push(buildBreakdownItem("Night waking present", 3));
        }
        if (typeof asthma.rescue_inhaler_puffs === "number" &&
            asthma.rescue_inhaler_puffs > 4) {
            diseaseSpecificPoints += 3;
            breakdown.push(buildBreakdownItem("Rescue inhaler above 4 puffs", 3));
        }
    }
    if (baseline.effective_dashboard === "copd") {
        const copd = getCopdData(log);
        if (copd.sputum_volume === "large_amount") {
            diseaseSpecificPoints += 2;
            breakdown.push(buildBreakdownItem("Sputum volume much more than usual", 2));
        }
        const chestHeaviness = getSymptomValue(log, "chest_heaviness");
        if (typeof chestHeaviness === "number" && chestHeaviness > 7) {
            diseaseSpecificPoints += 2;
            breakdown.push(buildBreakdownItem("Chest heaviness VAS above 7", 2));
        }
        if (typeof log.temperature_f === "number" && log.temperature_f > 100.4) {
            diseaseSpecificPoints += 3;
            breakdown.push(buildBreakdownItem("Fever above 100.4F", 3));
        }
    }
    if (baseline.effective_dashboard === "bronchiectasis") {
        const bronch = getBronchiectasisData(log);
        if (bronch.sputum_colour === "dark_green") {
            diseaseSpecificPoints += 4;
            breakdown.push(buildBreakdownItem("Dark green sputum", 4));
        }
        if (bronch.malaise === true) {
            diseaseSpecificPoints += 2;
            breakdown.push(buildBreakdownItem("Severe malaise", 2));
        }
    }
    if (baseline.effective_dashboard === "ild") {
        const ild = getIldData(log);
        const coughValue = getSymptomValue(log, "cough");
        const priorCoughValue = ild.cough_vas_previous ?? baseline.baseline_cough_vas;
        const coughIncrease = numberIncreaseFromBaseline(coughValue, priorCoughValue);
        if (typeof coughIncrease === "number" && coughIncrease >= 3) {
            diseaseSpecificPoints += 3;
            breakdown.push(buildBreakdownItem("Sudden cough increase", 3));
        }
        if (typeof log.mmrc_today === "number" && log.mmrc_today >= 4) {
            diseaseSpecificPoints += 4;
            breakdown.push(buildBreakdownItem("Unable to walk across room (mMRC >= 4)", 4));
        }
        const spo2Drop = numberDropFromBaseline(log.spo2_rest, baseline.baseline_spo2);
        if (typeof spo2Drop === "number" && spo2Drop > 3) {
            diseaseSpecificPoints += 3;
            breakdown.push(buildBreakdownItem("SpO2 dropped more than 3% from baseline", 3));
        }
    }
    const global_score = Math.min(1 + commonPoints + diseaseSpecificPoints, 10);
    const riskBand = getRiskBand(global_score);
    return {
        global_score,
        risk_level: riskBand.risk_level,
        indicator_color: riskBand.indicator_color,
        score_breakdown: breakdown,
        auto_triggered: false,
        auto_trigger_reason: null,
    };
}
function getImmediateAutoTrigger(log) {
    if (typeof log.spo2_rest === "number" && log.spo2_rest < 85) {
        return "SpO2 below 85% triggered an automatic critical score.";
    }
    if (log.haemoptysis === true) {
        return "Haemoptysis triggered an automatic critical score.";
    }
    if (typeof log.respiratory_rate === "number" && log.respiratory_rate > 30) {
        return "Respiratory rate above 30 triggered an automatic critical score.";
    }
    return null;
}
function getDiseaseAutoTrigger(log, baseline) {
    if (baseline.effective_dashboard !== "asthma") {
        return null;
    }
    const asthma = getAsthmaData(log);
    if (typeof asthma.pefr_lpm === "number" &&
        typeof asthma.pefr_personal_best === "number" &&
        asthma.pefr_personal_best > 0 &&
        asthma.pefr_lpm / asthma.pefr_personal_best < 0.6) {
        return {
            score: 9,
            reason: "PEFR below 60% of personal best triggered an automatic score of 9.",
        };
    }
    return null;
}
function createAutoTriggeredResult(score, reason) {
    const riskBand = getRiskBand(score);
    return {
        global_score: score,
        risk_level: riskBand.risk_level,
        indicator_color: riskBand.indicator_color,
        score_breakdown: [buildBreakdownItem(reason, score)],
        auto_triggered: true,
        auto_trigger_reason: reason,
    };
}
