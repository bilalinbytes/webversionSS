import { buildAlert, getCopdData, getSymptomValue, hasConsecutiveDayMatch, numberDropFromBaseline, numberIncreaseFromBaseline, oxygenIncreaseFromBaseline, } from "../utils/baseline";
const RED_SEVERITY = {
    immediate: 100,
    exacerbation: 95,
    oxygenIncrease: 90,
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
        .join(" and ");
}
export function runCopdAlertEngine(log, previousLogs, baseline) {
    const copd = getCopdData(log);
    if (copd.haemoptysis_volume === "cup" || copd.haemoptysis_volume === "massive") {
        return buildAlert("red", "Action recommended: hemoptysis volume reached at least one cup today.", metricWithSeverity({ haemoptysis_volume: copd.haemoptysis_volume }, RED_SEVERITY.immediate), "copd-red-haemoptysis-cup");
    }
    const chestPain = getSymptomValue(log, "chest_pain");
    if (typeof chestPain === "number" && chestPain >= 8) {
        return buildAlert("red", "Action recommended: severe chest pain VAS >=8/10.", metricWithSeverity({ chest_pain_vas: chestPain }, RED_SEVERITY.immediate), "copd-red-chest-pain");
    }
    if (typeof log.spo2_rest === "number" && log.spo2_rest <= 80) {
        return buildAlert("red", "Action recommended: resting SpO2 <=80%.", metricWithSeverity({ spo2_rest: log.spo2_rest }, RED_SEVERITY.immediate), "copd-red-spo2-immediate");
    }
    const hasPurulentLargePattern = (copd.sputum_colour === "yellow" || copd.sputum_colour === "green") &&
        copd.sputum_volume === "large_amount";
    if (hasPurulentLargePattern) {
        return buildAlert("red", "Action recommended: Purulent sputum with increased volume and worsening breathlessness.", metricWithSeverity({
            sputum_colour: copd.sputum_colour,
            sputum_volume: copd.sputum_volume,
            mmrc_today: log.mmrc_today,
        }, RED_SEVERITY.exacerbation), "copd-red-exacerbation-pattern");
    }
    const oxygenIncrease = oxygenIncreaseFromBaseline(log, baseline);
    if (typeof oxygenIncrease === "number" && oxygenIncrease >= 3) {
        return buildAlert("red", "Action recommended: oxygen requirement increased by >=3 L/min above baseline.", metricWithSeverity({
            oxygen_requirement_litres: log.oxygen_requirement_litres,
            baseline_oxygen_litres: baseline.baseline_oxygen_litres,
            oxygen_increase_litres: oxygenIncrease,
        }, RED_SEVERITY.oxygenIncrease), "copd-red-oxygen-increase");
    }
    // Hard rule: a single SpO2 reading above 80% never triggers RED.
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => typeof entry.spo2_rest === "number" && entry.spo2_rest <= 85)) {
        return buildAlert("red", "Action recommended: resting SpO2 <=85% for 2 consecutive days.", metricWithSeverity({
            spo2_rest_today: log.spo2_rest,
            spo2_rest_yesterday: previousLogs[0]?.spo2_rest ?? null,
        }, RED_SEVERITY.sustained), "copd-red-spo2-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const drop = numberDropFromBaseline(entry.spo2_rest, baseline.baseline_spo2);
        return typeof drop === "number" && drop >= 6;
    })) {
        return buildAlert("red", "Action recommended: SpO2 dropped >=6% from baseline for 2 consecutive days.", metricWithSeverity({
            baseline_spo2: baseline.baseline_spo2,
            spo2_rest_today: log.spo2_rest,
            spo2_rest_yesterday: previousLogs[0]?.spo2_rest ?? null,
        }, RED_SEVERITY.sustained), "copd-red-spo2-drop-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const increase = numberIncreaseFromBaseline(entry.mmrc_today, baseline.baseline_mmrc);
        return typeof increase === "number" && increase >= 2;
    })) {
        return buildAlert("red", "Action recommended: mMRC increased by >=2 grades for 2 consecutive days.", metricWithSeverity({
            mmrc_today: log.mmrc_today,
            mmrc_yesterday: previousLogs[0]?.mmrc_today ?? null,
            baseline_mmrc: baseline.baseline_mmrc,
        }, RED_SEVERITY.sustained), "copd-red-mmrc-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const data = getCopdData(entry);
        return typeof data.energy_level === "number" && data.energy_level < 4;
    })) {
        return buildAlert("red", "Action recommended: energy level <4/10 for 2 consecutive days.", metricWithSeverity({
            energy_level_today: copd.energy_level,
            energy_level_yesterday: getCopdData(previousLogs[0]).energy_level,
        }, RED_SEVERITY.sustained), "copd-red-energy-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const data = getCopdData(entry);
        return data.sleep_disturbed === true;
    })) {
        return buildAlert("red", "Action recommended: sleep disturbed by breathing for 2 consecutive days.", metricWithSeverity({
            sleep_disturbed_today: copd.sleep_disturbed,
            sleep_disturbed_yesterday: getCopdData(previousLogs[0]).sleep_disturbed,
        }, RED_SEVERITY.sustained), "copd-red-sleep-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const value = getSymptomValue(entry, "chest_heaviness");
        return typeof value === "number" && value >= 8;
    })) {
        return buildAlert("red", "Action recommended: chest heaviness VAS >=8/10 for 2 consecutive days.", metricWithSeverity({
            chest_heaviness_today: getSymptomValue(log, "chest_heaviness"),
            chest_heaviness_yesterday: getSymptomValue(previousLogs[0], "chest_heaviness"),
        }, RED_SEVERITY.sustained), "copd-red-chest-heaviness-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        return typeof entry.temperature_f === "number" && entry.temperature_f >= 102;
    })) {
        return buildAlert("red", "Action recommended: fever >=102F for 2 consecutive days.", metricWithSeverity({
            temperature_f_today: log.temperature_f,
            temperature_f_yesterday: previousLogs[0]?.temperature_f ?? null,
        }, RED_SEVERITY.sustained), "copd-red-fever-2d");
    }
    const yellowReasons = [];
    let yellowScore = 0;
    if (copd.sputum_colour === "yellow" || copd.sputum_colour === "green") {
        yellowScore += 2;
        yellowReasons.push({ label: "Purulent sputum present", points: 2 });
    }
    if (copd.sputum_volume === "large_amount") {
        yellowScore += 1;
        yellowReasons.push({ label: "Sputum volume is increased", points: 1 });
    }
    if (typeof copd.energy_level === "number" && copd.energy_level < 4) {
        yellowScore += 2;
        yellowReasons.push({ label: "Energy level is below 4/10", points: 2 });
    }
    const chestHeaviness = getSymptomValue(log, "chest_heaviness");
    if (typeof chestHeaviness === "number" && chestHeaviness >= 5 && chestHeaviness <= 7) {
        yellowScore += 1;
        yellowReasons.push({ label: "Chest heaviness is moderately elevated", points: 1 });
    }
    if (copd.sleep_disturbed === true) {
        yellowScore += 2;
        yellowReasons.push({ label: "Sleep was disturbed by breathing", points: 2 });
    }
    if (copd.wheezing === true) {
        yellowScore += 2;
        yellowReasons.push({ label: "Wheezing is present", points: 2 });
    }
    if (typeof log.temperature_f === "number" &&
        log.temperature_f >= 100.4 &&
        log.temperature_f <= 101.9) {
        yellowScore += 1;
        yellowReasons.push({ label: "Low-grade fever is present", points: 1 });
    }
    const mmrcIncrease = numberIncreaseFromBaseline(log.mmrc_today, baseline.baseline_mmrc);
    if (typeof mmrcIncrease === "number" && mmrcIncrease >= 2) {
        yellowScore += 2;
        yellowReasons.push({ label: "mMRC increased by 2 grades", points: 2 });
    }
    if (typeof log.spo2_rest === "number" &&
        log.spo2_rest >= 89 &&
        log.spo2_rest <= 91) {
        yellowScore += 1;
        yellowReasons.push({ label: "Resting SpO2 is 89-91%", points: 1 });
    }
    if (copd.exercise_tolerance_good === true) {
        yellowScore -= 1;
        yellowReasons.push({ label: "Good exercise tolerance offsets risk", points: -1 });
    }
    if (yellowScore >= 4) {
        return buildAlert("yellow", `Review suggested: ${getTopTwoReasons(yellowReasons)}.`, {
            yellow_score: yellowScore,
            reasons: yellowReasons,
            exacerbation_pattern: hasPurulentLargePattern,
        }, "copd-yellow-score");
    }
    return buildAlert("green", "COPD symptoms stable.", {
        yellow_score: yellowScore,
        exacerbation_pattern: hasPurulentLargePattern,
    }, "copd-green-stable");
}
