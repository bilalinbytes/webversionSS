import type { AlertEngineResult, AsthmaControlClassification, AsthmaDiseaseSpecificData, BronchiectasisDiseaseSpecificData, CopdDiseaseSpecificData, DailyLogInput, IldDiseaseSpecificData, IndicatorColor, PatientBaseline, PreviousLog, RiskLevel, ScoreBreakdownItem, SymptomKey } from "../types";
export declare function getSymptomValue(log: Pick<DailyLogInput, "vas_symptoms">, key: SymptomKey): number | null;
export declare function hasMissedMedication(compliance: DailyLogInput["medication_compliance"]): boolean;
export declare function numberDropFromBaseline(value: number | null | undefined, baseline: number | null | undefined): number | null;
export declare function numberIncreaseFromBaseline(value: number | null | undefined, baseline: number | null | undefined): number | null;
export declare function oxygenIncreaseFromBaseline(log: Pick<DailyLogInput, "oxygen_requirement_litres">, baseline: Pick<PatientBaseline, "baseline_oxygen_litres">): number | null;
export declare function classifyAsthmaControl(responses: boolean[] | null | undefined): AsthmaControlClassification;
export declare function getAsthmaData(log: DailyLogInput): AsthmaDiseaseSpecificData;
export declare function getCopdData(log: DailyLogInput): CopdDiseaseSpecificData;
export declare function getBronchiectasisData(log: DailyLogInput): BronchiectasisDiseaseSpecificData;
export declare function getIldData(log: DailyLogInput): IldDiseaseSpecificData;
export declare function getRiskBand(score: number): {
    risk_level: RiskLevel;
    indicator_color: IndicatorColor;
};
export declare function hasConsecutiveDayMatch(today: DailyLogInput, previousLogs: PreviousLog[], predicate: (log: DailyLogInput) => boolean): boolean;
export declare function hasThreeDayMatch(today: DailyLogInput, previousLogs: PreviousLog[], predicate: (log: DailyLogInput) => boolean): boolean;
export declare function buildAlert(alert_type: AlertEngineResult["alert_type"], reason_text: string, triggering_metrics: Record<string, unknown>, suppression_key: string): AlertEngineResult;
export declare function buildBreakdownItem(factor: string, points: number): ScoreBreakdownItem;
export declare function getTopReasons(reasons: Array<{
    label: string;
    points: number;
}>): string;
//# sourceMappingURL=baseline.d.ts.map