import { runAsthmaAlertEngine } from "./engines/asthma";
import { runBronchiectasisAlertEngine } from "./engines/bronchiectasis";
import { runCopdAlertEngine } from "./engines/copd";
import { runIldAlertEngine } from "./engines/ild";
export function runAlertEngine(log, previousLogs, baseline) {
    let result;
    switch (baseline.effective_dashboard) {
        case "asthma":
            result = runAsthmaAlertEngine(log, previousLogs, baseline);
            break;
        case "copd":
            result = runCopdAlertEngine(log, previousLogs, baseline);
            break;
        case "bronchiectasis":
            result = runBronchiectasisAlertEngine(log, previousLogs, baseline);
            break;
        case "ild":
            result = runIldAlertEngine(log, previousLogs, baseline);
            break;
        case "post_icu":
            // SRS §9: Post-ICU maps to the Bronchiectasis alert engine
            result = runBronchiectasisAlertEngine(log, previousLogs, baseline);
            break;
        default:
            result = {
                alert_type: "green",
                reason_text: "Stable compared to baseline.",
                triggering_metrics: {},
                suppression_key: "unknown-green-stable",
            };
            break;
    }
    if (result.reason_text.trim().length === 0) {
        throw new Error("Alert engine reason_text must never be empty.");
    }
    return result;
}
