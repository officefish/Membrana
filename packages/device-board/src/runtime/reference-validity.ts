import {
  createDateTimeValue,
  createReferenceValue,
  invalidateReference,
  isScenarioReferenceValue,
  type ScenarioDateTimeValue,
  type ScenarioReferenceValue,
  type ScenarioVariable,
  type ScenarioVariableValue,
} from '@membrana/core';

/** Чистый предикат валидности ссылки (используется `is-valid` и UI). */
export function isReferenceValid(value: ScenarioVariableValue | null): boolean {
  if (value === null || !isScenarioReferenceValue(value)) {
    return false;
  }
  return value.valid;
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

function dateTimesEqual(left: ScenarioDateTimeValue, right: ScenarioDateTimeValue): boolean {
  return left.iso === right.iso;
}

/**
 * Семантика записи переменной из dataflow:
 * - ссылочные: `null` (onDisconnect) → invalidate; value-типы: `null` → сброс;
 * - валидное значение → заменить;
 * - идемпотентность: то же значение не создаёт новый объект.
 */
export function applyVariableSetValue(
  variable: ScenarioVariable,
  incoming: ScenarioVariableValue | null,
): ScenarioVariable {
  if (incoming === null) {
    if (variable.type === 'DateTime') {
      if (variable.value === null) {
        return variable;
      }
      return { ...variable, value: null };
    }
    if (variable.value === null) {
      return variable;
    }
    if (!isScenarioReferenceValue(variable.value)) {
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

  if (incoming.kind === 'DateTime') {
    const current = variable.value;
    if (current !== null && current.kind === 'DateTime' && dateTimesEqual(current, incoming)) {
      return variable;
    }
    return { ...variable, value: incoming };
  }

  const incomingRef = incoming;
  const currentRef = isScenarioReferenceValue(variable.value) ? variable.value : null;
  if (referencesEqual(currentRef, incomingRef)) {
    return variable;
  }

  return { ...variable, value: incoming };
}

/**
 * Значение data-выхода `datetime` системного Event-узла.
 */
export function resolveEventDateTime(triggeredAt: string | undefined): ScenarioDateTimeValue {
  const iso = triggeredAt ?? new Date().toISOString();
  return createDateTimeValue(iso);
}

/**
 * Значение data-выхода `server` системного Event-узла (onConnect).
 */
export function resolveEventServerReference(
  handlerBranch: 'onConnect' | 'initial' | 'onStop' | 'onDisconnect',
  serverHandle: string | null | undefined,
): ScenarioReferenceValue | null {
  if (handlerBranch !== 'onConnect') {
    return null;
  }
  if (serverHandle === null || serverHandle === undefined || serverHandle.length === 0) {
    return { kind: 'ServerRef', handle: null, valid: false };
  }
  return createReferenceValue('ServerRef', serverHandle);
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
