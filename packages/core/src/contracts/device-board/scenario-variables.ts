/**
 * Переменные сценария device-board (v0.4): типизированные ссылки document-scope.
 * Переменная хранит ссылку (`ScenarioReferenceValue`) либо `null` (не задана).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §15 (v0.4)
 */

import type { ReferenceSocketType } from './socket-type.js';
import { isReferenceSocketType } from './socket-type.js';

/** Тип переменной сценария — всегда ссылочный (`DeviceRef` | `MicrophoneRef`). */
export type ScenarioVariableType = ReferenceSocketType;

/**
 * Значение ссылки в dataflow. `valid:false` означает «висячую» ссылку
 * (например после onDisconnect): handle сохранён, но ресурс недоступен.
 */
export interface ScenarioReferenceValue {
  readonly kind: ScenarioVariableType;
  /** Handle ресурса устройства (deviceId / microphoneId) либо `null`. */
  readonly handle: string | null;
  readonly valid: boolean;
}

/** Переменная сценария (document-scope, объявляется в конструкторе переменных). */
export interface ScenarioVariable {
  readonly id: string;
  readonly name: string;
  readonly type: ScenarioVariableType;
  /** Текущее значение ссылки; `null` — переменная объявлена, но не задана. */
  readonly value: ScenarioReferenceValue | null;
}

/** Создаёт валидную ссылку на ресурс. */
export function createReferenceValue(
  kind: ScenarioVariableType,
  handle: string,
): ScenarioReferenceValue {
  return { kind, handle, valid: true };
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
  return isReferenceSocketType(value);
}

/** Runtime-проверка формы `ScenarioReferenceValue`. */
export function isScenarioReferenceValue(value: unknown): value is ScenarioReferenceValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['kind'] === 'string' &&
    isScenarioVariableType(candidate['kind']) &&
    (candidate['handle'] === null || typeof candidate['handle'] === 'string') &&
    typeof candidate['valid'] === 'boolean'
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
  return value_ === null || isScenarioReferenceValue(value_);
}
