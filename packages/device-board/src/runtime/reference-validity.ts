import {
  createDateTimeValue,
  createIntegerValue,
  createReferenceValue,
  invalidateReference,
  isScenarioReferenceValue,
  type ScenarioDateTimeValue,
  type ScenarioIntegerValue,
  type ScenarioReferenceValue,
  type ScenarioStringValue,
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

function integersEqual(left: ScenarioIntegerValue, right: ScenarioIntegerValue): boolean {
  return left.value === right.value;
}

function stringsEqual(left: ScenarioStringValue, right: ScenarioStringValue): boolean {
  return left.value === right.value;
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
    if (variable.type === 'Integer') {
      if (variable.value === null) {
        return variable;
      }
      return { ...variable, value: null };
    }
    if (variable.type === 'String') {
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

  if (incoming.kind === 'Integer') {
    const current = variable.value;
    if (current !== null && current.kind === 'Integer' && integersEqual(current, incoming)) {
      return variable;
    }
    return { ...variable, value: incoming };
  }

  if (incoming.kind === 'String') {
    const current = variable.value;
    if (current !== null && current.kind === 'String' && stringsEqual(current, incoming)) {
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
 * onTick `deltatime`: elapsed с начала сценария, выраженный как DateTime (offset от Unix epoch).
 */
export function resolveLoopTickDeltaTime(elapsedMs: number): ScenarioDateTimeValue {
  return createDateTimeValue(new Date(Math.max(0, elapsedMs)).toISOString());
}

/**
 * onTick `tickMs`: миллисекунды с предыдущего тика цикла.
 */
export function resolveLoopTickMs(tickMs: number): ScenarioIntegerValue {
  return createIntegerValue(Math.max(0, Math.round(tickMs)));
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
 * Значение data-выхода `device` глобального узла Device и loop/main контекста.
 * Аналог Event device, но без привязки к handler branch.
 */
export function resolveGlobalDeviceReference(
  deviceHandle: string | null | undefined,
): ScenarioReferenceValue {
  if (deviceHandle === null || deviceHandle === undefined || deviceHandle.length === 0) {
    return { kind: 'DeviceRef', handle: null, valid: false };
  }
  return createReferenceValue('DeviceRef', deviceHandle);
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
