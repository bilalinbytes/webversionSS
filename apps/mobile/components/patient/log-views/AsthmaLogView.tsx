import React from 'react';
import { CommonDailyLogView } from '../CommonDailyLogView';

export function AsthmaLogView({ patientId }: { patientId: string }) {
  return <CommonDailyLogView dashboard="asthma" patientId={patientId} />;
}
