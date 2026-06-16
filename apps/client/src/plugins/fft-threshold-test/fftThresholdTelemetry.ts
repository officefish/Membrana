import { appendFftThresholdJournalReport } from './appendFftThresholdJournalReport';
import type { FftThresholdTestReport } from './buildFftThresholdTestReport';

/** Write fft-threshold-test/v0.2 report to the live journal (LP2). */
export function logFftThresholdTestResult(
  moduleId: string,
  report: FftThresholdTestReport,
): void {
  void appendFftThresholdJournalReport({ moduleId, report }).catch(() => {
    /* journal append is best-effort; ignore failures */
  });
}

export function logFftThresholdStreamStart(_moduleId: string): void {
  /* no-op: stream lifecycle markers are not journaled */
}

export function logFftThresholdStreamStop(_moduleId: string): void {
  /* no-op: stream lifecycle markers are not journaled */
}
