export type RiskCategory = "Stable" | "Moderate" | "High" | "Critical";

export function calculateRiskCategory(score: number | null | undefined): RiskCategory {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return "Stable";
  }
  if (score >= 9) return "Critical";
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Stable";
}

export interface RiskColorStyles {
  fillColor: string; // ARGB hex for Excel fill
  fontColor: string; // ARGB hex for Excel font
  bold: boolean;
}

export function getRiskColorStyles(category: RiskCategory): RiskColorStyles {
  switch (category) {
    case "Critical":
      return {
        fillColor: "FFFEE2E2", // soft red
        fontColor: "FF991B1B", // dark red
        bold: true,
      };
    case "High":
      return {
        fillColor: "FFFEF3C7", // soft amber/orange
        fontColor: "FF92400E", // dark amber
        bold: true,
      };
    case "Moderate":
      return {
        fillColor: "FFFEF9C3", // soft yellow
        fontColor: "FF854D0E", // dark yellow/brown
        bold: false,
      };
    case "Stable":
    default:
      return {
        fillColor: "FFDCFCE7", // soft green
        fontColor: "FF166534", // dark green
        bold: false,
      };
  }
}
