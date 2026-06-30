import type { MediaLibraryCaptureFormat, MediaLibraryRecordingMode } from '@membrana/media-library-service';

export const MIC_BUFFER_RECORDER_PLUGIN_ID = 'mic-buffer-recorder';

export const MIC_BUFFER_RECORDER_SOURCE_ID = 'mic-buffer-recorder';
export const MIC_BUFFER_RECORDER_SOURCE_LABEL = 'Запись в буфер';

export const MANUAL_DURATION_PRESETS_SEC = [3, 5, 7, 10, 15, 30] as const;
export const AUTO_SEGMENT_PRESETS_SEC = [3, 5, 7, 10, 15, 20, 30] as const;
export const MAX_MANUAL_DURATION_SEC = 30;
export const MIN_AUTO_PAUSE_SEC = 0;
export const MAX_AUTO_PAUSE_SEC = 5;
export const WAV_SAMPLE_RATE = 48_000;

/** @deprecated use AUTO_SEGMENT_PRESETS_SEC */
export const AUTO_INTERVAL_PRESETS_SEC = AUTO_SEGMENT_PRESETS_SEC;

export type ManualDurationPresetSec = (typeof MANUAL_DURATION_PRESETS_SEC)[number];
export type AutoSegmentPresetSec = (typeof AUTO_SEGMENT_PRESETS_SEC)[number];
/** @deprecated use AutoSegmentPresetSec */
export type AutoIntervalPresetSec = AutoSegmentPresetSec;

export interface MicBufferRecorderPluginConfig {
  readonly defaultMode: MediaLibraryRecordingMode;
  readonly defaultFormat: MediaLibraryCaptureFormat;
  readonly manualPresetSec: ManualDurationPresetSec;
  readonly autoSegmentSec: AutoSegmentPresetSec;
  readonly pauseSec: number;
}

export const defaultMicBufferRecorderConfig: MicBufferRecorderPluginConfig = {
  defaultMode: 'auto',
  defaultFormat: 'wav',
  manualPresetSec: 5,
  autoSegmentSec: 5,
  pauseSec: 1,
};

export function resolveMicBufferRecorderConfig(
  raw: Partial<MicBufferRecorderPluginConfig> & {
    clipLengthSec?: number;
    intervalSec?: AutoSegmentPresetSec;
  } | undefined,
): MicBufferRecorderPluginConfig {
  const manualPreset = Number(raw?.manualPresetSec ?? defaultMicBufferRecorderConfig.manualPresetSec);
  const segment = Number(
    raw?.autoSegmentSec ?? raw?.intervalSec ?? defaultMicBufferRecorderConfig.autoSegmentSec,
  );
  const pause = Number(raw?.pauseSec ?? raw?.clipLengthSec ?? defaultMicBufferRecorderConfig.pauseSec);
  const defaultMode = raw?.defaultMode === 'auto' ? 'auto' : 'manual';
  const defaultFormat =
    raw?.defaultFormat === 'webm' || raw?.defaultFormat === 'mp4' || raw?.defaultFormat === 'wav'
      ? raw.defaultFormat
      : defaultMicBufferRecorderConfig.defaultFormat;

  return {
    defaultMode,
    defaultFormat,
    manualPresetSec: MANUAL_DURATION_PRESETS_SEC.includes(manualPreset as ManualDurationPresetSec)
      ? (manualPreset as ManualDurationPresetSec)
      : defaultMicBufferRecorderConfig.manualPresetSec,
    autoSegmentSec: AUTO_SEGMENT_PRESETS_SEC.includes(segment as AutoSegmentPresetSec)
      ? (segment as AutoSegmentPresetSec)
      : defaultMicBufferRecorderConfig.autoSegmentSec,
    pauseSec: Number.isFinite(pause)
      ? Math.min(MAX_AUTO_PAUSE_SEC, Math.max(MIN_AUTO_PAUSE_SEC, pause))
      : defaultMicBufferRecorderConfig.pauseSec,
  };
}
