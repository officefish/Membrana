import { describe, expect, it } from 'vitest';

import {
  createEmptyDeviceScenarioDocument,
  D0_SOCKET_TYPES,
  isValidSocketConnection,
  parseDeviceScenarioDocument,
  DEVICE_SCENARIO_DOCUMENT_VERSION,
} from './index.js';

describe('device-board contracts', () => {
  it('D0_SOCKET_TYPES are valid socket connection pairs', () => {
    for (const type of D0_SOCKET_TYPES) {
      expect(isValidSocketConnection(type, type)).toBe(true);
      expect(isValidSocketConnection(type, 'Detection')).toBe(false);
    }
  });

  it('createEmptyDeviceScenarioDocument has required branches', () => {
    const doc = createEmptyDeviceScenarioDocument('microphone');
    expect(doc.version).toBe(DEVICE_SCENARIO_DOCUMENT_VERSION);
    expect(doc.scenario.loops.main.entry).toBe('main-entry');
    expect(doc.scenario.triggers.onDisconnect.entry).toBe('on-disconnect-entry');
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
});
