/**
 * Utilities to parse and build extended patient metadata (Occupation, Exposure, Smoking, Alcohol, Past History)
 * stored directly or encoded into address metadata brackets.
 */

export interface PatientAddressMeta {
  cleanAddress: string | null;
  occupation: string | null;
  significantExposure: string | null;
  smokingStatus: string | null;
  smokingIndex: string | null;
  alcoholStatus: string | null;
  pastHistory: string | null;
  pastHistoryYearsAgo: string | null;
}

export function extractAddressAndMetadata(rawAddress: string | null | undefined): PatientAddressMeta {
  const addr = rawAddress ?? "";
  let cleanAddress: string | null = addr || null;
  let occupation: string | null = null;
  let significantExposure: string | null = null;
  let smokingStatus: string | null = null;
  let smokingIndex: string | null = null;
  let alcoholStatus: string | null = null;
  let pastHistory: string | null = null;
  let pastHistoryYearsAgo: string | null = null;

  if (addr) {
    const occMatch = addr.match(/Occupation:\s*([^|\]]+)/i);
    if (occMatch?.[1]) occupation = occMatch[1].trim();

    const expMatch = addr.match(/(?:Exposure|Illness Exposure):\s*([^|\]]+)/i);
    if (expMatch?.[1]) significantExposure = expMatch[1].trim();

    const smokeMatch = addr.match(/Smoking:\s*([^|\]]+)/i);
    if (smokeMatch?.[1]) smokingStatus = smokeMatch[1].trim();

    const smokeIdxMatch = addr.match(/SmokingIndex:\s*([^|\]]+)/i);
    if (smokeIdxMatch?.[1]) smokingIndex = smokeIdxMatch[1].trim();

    const alcMatch = addr.match(/Alcohol:\s*([^|\]]+)/i);
    if (alcMatch?.[1]) alcoholStatus = alcMatch[1].trim();

    const histMatch = addr.match(/PastHistory:\s*([^|\]]+)/i);
    if (histMatch?.[1]) pastHistory = histMatch[1].trim();

    const histYrsMatch = addr.match(/PastHistoryYears:\s*([^|\]]+)/i);
    if (histYrsMatch?.[1]) pastHistoryYearsAgo = histYrsMatch[1].trim();

    const withoutBrackets = addr.replace(/\s*\[.*?\]\s*$/, "").trim();
    cleanAddress = withoutBrackets || null;
  }

  return {
    cleanAddress,
    occupation,
    significantExposure,
    smokingStatus,
    smokingIndex,
    alcoholStatus,
    pastHistory,
    pastHistoryYearsAgo,
  };
}

export function buildAddressWithMetadata(
  baseAddress: string | null | undefined,
  meta: {
    occupation?: string | null;
    significantExposure?: string | null;
    smokingStatus?: string | null;
    smokingIndex?: string | null;
    alcoholStatus?: string | null;
    pastHistory?: string | null;
    pastHistoryYearsAgo?: string | null;
  }
): string | null {
  const cleanAddr = (baseAddress ?? "").replace(/\s*\[.*?\]\s*$/, "").trim();
  const parts: string[] = [];
  if (meta.occupation) parts.push(`Occupation: ${meta.occupation}`);
  if (meta.significantExposure) parts.push(`Exposure: ${meta.significantExposure}`);
  if (meta.smokingStatus) parts.push(`Smoking: ${meta.smokingStatus}`);
  if (meta.smokingIndex) parts.push(`SmokingIndex: ${meta.smokingIndex}`);
  if (meta.alcoholStatus) parts.push(`Alcohol: ${meta.alcoholStatus}`);
  if (meta.pastHistory) parts.push(`PastHistory: ${meta.pastHistory}`);
  if (meta.pastHistoryYearsAgo) parts.push(`PastHistoryYears: ${meta.pastHistoryYearsAgo}`);

  const tag = parts.length > 0 ? `[${parts.join(" | ")}]` : "";
  if (cleanAddr && tag) return `${cleanAddr} ${tag}`;
  if (cleanAddr) return cleanAddr;
  if (tag) return tag;
  return null;
}
