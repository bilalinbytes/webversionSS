import { buildAlert, classifyAsthmaControl, getAsthmaData, getSymptomValue, hasConsecutiveDayMatch, numberDropFromBaseline, numberIncreaseFromBaseline, } from "../utils/baseline";
const RED_SEVERITY = {
    immediate: 100,
    controlPattern: 90,
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
export function runAsthmaAlertEngine(log, previousLogs, baseline) {
    const asthma = getAsthmaData(log);
    const control = asthma.asthma_control_status ??
        classifyAsthmaControl(asthma.asthma_control_responses);
    if (log.haemoptysis === true) {
        return buildAlert("red", "Action recommended: hemoptysis reported.", metricWithSeverity({ haemoptysis: true, asthma_control: control }, RED_SEVERITY.immediate), "asthma-red-haemoptysis");
    }
    const chestPain = getSymptomValue(log, "chest_pain");
    if (typeof chestPain === "number" && chestPain >= 8) {
        return buildAlert("red", "Action recommended: severe chest pain VAS >=8/10.", metricWithSeverity({ chest_pain_vas: chestPain, asthma_control: control }, RED_SEVERITY.immediate), "asthma-red-chest-pain");
    }
    if (typeof log.spo2_rest === "number" && log.spo2_rest <= 80) {
        return buildAlert("red", "Action recommended: resting SpO2 <=80%.", metricWithSeverity({ spo2_rest: log.spo2_rest, asthma_control: control }, RED_SEVERITY.immediate), "asthma-red-spo2-immediate");
    }
    if (typeof asthma.rescue_inhaler_puffs === "number" &&
        asthma.rescue_inhaler_puffs >= 8) {
        const controlPhrase = control === "poorly_controlled"
            ? " with poorly controlled asthma"
            : "";
        return buildAlert("red", `Action recommended: Rescue inhaler use >=8 puffs today${controlPhrase}.`, metricWithSeverity({
            rescue_inhaler_puffs: asthma.rescue_inhaler_puffs,
            asthma_control: control,
        }, RED_SEVERITY.immediate), "asthma-red-rescue-8");
    }
    const previousAsthma = previousLogs[0] ? getAsthmaData(previousLogs[0]) : null;
    const previousControl = previousAsthma
        ? previousAsthma.asthma_control_status ??
            classifyAsthmaControl(previousAsthma.asthma_control_responses)
        : null;
    if (previousControl === "poorly_controlled" &&
        control === "poorly_controlled") {
        return buildAlert("red", "Action recommended: poorly controlled asthma for 2 consecutive days.", metricWithSeverity({ asthma_control_today: control, asthma_control_yesterday: previousControl }, RED_SEVERITY.controlPattern), "asthma-red-poor-control-2d");
    }
    if (typeof asthma.rescue_inhaler_puffs === "number" &&
        asthma.rescue_inhaler_puffs > 6 &&
        typeof previousAsthma?.rescue_inhaler_puffs === "number" &&
        previousAsthma.rescue_inhaler_puffs > 6) {
        return buildAlert("red", "Action recommended: rescue inhaler use >6 puffs/day for 2 consecutive days.", metricWithSeverity({
            rescue_inhaler_puffs_today: asthma.rescue_inhaler_puffs,
            rescue_inhaler_puffs_yesterday: previousAsthma.rescue_inhaler_puffs,
            asthma_control: control,
        }, RED_SEVERITY.controlPattern), "asthma-red-rescue-2d");
    }
    // Hard rule: a single SpO2 reading above 80% never triggers RED under sustained rules.
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => typeof entry.spo2_rest === "number" && entry.spo2_rest <= 88)) {
        return buildAlert("red", "Action recommended: resting SpO2 <=88% for 2 consecutive days.", metricWithSeverity({
            spo2_rest_today: log.spo2_rest,
            spo2_rest_yesterday: previousLogs[0]?.spo2_rest ?? null,
            asthma_control: control,
        }, RED_SEVERITY.sustained), "asthma-red-spo2-2d");
    }
    // Hard rule: SpO2 values are never averaged.
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const drop = numberDropFromBaseline(entry.spo2_rest, baseline.baseline_spo2);
        return typeof drop === "number" && drop >= 4;
    })) {
        return buildAlert("red", "Action recommended: SpO2 dropped >=4% from baseline for 2 consecutive days.", metricWithSeverity({
            baseline_spo2: baseline.baseline_spo2,
            spo2_rest_today: log.spo2_rest,
            spo2_rest_yesterday: previousLogs[0]?.spo2_rest ?? null,
            asthma_control: control,
        }, RED_SEVERITY.sustained), "asthma-red-spo2-drop-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const drop = numberDropFromBaseline(entry.spo2_exertion, baseline.baseline_spo2);
        return typeof drop === "number" && drop >= 10;
    })) {
        return buildAlert("red", "Action recommended: exertional SpO2 dropped >=10% from baseline for 2 consecutive days.", metricWithSeverity({
            baseline_spo2: baseline.baseline_spo2,
            spo2_exertion_today: log.spo2_exertion,
            spo2_exertion_yesterday: previousLogs[0]?.spo2_exertion ?? null,
            asthma_control: control,
        }, RED_SEVERITY.sustained), "asthma-red-exertional-drop-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const increase = numberIncreaseFromBaseline(entry.mmrc_today, baseline.baseline_mmrc);
        return typeof increase === "number" && increase >= 3;
    })) {
        return buildAlert("red", "Action recommended: mMRC increased by >=3 grades for 2 consecutive days.", metricWithSeverity({
            baseline_mmrc: baseline.baseline_mmrc,
            mmrc_today: log.mmrc_today,
            mmrc_yesterday: previousLogs[0]?.mmrc_today ?? null,
            asthma_control: control,
        }, RED_SEVERITY.sustained), "asthma-red-mmrc-2d");
    }
    if (hasConsecutiveDayMatch(log, previousLogs, (entry) => {
        const cough = getSymptomValue(entry, "cough");
        const coughIncrease = numberIncreaseFromBaseline(cough, baseline.baseline_cough_vas);
        return (typeof entry.temperature_f === "number" &&
            entry.temperature_f >= 100.4 &&
            typeof cough === "number" &&
            cough >= 8 &&
            typeof coughIncrease === "number" &&
            coughIncrease >= 4);
    })) {
        return buildAlert("red", "Action recommended: fever with severe worsening cough for 2 consecutive days.", metricWithSeverity({
            temperature_f_today: log.temperature_f,
            cough_vas_today: getSymptomValue(log, "cough"),
            baseline_cough_vas: baseline.baseline_cough_vas ?? null,
            asthma_control: control,
        }, RED_SEVERITY.sustained), "asthma-red-fever-cough-2d");
    }
    const yellowReasons = [];
    let yellowScore = 0;
    if (typeof log.spo2_rest === "number" &&
        log.spo2_rest >= 89 &&
        log.spo2_rest <= 91) {
        yellowScore += 2;
        yellowReasons.push({ label: "Resting SpO2 is 89-91%", points: 2 });
    }
    const mmrcIncrease = numberIncreaseFromBaseline(log.mmrc_today, baseline.baseline_mmrc);
    if (typeof mmrcIncrease === "number" && mmrcIncrease >= 2) {
        yellowScore += 2;
        yellowReasons.push({ label: "mMRC increased by 2 grades", points: 2 });
    }
    const moderateSymptoms = ["breathlessness", "cough", "wheeze", "fatigue"].some((key) => {
        const value = getSymptomValue(log, key);
        return typeof value === "number" && value >= 5 && value <= 7;
    });
    if (moderateSymptoms) {
        yellowScore += 1;
        yellowReasons.push({ label: "Symptom VAS is moderately elevated", points: 1 });
    }
    if (typeof asthma.rescue_inhaler_puffs === "number" &&
        asthma.rescue_inhaler_puffs > 6) {
        yellowScore += 2;
        yellowReasons.push({ label: "Rescue inhaler use exceeded 6 puffs", points: 2 });
    }
    if (control === "partly_controlled") {
        yellowScore += 1;
        yellowReasons.push({ label: "Asthma is partly controlled today", points: 1 });
    }
    if (control === "poorly_controlled" &&
        previousControl !== "poorly_controlled") {
        yellowScore += 2;
        yellowReasons.push({ label: "Poorly controlled asthma for 1 day", points: 2 });
    }
    if (asthma.controller_taken === false) {
        yellowScore += 2;
        yellowReasons.push({ label: "Controller inhaler not taken today", points: 2 });
    }
    const sideEffectsReported = Array.isArray(log.side_effects)
        ? log.side_effects.length > 0
        : typeof log.side_effects === "object" && log.side_effects !== null
            ? Object.keys(log.side_effects).length > 0
            : false;
    if (sideEffectsReported) {
        yellowScore += 1;
        yellowReasons.push({ label: "Side effects reported", points: 1 });
    }
    if (yellowScore >= 3) {
        return buildAlert("yellow", `Review suggested: ${getTopTwoReasons(yellowReasons)}.`, {
            yellow_score: yellowScore,
            reasons: yellowReasons,
            asthma_control: control,
        }, "asthma-yellow-score");
    }
    // RED overrides YELLOW and GREEN is the default.
    return buildAlert("green", "Asthma stable and well controlled.", {
        asthma_control: control,
        yellow_score: yellowScore,
        rescue_inhaler_puffs: asthma.rescue_inhaler_puffs,
        controller_taken: asthma.controller_taken,
    }, "asthma-green-stable");
}
