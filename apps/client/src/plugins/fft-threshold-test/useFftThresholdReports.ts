import { useSyncExternalStore } from 'react';

import { fftThresholdReportHistory } from './fftThresholdReportHistory';

export function useFftThresholdReports() {
  return useSyncExternalStore(
    fftThresholdReportHistory.subscribe,
    fftThresholdReportHistory.getReports,
    fftThresholdReportHistory.getReports,
  );
}
