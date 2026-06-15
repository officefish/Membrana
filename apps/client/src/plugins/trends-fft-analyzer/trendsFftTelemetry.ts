import type { TrendsFftReport } from './buildTrendsFftReport';

/** Legacy RAM journal writes disabled — live journal epic TJ3. */
export function logTrendsFftResult(_moduleId: string, _report: TrendsFftReport): void {
  /* no-op */
}

export function logTrendsFftStreamStart(_moduleId: string): void {
  /* no-op */
}

export function logTrendsFftStreamStop(_moduleId: string): void {
  /* no-op */
}
