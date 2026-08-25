import React from 'react';
import { CommonDailyLogView } from '../CommonDailyLogView';

export function BronchLogView({ patientId }: { patientId: string }) {
  return <CommonDailyLogView dashboard="bronchiectasis" patientId={patientId} />;
}
