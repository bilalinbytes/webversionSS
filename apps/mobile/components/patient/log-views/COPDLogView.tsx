import React from 'react';
import { CommonDailyLogView } from '../CommonDailyLogView';

export function COPDLogView({ patientId }: { patientId: string }) {
  return <CommonDailyLogView dashboard="copd" patientId={patientId} />;
}
