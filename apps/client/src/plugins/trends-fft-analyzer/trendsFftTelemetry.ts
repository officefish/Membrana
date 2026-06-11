import { getDefaultTelemetryJournal } from '@membrana/telemetry-service';

import type { TrendsFftReport } from './buildTrendsFftReport';

const MODULE_NAME = 'trends-fft-analyzer';
const SCHEMA = 'trends-fft/v0.1';

function journal() {
  return getDefaultTelemetryJournal();
}

export function logTrendsFftResult(moduleId: string, report: TrendsFftReport): void {
  journal().addReportEntry({
    type: 'analysis',
    moduleId,
    moduleName: MODULE_NAME,
    data: {
      reportUniqueId: `trends-fft-${report.reportId}`,
      schema: SCHEMA,
      reportKind: 'trends-fft',
      isDetected: report.isDetected,
      detectedState: report.detectedState,
      detectedStateName: report.detectedStateName,
      detectedStateIcon: report.detectedStateIcon,
      confidence: report.confidence,
      confidenceLevel: report.confidenceLevel,
      mode: report.mode,
      intervalMs: report.intervalMs,
      measurementsCount: report.measurementsCount,
      startedAt: report.startedAt,
      finishedAt: report.finishedAt,
      scores: report.scores,
      samples: report.samples,
      temporalFeatures: report.temporalFeatures,
      summaryText: `${report.detectedStateIcon} ${report.detectedStateName} · ${report.confidence}%`,
    },
    tags: [
      'analysis',
      'trends-fft',
      'scene-tag',
      report.isDetected ? 'detection' : 'clear',
      report.detectedState.toLowerCase(),
    ],
  });
}

export function logTrendsFftStreamStart(moduleId: string): void {
  journal().addEntry({
    type: 'event',
    moduleId,
    moduleName: MODULE_NAME,
    data: { action: 'analysis_start' },
    tags: ['trends-fft', 'start'],
  });
}

export function logTrendsFftStreamStop(moduleId: string): void {
  journal().addEntry({
    type: 'event',
    moduleId,
    moduleName: MODULE_NAME,
    data: { action: 'analysis_stop' },
    tags: ['trends-fft', 'stop'],
  });
}
