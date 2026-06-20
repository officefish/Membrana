import { describe, expect, it } from 'vitest';

import {
  createEmptyDeviceScenarioDocument,
  createDateTimeValue,
  createIntegerValue,
  createReferenceValue,
  createScenarioVariable,
  createStringValue,
  D0_SOCKET_TYPES,
  invalidateReference,
  isReferenceSocketType,
  isScenarioNodeKind,
  isScenarioDateTimeValue,
  isScenarioIntegerValue,
  isScenarioStringValue,
  isSystemScenarioNodeKind,
  isValidSocketConnection,
  isValueSocketType,
  migrateScenarioVariableLegacy,
  parseDeviceScenarioDocument,
  DEVICE_SCENARIO_DOCUMENT_VERSION,
  DEVICE_SCENARIO_MIN_DOCUMENT_VERSION,
  DEFAULT_SCENARIO_COLLECTOR_CONFIG,
  isCollectorScenarioNodeKind,
  isScenarioPinKind,
  isTerminalScenarioNodeKind,
  resolveScenarioCollectorConfig,
  formatJournalRefHandle,
  formatReporterRefHandle,
  parseJournalRefHandle,
  parseReporterRefJournalHandle,
  createScenarioReportPayload,
  isScenarioReportPayload,
  isKnownScenarioReportSchema,
  isJournalScenarioNodeKind,
  isReporterMethodScenarioNodeKind,
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
    expect(isReferenceSocketType('ServerRef')).toBe(true);
    expect(isReferenceSocketType('DateTime')).toBe(false);
    expect(isValueSocketType('DateTime')).toBe(true);
    expect(isValueSocketType('Integer')).toBe(true);
    expect(isValueSocketType('DeviceRef')).toBe(false);
    expect(isValidSocketConnection('DeviceRef', 'DeviceRef')).toBe(true);
    expect(isValidSocketConnection('DeviceRef', 'MicrophoneRef')).toBe(false);
    expect(isValidSocketConnection('DateTime', 'DateTime')).toBe(true);
    expect(isValidSocketConnection('Integer', 'Integer')).toBe(true);
    expect(isValidSocketConnection('DateTime', 'DeviceRef')).toBe(false);
  });

  it('scenario node kinds: event is system, print is not', () => {
    expect(isScenarioNodeKind('event')).toBe(true);
    expect(isScenarioNodeKind('print')).toBe(true);
    expect(isScenarioNodeKind('unknown')).toBe(false);
    expect(isSystemScenarioNodeKind('event')).toBe(true);
    expect(isSystemScenarioNodeKind('loop-repeat')).toBe(true);
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

  it('DateTime variable uses value shape (not reference)', () => {
    const variable = createScenarioVariable('var-dt', 'firedAt', 'DateTime');
    expect(variable.type).toBe('DateTime');
    const value = createDateTimeValue('2026-06-18T12:00:00.000Z');
    expect(isScenarioDateTimeValue(value)).toBe(true);
    expect(value.iso).toBe('2026-06-18T12:00:00.000Z');
  });

  it('Integer variable uses value shape', () => {
    const variable = createScenarioVariable('var-int', 'tickMs', 'Integer');
    expect(variable.type).toBe('Integer');
    const value = createIntegerValue(42.9);
    expect(isScenarioIntegerValue(value)).toBe(true);
    expect(value.value).toBe(42);
  });

  it('String variable uses value shape', () => {
    const variable = createScenarioVariable('var-str', 'logLine', 'String');
    expect(variable.type).toBe('String');
    expect(isValueSocketType('String')).toBe(true);
    const value = createStringValue('hello');
    expect(isScenarioStringValue(value)).toBe(true);
    expect(value.value).toBe('hello');
  });

  it('migrateScenarioVariableLegacy converts DateTimeRef to DateTime', () => {
    const legacy = {
      id: 'v1',
      name: 't',
      type: 'DateTimeRef',
      value: { kind: 'DateTimeRef', handle: '2026-01-01T00:00:00.000Z', valid: true },
    };
    const migrated = migrateScenarioVariableLegacy(legacy);
    expect(migrated).toEqual({
      id: 'v1',
      name: 't',
      type: 'DateTime',
      value: { kind: 'DateTime', iso: '2026-01-01T00:00:00.000Z' },
    });
  });
});

describe('device-board collectors v0.5 contracts (DBC0)', () => {
  it('v0.5 reference socket types include singletons and batch lists', () => {
    expect(isReferenceSocketType('RecorderRef')).toBe(true);
    expect(isReferenceSocketType('SpectralAnalyserRef')).toBe(true);
    expect(isReferenceSocketType('AudioSampleRefList')).toBe(true);
    expect(isReferenceSocketType('FftFrameRefList')).toBe(true);
    expect(isValidSocketConnection('AudioSampleRefList', 'AudioSampleRefList')).toBe(true);
    expect(isValidSocketConnection('AudioSampleRef', 'AudioSampleRefList')).toBe(false);
  });

  it('registers v0.5 node kinds and pin kind event', () => {
    expect(isScenarioNodeKind('get-recorder')).toBe(true);
    expect(isScenarioNodeKind('get-spectral-analyser')).toBe(true);
    expect(isScenarioNodeKind('collect-samples')).toBe(true);
    expect(isScenarioNodeKind('new-track')).toBe(true);
    expect(isCollectorScenarioNodeKind('collect-fft-frames')).toBe(true);
    expect(isTerminalScenarioNodeKind('new-fft-trends-analysis')).toBe(true);
    expect(isSystemScenarioNodeKind('get-recorder')).toBe(false);
    expect(isScenarioPinKind('event')).toBe(true);
  });

  it('resolveScenarioCollectorConfig applies mic plugin defaults', () => {
    expect(resolveScenarioCollectorConfig(undefined)).toEqual(DEFAULT_SCENARIO_COLLECTOR_CONFIG);
    expect(
      resolveScenarioCollectorConfig({ bufferSize: 4096, queueCapacity: 5 }),
    ).toMatchObject({ bufferSize: 4096, queueCapacity: 5, windowSec: 3 });
  });
});

describe('device-board journal + reporter v0.6 contracts (DBJ0)', () => {
  it('v0.6 reference socket types include journal, reporter, track, report, analysis', () => {
    for (const type of [
      'JournalRef',
      'ReporterRef',
      'TrackRef',
      'ReportRef',
      'FftTrendAnalysisRef',
    ] as const) {
      expect(isReferenceSocketType(type)).toBe(true);
      expect(isValidSocketConnection(type, type)).toBe(true);
    }
    expect(isValidSocketConnection('JournalRef', 'ReporterRef')).toBe(false);
  });

  it('registers v0.6 node kinds', () => {
    expect(isScenarioNodeKind('get-journal')).toBe(true);
    expect(isScenarioNodeKind('get-reporter')).toBe(true);
    expect(isScenarioNodeKind('make-report-from-track')).toBe(true);
    expect(isScenarioNodeKind('make-report-from-analysis')).toBe(true);
    expect(isScenarioNodeKind('publish-report')).toBe(true);
    expect(isJournalScenarioNodeKind('get-journal')).toBe(true);
    expect(isReporterMethodScenarioNodeKind('make-report-from-analysis')).toBe(true);
    expect(isTerminalScenarioNodeKind('publish-report')).toBe(true);
    expect(isSystemScenarioNodeKind('get-journal')).toBe(false);
  });

  it('journal and reporter handles are canonical per deviceId', () => {
    const deviceJournal = formatJournalRefHandle('device', 'dev-abc');
    expect(deviceJournal).toBe('journal:device:dev-abc');
    expect(parseJournalRefHandle(deviceJournal)).toEqual({
      scope: 'device',
      deviceId: 'dev-abc',
    });

    const serverJournal = formatJournalRefHandle('server', 'dev-abc');
    expect(serverJournal).toBe('journal:server:dev-abc');
    expect(parseJournalRefHandle(serverJournal)?.scope).toBe('server');

    const reporter = formatReporterRefHandle(deviceJournal);
    expect(reporter).toBe('reporter:journal:device:dev-abc');
    expect(parseReporterRefJournalHandle(reporter)).toBe(deviceJournal);
  });

  it('ScenarioReportPayload guard accepts known shapes', () => {
    const report = createScenarioReportPayload({
      schema: 'trends-fft-report/v1',
      reportId: 'r-1',
      trackId: 't-1',
      isDetected: true,
      summaryText: 'detected',
      payload: { confidence: 0.9 },
    });
    expect(isScenarioReportPayload(report)).toBe(true);
    expect(isKnownScenarioReportSchema('trends-fft-report/v1')).toBe(true);
    expect(isKnownScenarioReportSchema('unknown/v1')).toBe(false);
  });
});
