import {
  createReferenceValue,
  invalidateReference,
  type ScenarioReferenceValue,
  type ScenarioVariable,
} from '@membrana/core';

/** Чистый предикат валидности ссылки (используется `is-valid` и UI). */
export function isReferenceValid(value: ScenarioReferenceValue | null): boolean {
  return value !== null && value.valid;
}

function referencesEqual(
  left: ScenarioReferenceValue | null,
  right: ScenarioReferenceValue | null,
): boolean {
  if (left === null && right === null) {
    return true;
  }
  if (left === null || right === null) {
    return false;
  }
  return left.kind === right.kind && left.handle === right.handle && left.valid === right.valid;
}

/**
 * Семантика записи переменной из dataflow:
 * - `null` (onDisconnect) → invalidate существующую ссылку или оставить `null`;
 * - валидное значение → заменить (onConnect: слабая → постоянная `valid=true`);
 * - идемпотентность: та же ссылка не создаёт новый объект.
 */
export function applyVariableSetValue(
  variable: ScenarioVariable,
  incoming: ScenarioReferenceValue | null,
): ScenarioVariable {
  if (incoming === null) {
    if (variable.value === null) {
      return variable;
    }
    const invalidated = invalidateReference(variable.value);
    if (referencesEqual(variable.value, invalidated)) {
      return variable;
    }
    return { ...variable, value: invalidated };
  }

  if (incoming.kind !== variable.type) {
    throw new Error(
      `Variable "${variable.name}" expects ${variable.type}, got ${incoming.kind}`,
    );
  }

  if (referencesEqual(variable.value, incoming)) {
    return variable;
  }

  return { ...variable, value: incoming };
}

/**
 * Значение data-выхода системного Event-узла по ветви-обработчику.
 * `onDisconnect` отдаёт `null`; остальные — `DeviceRef` (valid при наличии handle).
 */
export function resolveEventReference(
  handlerBranch: 'onConnect' | 'initial' | 'onStop' | 'onDisconnect',
  deviceHandle: string | null,
): ScenarioReferenceValue | null {
  if (handlerBranch === 'onDisconnect') {
    return null;
  }

  if (deviceHandle === null || deviceHandle.length === 0) {
    return { kind: 'DeviceRef', handle: null, valid: false };
  }

  return createReferenceValue('DeviceRef', deviceHandle);
}
