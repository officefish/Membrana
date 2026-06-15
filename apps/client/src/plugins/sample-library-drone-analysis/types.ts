import type { SampleDetectionVerdict } from '@membrana/detector-base';

export const SAMPLE_LIBRARY_DRONE_ANALYSIS_PLUGIN_ID = 'sample-library-drone-analysis';

export interface SampleLibraryDroneAnalysisPluginConfig {
  readonly autoAnalyzeOnEnd: boolean;
}

export const defaultSampleLibraryDroneAnalysisConfig: SampleLibraryDroneAnalysisPluginConfig =
  {
    autoAnalyzeOnEnd: true,
  };

export function resolveSampleLibraryDroneAnalysisConfig(
  raw: unknown,
): SampleLibraryDroneAnalysisPluginConfig {
  if (!raw || typeof raw !== 'object') {
    return defaultSampleLibraryDroneAnalysisConfig;
  }
  const o = raw as Partial<SampleLibraryDroneAnalysisPluginConfig>;
  return {
    autoAnalyzeOnEnd:
      typeof o.autoAnalyzeOnEnd === 'boolean'
        ? o.autoAnalyzeOnEnd
        : defaultSampleLibraryDroneAnalysisConfig.autoAnalyzeOnEnd,
  };
}

export type SampleLibraryDroneAnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SampleLibraryDroneSnapshot {
  readonly selectedSampleId: string | null;
  readonly selectedSampleTitle: string | null;
  readonly status: SampleLibraryDroneAnalysisStatus;
  readonly verdicts: readonly SampleDetectionVerdict[];
  readonly analyzedSampleId: string | null;
  readonly errorMessage: string | null;
}
