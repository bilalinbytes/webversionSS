"use client";

import { CommonDailyLogView } from "@/components/patient/CommonDailyLogView";

interface COPDLogViewProps {
  patientId: string;
  medicationMap: { id: string; name: string; dose: string; route: string; frequency: string }[];
  diagnosisLabel?: string;
}

export function COPDLogView({ patientId, medicationMap, diagnosisLabel }: COPDLogViewProps) {
  return <CommonDailyLogView dashboard="copd" patientId={patientId} medicationMap={medicationMap} diagnosisLabel={diagnosisLabel} />;
}
