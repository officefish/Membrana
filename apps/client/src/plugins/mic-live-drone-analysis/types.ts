import type { SampleDetectionVerdict } from '@membrana/detector-base';
import type { DroneDetectionBriefReport, DroneDetectionReport } from '@membrana/detector-report';

export const MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID = 'mic-live-drone-analysis';

export type MicLiveDroneAnalysisMode = 'stream-manual' | 'stream-auto' | 'track-import';

export const STREAM_WINDOW_SEC_DEFAULT = 3;
export const STREAM_PAUSE_SEC_DEFAULT = 2;

export interface MicLiveDroneAnalysisPluginConfig {
  /** @deprecated use `analysisMode`; kept for persisted configs */
  readonly autoAnalyzeOnImport?: boolean;
  readonly analysisMode: MicLiveDroneAnalysisMode;
  readonly streamWindowSec: number;
  readonly streamPauseSec: number;
}

export const defaultMicLiveDroneAnalysisConfig: MicLiveDroneAnalysisPluginConfig = {
  analysisMode: 'track-import',
  streamWindowSec: STREAM_WINDOW_SEC_DEFAULT,
  streamPauseSec: STREAM_PAUSE_SEC_DEFAULT,
};

const ANALYSIS_MODES: readonly MicLiveDroneAnalysisMode[] = [
  'stream-manual',
  'stream-auto',
  'track-import',
];

function isAnalysisMode(value: unknown): value is MicLiveDroneAnalysisMode {
  return typeof value === 'string' && ANALYSIS_MODES.includes(value as MicLiveDroneAnalysisMode);
}

export function resolveMicLiveDroneAnalysisConfig(
  raw: unknown,
): MicLiveDroneAnalysisPluginConfig {
  if (!raw || typeof raw !== 'object') {
    return defaultMicLiveDroneAnalysisConfig;
  }
  const o = raw as Partial<MicLiveDroneAnalysisPluginConfig> & {
    autoAnalyzeOnImport?: boolean;
  };

  let analysisMode = defaultMicLiveDroneAnalysisConfig.analysisMode;
  if (isAnalysisMode(o.analysisMode)) {
    analysisMode = o.analysisMode;
  }

  const streamWindowSec =
    typeof o.streamWindowSec === 'number' && o.streamWindowSec > 0
      ? o.streamWindowSec
      : STREAM_WINDOW_SEC_DEFAULT;
  const streamPauseSec =
    typeof o.streamPauseSec === 'number' && o.streamPauseSec >= 0
      ? o.streamPauseSec
      : STREAM_PAUSE_SEC_DEFAULT;

  return {
    analysisMode,
    streamWindowSec,
    streamPauseSec,
    ...(typeof o.autoAnalyzeOnImport === 'boolean'
      ? { autoAnalyzeOnImport: o.autoAnalyzeOnImport }
      : {}),
  };
}

export function isTrackImportAnalysisEnabled(
  config: MicLiveDroneAnalysisPluginConfig,
): boolean {
  if (config.analysisMode !== 'track-import') return false;
  if (config.autoAnalyzeOnImport === false) return false;
  return true;
}

export function isStreamAnalysisMode(
  mode: MicLiveDroneAnalysisMode,
): mode is 'stream-manual' | 'stream-auto' {
  return mode === 'stream-manual' || mode === 'stream-auto';
}

export type MicLiveDroneAnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

export type MicLiveDroneStreamPhase = 'idle' | 'collecting' | 'finalizing' | 'pause';

export interface MicLiveDroneSnapshot {
  readonly analysisMode: MicLiveDroneAnalysisMode;
  readonly streamPhase: MicLiveDroneStreamPhase;
  readonly streamWindowSec: number;
  readonly streamPauseSec: number;
  readonly streamElapsedMs: number;
  readonly streamLive: boolean;
  readonly lastSampleId: string | null;
  readonly lastSampleTitle: string | null;
  readonly lastJournalTrackId: string | null;
  readonly status: MicLiveDroneAnalysisStatus;
  readonly verdicts: readonly SampleDetectionVerdict[];
  readonly briefReport: DroneDetectionBriefReport | null;
  readonly detailedReport: DroneDetectionReport | null;
  readonly analyzedSampleId: string | null;
  readonly lastStreamReportId: string | null;
  readonly errorMessage: string | null;
}

export const MIC_LIVE_DRONE_ANALYSIS_MODE_LABELS: Record<MicLiveDroneAnalysisMode, string> = {
  'stream-manual': 'Ручной (поток)',
  'stream-auto': 'Авто (поток)',
  'track-import': 'Последний трек',
};
