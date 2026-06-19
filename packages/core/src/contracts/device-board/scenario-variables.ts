/**
 * Переменные сценария device-board (v0.4+): ссылочные и value-типы document-scope.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §15 (v0.4)
 */

import type { ReferenceSocketType, ValueSocketType } from './socket-type.js';
import { isReferenceSocketType, isValueSocketType } from './socket-type.js';

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

/** Значение переменной сценария (ссылка или value). */
export type ScenarioVariableValue = ScenarioReferenceValue | ScenarioDateTimeValue;

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

/** Type guard для `ScenarioVariableValue`. */
export function isScenarioVariableValue(value: unknown): value is ScenarioVariableValue {
  return isScenarioReferenceValue(value) || isScenarioDateTimeValue(value);
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
