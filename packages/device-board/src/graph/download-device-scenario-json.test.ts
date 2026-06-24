import { createEmptyDeviceScenarioDocument } from '@membrana/core';
import { describe, expect, it } from 'vitest';

import { deviceScenarioExportFilename } from './download-device-scenario-json.js';

describe('deviceScenarioExportFilename', () => {
  it('uses explicit label when provided', () => {
    const document = createEmptyDeviceScenarioDocument('microphone');
    expect(deviceScenarioExportFilename(document, { label: 'My Scenario' })).toBe('My-Scenario.json');
  });

  it('falls back to meta.title', () => {
    const document = {
      ...createEmptyDeviceScenarioDocument('microphone'),
      meta: { title: 'MVP Microphone' },
    };
    expect(deviceScenarioExportFilename(document)).toBe('MVP-Microphone.json');
  });

  it('strips trailing .json from explicit label', () => {
    const document = createEmptyDeviceScenarioDocument('microphone');
    expect(deviceScenarioExportFilename(document, { label: 'foo.document.json' })).toBe(
      'foo.document.json',
    );
  });

  it('falls back to device kind when meta is empty', () => {
    const document = createEmptyDeviceScenarioDocument('microphone');
    expect(deviceScenarioExportFilename(document)).toBe('device-scenario-microphone.json');
  });
});
