import type { FftThresholdTestReport } from './buildFftThresholdTestReport';

/** Legacy RAM journal writes disabled — live journal epic TJ3. */
export function logFftThresholdTestResult(
  _moduleId: string,
  _report: FftThresholdTestReport,
): void {
  /* no-op */
}

export function logFftThresholdStreamStart(_moduleId: string): void {
  /* no-op */
}

export function logFftThresholdStreamStop(_moduleId: string): void {
  /* no-op */
}
