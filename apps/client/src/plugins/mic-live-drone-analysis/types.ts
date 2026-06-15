import type { SampleDetectionVerdict } from '@membrana/detector-base';
import type { DroneDetectionReport } from '@membrana/detector-report';

export const MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID = 'mic-live-drone-analysis';

export interface MicLiveDroneAnalysisPluginConfig {
  readonly autoAnalyzeOnImport: boolean;
}

export const defaultMicLiveDroneAnalysisConfig: MicLiveDroneAnalysisPluginConfig = {
  autoAnalyzeOnImport: true,
};

export function resolveMicLiveDroneAnalysisConfig(
  raw: unknown,
): MicLiveDroneAnalysisPluginConfig {
  if (!raw || typeof raw !== 'object') {
    return defaultMicLiveDroneAnalysisConfig;
  }
  const o = raw as Partial<MicLiveDroneAnalysisPluginConfig>;
  return {
    autoAnalyzeOnImport:
      typeof o.autoAnalyzeOnImport === 'boolean'
        ? o.autoAnalyzeOnImport
        : defaultMicLiveDroneAnalysisConfig.autoAnalyzeOnImport,
  };
}

export type MicLiveDroneAnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface MicLiveDroneSnapshot {
  readonly lastSampleId: string | null;
  readonly lastSampleTitle: string | null;
  readonly lastJournalTrackId: string | null;
  readonly status: MicLiveDroneAnalysisStatus;
  readonly verdicts: readonly SampleDetectionVerdict[];
  readonly detectionReport: DroneDetectionReport | null;
  readonly analyzedSampleId: string | null;
  readonly errorMessage: string | null;
}
