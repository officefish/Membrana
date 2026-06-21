/**
 * Политика rolling-записи v0.8 (StartRecording / IsRecordingWindowFull).
 * Два enum-параметра — parity с mic-buffer-recorder sidebar.
 * @see docs/prompts/DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md
 */

import { DEFAULT_SCENARIO_COLLECTOR_CONFIG } from './collector-config.js';

/** Допустимые длительности окна записи (сек) — как MANUAL_DURATION_PRESETS_SEC в mic plugin. */
export const RECORDING_WINDOW_SEC_PRESETS = [3, 5, 7, 10, 15, 30] as const;

export type ScenarioRecordingWindowSec = (typeof RECORDING_WINDOW_SEC_PRESETS)[number];

/** Форматы захвата — как MediaLibraryCaptureFormat в mic-buffer-recorder. */
export const SCENARIO_CAPTURE_FORMATS = ['wav', 'webm', 'mp4'] as const;

export type ScenarioCaptureFormat = (typeof SCENARIO_CAPTURE_FORMATS)[number];

/** Параметры окна записи на устройстве (enum-only). */
export interface ScenarioRecordingPolicy {
  readonly windowSec: ScenarioRecordingWindowSec;
  readonly captureFormat: ScenarioCaptureFormat;
}

const DEFAULT_WINDOW_SEC: ScenarioRecordingWindowSec = 5;

/** Defaults v0.8 — parity с defaultMicBufferRecorderConfig. */
export const DEFAULT_RECORDING_POLICY: ScenarioRecordingPolicy = {
  windowSec: DEFAULT_WINDOW_SEC,
  captureFormat: 'wav',
};

/** Legacy default window из collector (3 s) — для миграции JSON v0.7. */
export const LEGACY_COLLECTOR_WINDOW_SEC = DEFAULT_SCENARIO_COLLECTOR_CONFIG.windowSec;

function isRecordingWindowPreset(value: number): value is ScenarioRecordingWindowSec {
  return (RECORDING_WINDOW_SEC_PRESETS as readonly number[]).includes(value);
}

function isCaptureFormat(value: string): value is ScenarioCaptureFormat {
  return (SCENARIO_CAPTURE_FORMATS as readonly string[]).includes(value);
}

/** Ближайший preset к произвольному числу (legacy JSON / partial hydrate). */
export function nearestRecordingWindowPreset(
  rawSec: number,
): ScenarioRecordingWindowSec {
  if (!Number.isFinite(rawSec) || rawSec <= 0) {
    return DEFAULT_WINDOW_SEC;
  }
  let best: ScenarioRecordingWindowSec = DEFAULT_WINDOW_SEC;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const preset of RECORDING_WINDOW_SEC_PRESETS) {
    const delta = Math.abs(preset - rawSec);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = preset;
    }
  }
  return best;
}

/**
 * Нормализует partial/raw policy после hydrate, UI или MakeRecordingPolicy.
 * Невалидные поля заменяются defaults / nearest preset.
 */
export function resolveScenarioRecordingPolicy(
  raw: Partial<ScenarioRecordingPolicy> | undefined | null,
): ScenarioRecordingPolicy {
  const base = DEFAULT_RECORDING_POLICY;
  if (raw === undefined || raw === null || typeof raw !== 'object') {
    return base;
  }
  const windowSec =
    typeof raw.windowSec === 'number' && isRecordingWindowPreset(raw.windowSec)
      ? raw.windowSec
      : typeof raw.windowSec === 'number'
        ? nearestRecordingWindowPreset(raw.windowSec)
        : base.windowSec;
  const captureFormat =
    typeof raw.captureFormat === 'string' && isCaptureFormat(raw.captureFormat)
      ? raw.captureFormat
      : base.captureFormat;
  return { windowSec, captureFormat };
}

/** True, если value — объект с enum windowSec и captureFormat. */
export function isScenarioRecordingPolicy(value: unknown): value is ScenarioRecordingPolicy {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    typeof o.windowSec === 'number' &&
    isRecordingWindowPreset(o.windowSec) &&
    typeof o.captureFormat === 'string' &&
    isCaptureFormat(o.captureFormat)
  );
}
