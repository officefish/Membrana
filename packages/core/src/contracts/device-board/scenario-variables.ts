/**
 * Переменные сценария device-board (v0.4+): ссылочные и value-типы document-scope.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §15 (v0.4)
 */

import type { ReferenceSocketType, ValueSocketType } from './socket-type.js';
import { isReferenceSocketType, isValueSocketType } from './socket-type.js';
import type { ScenarioCaptureFormat, ScenarioRecordingWindowSec } from './recording-policy.js';
import type {
  ScenarioFftTrendsDetectionMode,
  ScenarioFftTrendsIntervalMs,
  ScenarioFftTrendsMeasurementCount,
} from './fft-trends-policy.js';

/** Ссылочный тип переменной (`DeviceRef` | `MicrophoneRef` | `ServerRef`). */
export type ScenarioReferenceVariableType = ReferenceSocketType;

/** Value-тип переменной (`DateTime`). */
export type ScenarioValueVariableType = ValueSocketType;

/** Тип переменной сценария — ссылка или value. */
export type ScenarioVariableType = ScenarioReferenceVariableType | ScenarioValueVariableType;

/**
 * Значение ссылки в dataflow. `valid:false` — «висячая» ссылка
 * (например после onDisconnect): handle сохранён, ресурс недоступен.
 */
export interface ScenarioReferenceValue {
  readonly kind: ScenarioReferenceVariableType;
  /** Handle ресурса (deviceId / microphoneId) либо `null`. */
  readonly handle: string | null;
  readonly valid: boolean;
}

/**
 * Value datetime в dataflow: момент времени (ISO-8601), без флага `valid`.
 */
export interface ScenarioDateTimeValue {
  readonly kind: 'DateTime';
  readonly iso: string;
}

/**
 * Value integer в dataflow: целое число (миллисекунды, счётчики и т.д.).
 */
export interface ScenarioIntegerValue {
  readonly kind: 'Integer';
  readonly value: number;
}

/**
 * Value string в dataflow: текст (вывод Print, литералы и т.д.).
 */
export interface ScenarioStringValue {
  readonly kind: 'String';
  readonly value: string;
}

/**
 * Value recording policy в dataflow (MakeRecordingPolicy → StartRecording).
 */
export interface ScenarioRecordingPolicyValue {
  readonly kind: 'RecordingPolicy';
  readonly windowSec: ScenarioRecordingWindowSec;
  readonly captureFormat: ScenarioCaptureFormat;
}

/**
 * Value FFT trends policy в dataflow (MakeFftTrendsPolicy → Collect / MakeFftTrendsAnalysis).
 */
export interface ScenarioFftTrendsPolicyValue {
  readonly kind: 'FftTrendsPolicy';
  readonly detectionMode: ScenarioFftTrendsDetectionMode;
  readonly measurementsCount: ScenarioFftTrendsMeasurementCount;
  readonly intervalMs: ScenarioFftTrendsIntervalMs;
  readonly minConfidence: number;
  readonly minRms: number;
  readonly enabledTemplateKeys: readonly string[];
}

/**
 * Value результата детекционного fusion в dataflow (basn-2, консилиум 2026-07-09 т.1:
 * value, не ref — у fusion нет идентичности и времени жизни). Слияние считает ядро
 * `fuseDetectorConfidences`; узел MakeDetectionFusion лишь маппит анализы в источники.
 */
export interface ScenarioDetectionFusionValue {
  readonly kind: 'DetectionFusion';
  /** Взвешенное среднее сырых confidence присутствующих источников, [0..1]. */
  readonly combinedScore: number;
  /** Согласованность источников, [0..1] (1 — совпадают, 0 — максимальный разброс). */
  readonly agreement: number;
  /** Число отработавших (present) источников; 0 → сигнала нет. */
  readonly presentCount: number;
}

/** Значение переменной сценария (ссылка или value). */
export type ScenarioVariableValue =
  | ScenarioReferenceValue
  | ScenarioDateTimeValue
  | ScenarioIntegerValue
  | ScenarioStringValue
  | ScenarioRecordingPolicyValue
  | ScenarioFftTrendsPolicyValue
  | ScenarioDetectionFusionValue;

/** Переменная сценария (document-scope, объявляется в конструкторе переменных). */
export interface ScenarioVariable {
  readonly id: string;
  readonly name: string;
  readonly type: ScenarioVariableType;
  /** Текущее значение; `null` — переменная объявлена, но не задана. */
  readonly value: ScenarioVariableValue | null;
}

/** Создаёт валидную ссылку на ресурс. */
export function createReferenceValue(
  kind: ScenarioReferenceVariableType,
  handle: string,
): ScenarioReferenceValue {
  return { kind, handle, valid: true };
}

/** Создаёт value datetime. */
export function createDateTimeValue(iso: string): ScenarioDateTimeValue {
  return { kind: 'DateTime', iso };
}

/** Создаёт value integer (округляет до целого). */
export function createIntegerValue(value: number): ScenarioIntegerValue {
  return { kind: 'Integer', value: Math.trunc(value) };
}

/** Создаёт value string. */
export function createStringValue(value: string): ScenarioStringValue {
  return { kind: 'String', value };
}

/** Создаёт value RecordingPolicy. */
export function createRecordingPolicyValue(
  windowSec: ScenarioRecordingWindowSec,
  captureFormat: ScenarioCaptureFormat = 'wav',
): ScenarioRecordingPolicyValue {
  return { kind: 'RecordingPolicy', windowSec, captureFormat };
}

/** Создаёт value FftTrendsPolicy. */
export function createFftTrendsPolicyValue(
  params: Omit<ScenarioFftTrendsPolicyValue, 'kind'>,
): ScenarioFftTrendsPolicyValue {
  return { kind: 'FftTrendsPolicy', ...params };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Создаёт value DetectionFusion (клампит score/agreement в [0..1]). */
export function createDetectionFusionValue(
  params: Omit<ScenarioDetectionFusionValue, 'kind'>,
): ScenarioDetectionFusionValue {
  return {
    kind: 'DetectionFusion',
    combinedScore: clamp01(params.combinedScore),
    agreement: clamp01(params.agreement),
    presentCount: Math.max(0, Math.trunc(params.presentCount)),
  };
}

/** Помечает ссылку невалидной (handle сохраняется для диагностики). */
export function invalidateReference(value: ScenarioReferenceValue): ScenarioReferenceValue {
  return { ...value, valid: false };
}

/** Объявляет переменную без значения. */
export function createScenarioVariable(
  id: string,
  name: string,
  type: ScenarioVariableType,
): ScenarioVariable {
  return { id, name, type, value: null };
}

/** Type guard для `ScenarioVariableType`. */
export function isScenarioVariableType(value: string): value is ScenarioVariableType {
  return isReferenceSocketType(value) || isValueSocketType(value);
}

/** Type guard для `ScenarioReferenceValue`. */
export function isScenarioReferenceValue(value: unknown): value is ScenarioReferenceValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['kind'] === 'string' &&
    isReferenceSocketType(candidate['kind']) &&
    (candidate['handle'] === null || typeof candidate['handle'] === 'string') &&
    typeof candidate['valid'] === 'boolean'
  );
}

/** Type guard для `ScenarioDateTimeValue`. */
export function isScenarioDateTimeValue(value: unknown): value is ScenarioDateTimeValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return candidate['kind'] === 'DateTime' && typeof candidate['iso'] === 'string';
}

/** Type guard для `ScenarioIntegerValue`. */
export function isScenarioIntegerValue(value: unknown): value is ScenarioIntegerValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return candidate['kind'] === 'Integer' && typeof candidate['value'] === 'number';
}

/** Type guard для `ScenarioStringValue`. */
export function isScenarioStringValue(value: unknown): value is ScenarioStringValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return candidate['kind'] === 'String' && typeof candidate['value'] === 'string';
}

/** Type guard для `ScenarioRecordingPolicyValue`. */
export function isScenarioRecordingPolicyValue(
  value: unknown,
): value is ScenarioRecordingPolicyValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate['kind'] === 'RecordingPolicy' &&
    typeof candidate['windowSec'] === 'number' &&
    typeof candidate['captureFormat'] === 'string'
  );
}

/** Type guard для `ScenarioFftTrendsPolicyValue`. */
export function isScenarioFftTrendsPolicyValue(value: unknown): value is ScenarioFftTrendsPolicyValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate['kind'] === 'FftTrendsPolicy' &&
    typeof candidate['detectionMode'] === 'string' &&
    typeof candidate['measurementsCount'] === 'number' &&
    typeof candidate['intervalMs'] === 'number' &&
    typeof candidate['minConfidence'] === 'number' &&
    typeof candidate['minRms'] === 'number' &&
    Array.isArray(candidate['enabledTemplateKeys']) &&
    (candidate['enabledTemplateKeys'] as unknown[]).every((k) => typeof k === 'string')
  );
}

/** Type guard для `ScenarioDetectionFusionValue`. */
export function isScenarioDetectionFusionValue(
  value: unknown,
): value is ScenarioDetectionFusionValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate['kind'] === 'DetectionFusion' &&
    typeof candidate['combinedScore'] === 'number' &&
    typeof candidate['agreement'] === 'number' &&
    typeof candidate['presentCount'] === 'number'
  );
}

/** Type guard для `ScenarioVariableValue`. */
export function isScenarioVariableValue(value: unknown): value is ScenarioVariableValue {
  return (
    isScenarioReferenceValue(value) ||
    isScenarioDateTimeValue(value) ||
    isScenarioIntegerValue(value) ||
    isScenarioStringValue(value) ||
    isScenarioRecordingPolicyValue(value) ||
    isScenarioFftTrendsPolicyValue(value) ||
    isScenarioDetectionFusionValue(value)
  );
}

/** Runtime-проверка формы `ScenarioVariable`. */
export function isScenarioVariable(value: unknown): value is ScenarioVariable {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate['id'] !== 'string' ||
    typeof candidate['name'] !== 'string' ||
    typeof candidate['type'] !== 'string' ||
    !isScenarioVariableType(candidate['type'])
  ) {
    return false;
  }
  const value_ = candidate['value'];
  return value_ === null || isScenarioVariableValue(value_);
}

/**
 * Миграция legacy `DateTimeRef` → `DateTime` (value-тип).
 * Идемпотентна для уже мигрированных переменных.
 */
export function migrateScenarioVariableLegacy(value: unknown): ScenarioVariable | null {
  if (!isScenarioVariable(value)) {
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    const candidate = value as Record<string, unknown>;
    if (candidate['type'] !== 'DateTimeRef') {
      return null;
    }
    const migratedType = 'DateTime' as const;
    const rawValue = candidate['value'];
    let migratedValue: ScenarioVariableValue | null = null;
    if (rawValue !== null && typeof rawValue === 'object') {
      const ref = rawValue as Record<string, unknown>;
      if (ref['kind'] === 'DateTimeRef' && typeof ref['handle'] === 'string') {
        migratedValue = createDateTimeValue(ref['handle']);
      }
    }
    const migrated: ScenarioVariable = {
      id: String(candidate['id']),
      name: String(candidate['name']),
      type: migratedType,
      value: migratedValue,
    };
    return isScenarioVariable(migrated) ? migrated : null;
  }
  return value;
}
