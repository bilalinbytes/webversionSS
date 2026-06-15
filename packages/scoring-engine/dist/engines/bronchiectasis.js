import { buildAlert, getBronchiectasisData, getSymptomValue, hasConsecutiveDayMatch, hasThreeDayMatch, numberDropFromBaseline, numberIncreaseFromBaseline, oxygenIncreaseFromBaseline, } from "../utils/baseline";
const RED_SEVERITY = {
    immediate: 100,
    systemic: 90,
    respiratory: 85,
    persistentSputum: 80,
};
function metricWithSeverity(metrics, severityRank) {
    return {
        ...metrics,
        severity_rank: severityRank,
    };
}
function getTopTwoReasons(reasons) {
    return reasons
        .sort((left, right) => right.points - left.points)
        .slice(0, 2)
        .map((reason) => reason.label)
        .join(" and ");
}
export function runBronchiectasisAlertEngine(log, previousLogs, baseline) {
    const bronch = getBronchiectasisData(log);
    if (bronch.haemoptysis_volume === "glass" || bronch.haemoptysis_volume === "massive") {
        return buildAlert("red", "Action recommended: hemoptysis volume reached at least one glass today.", metricWithSeverity({ haemoptysis_volume: bronch.haemoptysis_volume }, RED_SEVERITY.immediate), "bronch-red-haemoptysis-glass");
    }
    const chestPain = getSymptomValue(log, "chest_pain");
    if (typeof chestPain === "number" && chestPain >= 8) {
        return buildAlert("red", "Action recommended: severe chest pain VAS >=8/10.", metricWithSeverity({ chest_pain_vas: chestPain }, RED_SEVERITY.immediate), "bronch-red-chest-pain");
    }
    if (typeof log.spo2_rest === "number" && log.spo2_rest <= 80) {
        return buildAlert("red", "Action recommended: resting SpO2 <=80%.", metricWithSeverity({ spo2_rest: log.spo2_rest }, RED_SEVERITY.immediate), "bronch-red-spo2-immediate");
    }
    // Hard rule: single-day sputum colour or volume change NEVER triggers RED.
    const persistentDarkGreenSputum = hasThreeDayMatch(log, previousLogs, (entry) => {
        const data = getBronchiectasisData(entry);
        return (data.sputum_colour === "dark_green" &&
            data.sputum_volume === "much_more_than_usual");
    });
    if (persistentDarkGreenSputum) {
        return buildAlert("red", "Action recommended: dark green sputum with one cup or more volume for 3 consecutive days, suggestive of infection.", metricWithSeverity({
            sputum_colour: bronch.sputum_colour,
            sputum_volume: bronch.sputum_volume,
        }, RED_SEVERITY.persistentSputum), "bronch-red-sputum-3d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        return typeof entry.temperature_f === "number" && entry.temperature_f >= 102;
    })) {
        return buildAlert("red", "Action recommended: temperature >=102F for 2 consecutive days.", metricWithSeverity({
            temperature_f_today: log.temperature_f,
            temperature_f_yesterday: previousLogs[0]?.temperature_f ?? null,
        }, RED_SEVERITY.systemic), "bronch-red-fever-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const data = getBronchiectasisData(entry);
        return (typeof entry.temperature_f === "number" &&
            entry.temperature_f >= 100.4 &&
            data.malaise === true);
    })) {
        return buildAlert("red", "Action recommended: fever with severe malaise for 2 consecutive days.", metricWithSeverity({
            temperature_f_today: log.temperature_f,
            malaise_today: bronch.malaise,
        }, RED_SEVERITY.systemic), "bronch-red-fever-malaise-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => typeof entry.spo2_rest === "number" && entry.spo2_rest <= 85)) {
        return buildAlert("red", "Action recommended: resting SpO2 <=85% for 2 consecutive days with respiratory deterioration.", metricWithSeverity({
            spo2_rest_today: log.spo2_rest,
            spo2_rest_yesterday: previousLogs[0]?.spo2_rest ?? null,
        }, RED_SEVERITY.respiratory), "bronch-red-spo2-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const drop = numberDropFromBaseline(entry.spo2_rest, baseline.baseline_spo2);
        return typeof drop === "number" && drop >= 6;
    })) {
        return buildAlert("red", "Action recommended: SpO2 dropped >=6% from baseline for 2 consecutive days.", metricWithSeverity({
            baseline_spo2: baseline.baseline_spo2,
            spo2_rest_today: log.spo2_rest,
        }, RED_SEVERITY.respiratory), "bronch-red-spo2-drop-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const increase = oxygenIncreaseFromBaseline(entry, baseline);
        return typeof increase === "number" && increase >= 3;
    })) {
        return buildAlert("red", "Action recommended: oxygen requirement increased by >=3 L/min for 2 consecutive days.", metricWithSeverity({
            oxygen_requirement_litres: log.oxygen_requirement_litres,
            baseline_oxygen_litres: baseline.baseline_oxygen_litres,
        }, RED_SEVERITY.respiratory), "bronch-red-oxygen-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const increase = numberIncreaseFromBaseline(entry.mmrc_today, baseline.baseline_mmrc);
        return typeof increase === "number" && increase >= 2;
    })) {
        return buildAlert("red", "Action recommended: mMRC increased by >=2 grades for 2 consecutive days.", metricWithSeverity({
            mmrc_today: log.mmrc_today,
            mmrc_yesterday: previousLogs[0]?.mmrc_today ?? null,
        }, RED_SEVERITY.respiratory), "bronch-red-mmrc-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const data = getBronchiectasisData(entry);
        return data.pedal_oedema === true;
    })) {
        return buildAlert("red", "Action recommended: pedal edema present for 2 consecutive days.", metricWithSeverity({ pedal_oedema: bronch.pedal_oedema }, RED_SEVERITY.respiratory), "bronch-red-oedema-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const data = getBronchiectasisData(entry);
        const symptomWorsening = [
            getSymptomValue(entry, "breathlessness"),
            getSymptomValue(entry, "cough"),
            getSymptomValue(entry, "fatigue"),
        ].some((value) => typeof value === "number" && value >= 5);
        return data.wheezing === true && symptomWorsening;
    })) {
        return buildAlert("red", "Action recommended: wheezing with symptom worsening persisted for two consecutive days.", metricWithSeverity({
            wheezing_today: bronch.wheezing,
            symptom_vas_today: log.vas_symptoms,
        }, RED_SEVERITY.respiratory), "bronch-red-wheeze-worsening-2d");
    }
    const yellowReasons = [];
    let yellowScore = 0;
    if (bronch.sputum_colour === "pale_yellow" ||
        bronch.sputum_colour === "light_green") {
        yellowScore += 2;
        yellowReasons.push({
            label: "Pale yellow or light green sputum is present",
            points: 2,
        });
    }
    if (bronch.sputum_volume === "more_than_usual") {
        yellowScore += 1;
        yellowReasons.push({ label: "Sputum volume is more than usual", points: 1 });
    }
    if (bronch.malaise === true) {
        yellowScore += 1;
        yellowReasons.push({ label: "Malaise is present", points: 1 });
    }
    if (typeof log.temperature_f === "number" &&
        log.temperature_f >= 100.4 &&
        log.temperature_f <= 101.9) {
        yellowScore += 2;
        yellowReasons.push({ label: "Low-grade fever is present", points: 2 });
    }
    if (bronch.wheezing === true) {
        yellowScore += 1;
        yellowReasons.push({ label: "Wheezing is present", points: 1 });
    }
    const mmrcIncrease = numberIncreaseFromBaseline(log.mmrc_today, baseline.baseline_mmrc);
    if (typeof mmrcIncrease === "number" && mmrcIncrease >= 2) {
        yellowScore += 1;
        yellowReasons.push({ label: "mMRC increased by 2 grades", points: 1 });
    }
    if (typeof log.spo2_rest === "number" &&
        log.spo2_rest >= 89 &&
        log.spo2_rest <= 91) {
        yellowScore += 1;
        yellowReasons.push({ label: "Resting SpO2 is 89-91%", points: 1 });
    }
    if (bronch.pedal_oedema === true) {
        yellowScore += 1;
        yellowReasons.push({ label: "Pedal oedema is present", points: 1 });
    }
    if (yellowScore >= 4) {
        return buildAlert("yellow", `Review suggested: ${getTopTwoReasons(yellowReasons)}.`, {
            yellow_score: yellowScore,
            reasons: yellowReasons,
        }, "bronch-yellow-score");
    }
    return buildAlert("green", "Stable. Continue airway clearance and maintenance therapy.", {
        yellow_score: yellowScore,
        persistent_sputum_rule_met: persistentDarkGreenSputum,
    }, "bronch-green-stable");
}
