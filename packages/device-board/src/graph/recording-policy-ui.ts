import {
  RECORDING_WINDOW_SEC_PRESETS,
  SCENARIO_CAPTURE_FORMATS,
  resolveScenarioRecordingPolicy,
  type ScenarioCaptureFormat,
  type ScenarioRecordingPolicy,
  type ScenarioRecordingWindowSec,
} from '@membrana/core';

/** Бейдж на канвасе: «5s · WAV» (Rodchenko A3). */
export function formatRecordingPolicyBadge(
  raw: Partial<ScenarioRecordingPolicy> | undefined | null,
): string {
  const policy = resolveScenarioRecordingPolicy(raw);
  return `${policy.windowSec}s · ${policy.captureFormat.toUpperCase()}`;
}

/** Подпись формата в инспекторе. */
export function captureFormatInspectorLabel(format: ScenarioCaptureFormat): string {
  switch (format) {
    case 'wav':
      return 'WAV (AudioWorklet 48 kHz)';
    case 'webm':
      return 'WebM (MediaRecorder Opus)';
    case 'mp4':
      return 'MP4 (MediaRecorder AAC)';
    default:
      return format;
  }
}

export { RECORDING_WINDOW_SEC_PRESETS, SCENARIO_CAPTURE_FORMATS };
export type { ScenarioCaptureFormat, ScenarioRecordingWindowSec };
