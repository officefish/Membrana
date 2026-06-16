import { appendTrendsFftJournalReport } from './appendTrendsFftJournalReport';
import type { TrendsFftReport } from './buildTrendsFftReport';

/** Write trends-fft/v0.1 report to the live journal (LP2). */
export function logTrendsFftResult(moduleId: string, report: TrendsFftReport): void {
  void appendTrendsFftJournalReport({ moduleId, report }).catch(() => {
    /* journal append is best-effort; ignore failures */
  });
}

export function logTrendsFftStreamStart(_moduleId: string): void {
  /* no-op: stream lifecycle markers are not journaled */
}

export function logTrendsFftStreamStop(_moduleId: string): void {
  /* no-op: stream lifecycle markers are not journaled */
}
