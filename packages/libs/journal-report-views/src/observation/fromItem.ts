import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import type { TrendsFftReport } from '../trends/types';

export const DEVICE_BOARD_OBSERVATION_SCHEMA = 'device-board-observation/v1' as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Observation bundle: trends report + linked trackId for operator playback. */
export interface DeviceBoardObservationReport {
  readonly trendsReport: TrendsFftReport;
  readonly trackId: string;
  readonly audioReady: boolean;
}

function parseTrendsNested(nested: unknown): TrendsFftReport | null {
  if (!isRecord(nested)) return null;
  if (typeof nested.reportId !== 'string') return null;
  if (typeof nested.detectedStateName !== 'string') return null;
  return nested as unknown as TrendsFftReport;
}

/** Parse observation bundle from journal item. */
export function deviceBoardObservationFromItem(
  item: LiveJournalItem,
): DeviceBoardObservationReport | null {
  if (item.kind !== 'report' || !item.report) return null;
  if (item.report.schema !== DEVICE_BOARD_OBSERVATION_SCHEMA) return null;

  const nested = item.report.payload['trendsReport'];
  const trendsReport = parseTrendsNested(nested);
  if (trendsReport === null) return null;

  const trackId =
    typeof item.report.trackId === 'string' && item.report.trackId.length > 0
      ? item.report.trackId
      : null;
  if (trackId === null) return null;

  const audioReady = item.report.payload['audioReady'] === true;

  return { trendsReport, trackId, audioReady };
}

/** Trends payload nested inside observation bundle (for shared TrendsFftReportView). */
export function trendsFromObservationItem(item: LiveJournalItem): TrendsFftReport | null {
  return deviceBoardObservationFromItem(item)?.trendsReport ?? null;
}
