import { getDefaultTelemetryJournal } from '@membrana/telemetry-service';

const AGGREGATE_INTERVAL_MS = 5000;

const lastAggregateLogMs = new Map<string, number>();

const MODULE_NAME = 'microphone-stream-viz';

function journal() {
  return getDefaultTelemetryJournal();
}

export function logMicSamplerStart(moduleId: string): void {
  journal().addEntry({
    type: 'event',
    moduleId,
    moduleName: MODULE_NAME,
    data: { action: 'sampler_start' },
    tags: ['mic', 'stream', 'start'],
  });
}

export function logMicSamplerStop(moduleId: string): void {
  journal().addEntry({
    type: 'event',
    moduleId,
    moduleName: MODULE_NAME,
    data: { action: 'sampler_stop' },
    tags: ['mic', 'stream', 'stop'],
  });
}

export function logMicSamplerError(moduleId: string): void {
  journal().addEntry({
    type: 'event',
    moduleId,
    moduleName: MODULE_NAME,
    data: { action: 'sampler_error' },
    tags: ['mic', 'stream', 'error'],
  });
}

export function logMicMetricsAggregateThrottled(
  moduleId: string,
  metrics: {
    volume: number;
    qualityScore: number;
    snr: number;
    noise: number;
  },
): void {
  const now = Date.now();
  const prev = lastAggregateLogMs.get(moduleId) ?? 0;
  if (now - prev < AGGREGATE_INTERVAL_MS) {
    return;
  }
  lastAggregateLogMs.set(moduleId, now);
  const bucket = Math.floor(now / AGGREGATE_INTERVAL_MS);
  journal().addReportEntry({
    type: 'analysis',
    moduleId,
    moduleName: MODULE_NAME,
    data: {
      reportUniqueId: `${moduleId}-mic-agg-${bucket}`,
      volume: metrics.volume,
      qualityScore: metrics.qualityScore,
      snr: metrics.snr,
      noise: metrics.noise,
      tags: ['mic', 'aggregate'],
    },
    tags: ['analysis', 'mic'],
  });
}

export function clearMicTelemetryThrottle(moduleId: string): void {
  lastAggregateLogMs.delete(moduleId);
}
