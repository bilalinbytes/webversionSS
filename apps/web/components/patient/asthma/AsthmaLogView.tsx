"use client";

import { CommonDailyLogView } from "@/components/patient/CommonDailyLogView";

interface AsthmaLogViewProps {
  patientId: string;
  medicationMap: { id: string; name: string; dose: string; route: string; frequency: string }[];
  diagnosisLabel?: string;
}

export function AsthmaLogView({ patientId, medicationMap, diagnosisLabel }: AsthmaLogViewProps) {
  return <CommonDailyLogView dashboard="asthma" patientId={patientId} medicationMap={medicationMap} diagnosisLabel={diagnosisLabel} />;
}
