import React from 'react';
import { CommonDailyLogView } from '../CommonDailyLogView';

export function PostICULogView({ patientId }: { patientId: string }) {
  return <CommonDailyLogView dashboard="post_icu" patientId={patientId} />;
}
