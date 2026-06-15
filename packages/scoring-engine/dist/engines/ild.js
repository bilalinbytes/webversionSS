import { buildAlert, getIldData, getSymptomValue, hasConsecutiveDayMatch, numberDropFromBaseline, numberIncreaseFromBaseline, oxygenIncreaseFromBaseline, } from "../utils/baseline";
const RED_SEVERITY = {
    immediate: 100,
    highReliability: 90,
    sustained: 80,
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
        .join("; ");
}
export function runIldAlertEngine(log, previousLogs, baseline) {
    const ild = getIldData(log);
    if (log.haemoptysis === true) {
        return buildAlert("red", "Hemoptysis reported.", metricWithSeverity({ haemoptysis: true }, RED_SEVERITY.immediate), "ild-red-haemoptysis");
    }
    const chestPain = getSymptomValue(log, "chest_pain");
    if (typeof chestPain === "number" && chestPain >= 8) {
        return buildAlert("red", "Severe chest pain VAS >=8/10.", metricWithSeverity({ chest_pain_vas: chestPain }, RED_SEVERITY.immediate), "ild-red-chest-pain");
    }
    if (typeof log.spo2_rest === "number" && log.spo2_rest <= 80) {
        return buildAlert("red", "Resting SpO2 <=80%.", metricWithSeverity({ spo2_rest: log.spo2_rest }, RED_SEVERITY.immediate), "ild-red-spo2-immediate");
    }
    if (typeof log.heart_rate === "number" && log.heart_rate >= 160) {
        return buildAlert("red", "Heart rate >=160 bpm.", metricWithSeverity({ heart_rate: log.heart_rate }, RED_SEVERITY.immediate), "ild-red-heart-rate");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => typeof entry.spo2_rest === "number" && entry.spo2_rest <= 85)) {
        return buildAlert("red", "Resting SpO2 <=85% for 2 consecutive days.", metricWithSeverity({
            spo2_rest_today: log.spo2_rest,
            spo2_rest_yesterday: previousLogs[0]?.spo2_rest ?? null,
        }, RED_SEVERITY.sustained), "ild-red-spo2-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const drop = numberDropFromBaseline(entry.spo2_rest, baseline.baseline_spo2);
        return typeof drop === "number" && drop >= 6;
    })) {
        return buildAlert("red", "SpO2 dropped >=6% from baseline for 2 consecutive days.", metricWithSeverity({
            baseline_spo2: baseline.baseline_spo2,
            spo2_rest_today: log.spo2_rest,
        }, RED_SEVERITY.sustained), "ild-red-spo2-drop-2d");
    }
    const exertionalBaseline = baseline.baseline_exertional_spo2 ?? baseline.baseline_spo2;
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const drop = numberDropFromBaseline(entry.spo2_exertion, exertionalBaseline);
        return typeof drop === "number" && drop >= 10;
    })) {
        return buildAlert("red", "Exertional SpO2 dropped >=10% from baseline for 2 consecutive days.", metricWithSeverity({
            baseline_exertional_spo2: exertionalBaseline,
            spo2_exertion_today: log.spo2_exertion,
        }, RED_SEVERITY.sustained), "ild-red-exertional-drop-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const increase = numberIncreaseFromBaseline(entry.mmrc_today, baseline.baseline_mmrc);
        return typeof increase === "number" && increase >= 2;
    })) {
        return buildAlert("red", "mMRC increased by >=2 grades for 2 consecutive days.", metricWithSeverity({
            baseline_mmrc: baseline.baseline_mmrc,
            mmrc_today: log.mmrc_today,
        }, RED_SEVERITY.sustained), "ild-red-mmrc-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const cough = getSymptomValue(entry, "cough");
        const coughIncrease = numberIncreaseFromBaseline(cough, baseline.baseline_cough_vas);
        return (typeof entry.temperature_f === "number" &&
            entry.temperature_f >= 100.4 &&
            typeof cough === "number" &&
            cough >= 8 &&
            typeof coughIncrease === "number" &&
            coughIncrease >= 3);
    })) {
        return buildAlert("red", "Fever with severe worsening cough for 2 consecutive days.", metricWithSeverity({
            temperature_f_today: log.temperature_f,
            cough_vas_today: getSymptomValue(log, "cough"),
            baseline_cough_vas: baseline.baseline_cough_vas ?? null,
        }, RED_SEVERITY.sustained), "ild-red-fever-cough-2d");
    }
    const oxygenIncrease = oxygenIncreaseFromBaseline(log, baseline);
    if (typeof oxygenIncrease === "number" && oxygenIncrease >= 3) {
        return buildAlert("red", "Oxygen requirement increased by >=3 L/min.", metricWithSeverity({
            oxygen_requirement_litres: log.oxygen_requirement_litres,
            baseline_oxygen_litres: baseline.baseline_oxygen_litres,
            oxygen_increase_litres: oxygenIncrease,
        }, RED_SEVERITY.highReliability), "ild-red-oxygen-increase");
    }
    const yellowReasons = [];
    let yellowScore = 0;
    const spo2Drop = numberDropFromBaseline(log.spo2_rest, baseline.baseline_spo2);
    if (typeof log.spo2_rest === "number" &&
        log.spo2_rest >= 89 &&
        log.spo2_rest <= 91 &&
        typeof spo2Drop === "number" &&
        spo2Drop >= 2 &&
        spo2Drop <= 3) {
        yellowScore += 1;
        yellowReasons.push({
            label: "Resting SpO2 89-91% with 2-3% baseline drop",
            points: 1,
        });
    }
    const mmrcIncrease = numberIncreaseFromBaseline(log.mmrc_today, baseline.baseline_mmrc);
    if (typeof mmrcIncrease === "number" && mmrcIncrease >= 2) {
        yellowScore += 1;
        yellowReasons.push({ label: "mMRC increased by >=2 grades", points: 1 });
    }
    const moderateSymptoms = ["breathlessness", "cough", "fatigue"].some((key) => {
        const value = getSymptomValue(log, key);
        return typeof value === "number" && value >= 5 && value <= 7;
    });
    if (moderateSymptoms) {
        yellowScore += 1;
        yellowReasons.push({ label: "Moderate symptom VAS 5-7/10", points: 1 });
    }
    const previousIld = previousLogs[0] ? getIldData(previousLogs[0]) : null;
    const previousKbild = typeof ild.kbild_previous === "number"
        ? ild.kbild_previous
        : previousIld?.kbild_score ?? null;
    if (typeof ild.kbild_score === "number" &&
        typeof previousKbild === "number" &&
        previousKbild > 0) {
        const delta = ((previousKbild - ild.kbild_score) / previousKbild) * 100;
        if (delta >= 10) {
            yellowScore += 1;
            yellowReasons.push({ label: "K-BILD dropped by at least 10% vs last entry", points: 1 });
        }
    }
    if (ild.antifibrotic_taken === false) {
        yellowScore += 1;
        yellowReasons.push({ label: "Antifibrotic medication was missed", points: 1 });
    }
    if (ild.rash === true || ild.diarrhoea === true) {
        yellowScore += 1;
        yellowReasons.push({ label: "New rash or diarrhoea reported", points: 1 });
    }
    if (yellowScore >= 3) {
        return buildAlert("yellow", `Review suggested: ${getTopTwoReasons(yellowReasons)}.`, {
            yellow_score: yellowScore,
            reasons: yellowReasons,
        }, "ild-yellow-score");
    }
    return buildAlert("green", "Stable compared to baseline.", {
        yellow_score: yellowScore,
        spo2_rest: log.spo2_rest,
        baseline_spo2: baseline.baseline_spo2,
    }, "ild-green-stable");
}
