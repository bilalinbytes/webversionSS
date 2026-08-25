import React from 'react';
import { CommonDailyLogView } from '../CommonDailyLogView';

export function ILDLogView({ patientId }: { patientId: string }) {
  return <CommonDailyLogView dashboard="ild" patientId={patientId} />;
}
