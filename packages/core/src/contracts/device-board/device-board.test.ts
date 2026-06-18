import { describe, expect, it } from 'vitest';

import {
  createEmptyDeviceScenarioDocument,
  createReferenceValue,
  createScenarioVariable,
  D0_SOCKET_TYPES,
  invalidateReference,
  isReferenceSocketType,
  isScenarioNodeKind,
  isSystemScenarioNodeKind,
  isValidSocketConnection,
  parseDeviceScenarioDocument,
  DEVICE_SCENARIO_DOCUMENT_VERSION,
  DEVICE_SCENARIO_MIN_DOCUMENT_VERSION,
} from './index.js';

describe('device-board contracts', () => {
  it('D0_SOCKET_TYPES are valid socket connection pairs', () => {
    for (const type of D0_SOCKET_TYPES) {
      expect(isValidSocketConnection(type, type)).toBe(true);
      expect(isValidSocketConnection(type, 'Detection')).toBe(false);
    }
  });

  it('createEmptyDeviceScenarioDocument has required branches (v0.4)', () => {
    const doc = createEmptyDeviceScenarioDocument('microphone');
    expect(doc.version).toBe(DEVICE_SCENARIO_DOCUMENT_VERSION);
    expect(doc.scenario.loops.main.entry).toBe('main-entry');
    expect(doc.scenario.triggers.onDisconnect.entry).toBe('on-disconnect-entry');
    expect(doc.scenario.onConnect.entry).toBe('on-connect-entry');
    expect(doc.scenario.variables).toEqual([]);
  });

  it('parseDeviceScenarioDocument accepts minimal valid document', () => {
    const doc = createEmptyDeviceScenarioDocument('microphone');
    const parsed = parseDeviceScenarioDocument(doc);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.deviceKind).toBe('microphone');
    }
  });

  it('parseDeviceScenarioDocument rejects newer version', () => {
    const doc = {
      ...createEmptyDeviceScenarioDocument('microphone'),
      version: DEVICE_SCENARIO_DOCUMENT_VERSION + 1,
    };
    const parsed = parseDeviceScenarioDocument(doc);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.field).toBe('version');
    }
  });

  it('parseDeviceScenarioDocument round-trips a v2 document', () => {
    const doc = createEmptyDeviceScenarioDocument('microphone');
    const parsed = parseDeviceScenarioDocument(doc);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value).toEqual(doc);
    }
  });

  it('parseDeviceScenarioDocument migrates a legacy v1 document (initial→onStart, +onConnect, +variables)', () => {
    const v2 = createEmptyDeviceScenarioDocument('microphone');
    // Сымитировать документ v1: без onConnect / variables, version 1.
    const { onConnect: _omitConnect, variables: _omitVars, ...legacyScenario } = v2.scenario;
    const v1Doc = {
      ...v2,
      version: DEVICE_SCENARIO_MIN_DOCUMENT_VERSION,
      scenario: legacyScenario,
    };
    const parsed = parseDeviceScenarioDocument(v1Doc);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.version).toBe(DEVICE_SCENARIO_DOCUMENT_VERSION);
      expect(parsed.value.scenario.onConnect.entry).toBe('on-connect-entry');
      expect(parsed.value.scenario.variables).toEqual([]);
      // initial (≡ onStart) сохраняется без изменений.
      expect(parsed.value.scenario.initial.entry).toBe('initial-entry');
    }
  });

  it('parseDeviceScenarioDocument rejects malformed scenario.variables', () => {
    const doc = createEmptyDeviceScenarioDocument('microphone');
    const bad = {
      ...doc,
      scenario: { ...doc.scenario, variables: [{ id: 'v1', name: 'mic', type: 'NotAType', value: null }] },
    };
    const parsed = parseDeviceScenarioDocument(bad);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.field).toBe('scenario.variables.0');
    }
  });
});

describe('device-board reference types & node kinds (v0.4)', () => {
  it('reference socket types connect by identical type', () => {
    expect(isReferenceSocketType('DeviceRef')).toBe(true);
    expect(isReferenceSocketType('MicrophoneRef')).toBe(true);
    expect(isReferenceSocketType('AudioFrame')).toBe(false);
    expect(isValidSocketConnection('DeviceRef', 'DeviceRef')).toBe(true);
    expect(isValidSocketConnection('DeviceRef', 'MicrophoneRef')).toBe(false);
  });

  it('scenario node kinds: event is system, print is not', () => {
    expect(isScenarioNodeKind('event')).toBe(true);
    expect(isScenarioNodeKind('print')).toBe(true);
    expect(isScenarioNodeKind('unknown')).toBe(false);
    expect(isSystemScenarioNodeKind('event')).toBe(true);
    expect(isSystemScenarioNodeKind('print')).toBe(false);
  });

  it('reference values carry validity (onConnect→valid, onDisconnect→invalid)', () => {
    const ref = createReferenceValue('DeviceRef', 'dev-1');
    expect(ref.valid).toBe(true);
    expect(ref.handle).toBe('dev-1');
    const dropped = invalidateReference(ref);
    expect(dropped.valid).toBe(false);
    expect(dropped.handle).toBe('dev-1');
  });

  it('scenario variable starts unset', () => {
    const variable = createScenarioVariable('var-mic', 'Microphone', 'MicrophoneRef');
    expect(variable.value).toBeNull();
    expect(variable.type).toBe('MicrophoneRef');
  });
});
