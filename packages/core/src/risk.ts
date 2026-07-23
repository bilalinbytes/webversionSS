import { colors } from "@o2plus/theme";

/**
 * Maps a risk score (0-10+) to its semantic color object.
 */
export function getRiskColor(score: number): (typeof colors.risk)[keyof typeof colors.risk] {
  if (score >= 4) return colors.risk.red;
  if (score >= 3) return colors.risk.orange;
  if (score >= 2) return colors.risk.yellow;
  return colors.risk.green;
}

/**
 * Maps a risk score (0-10+) to its semantic label.
 */
export function getRiskLabel(score: number): "Severe" | "High" | "Moderate" | "Low" {
  if (score >= 4) return "Severe";
  if (score >= 3) return "High";
  if (score >= 2) return "Moderate";
  return "Low";
}
