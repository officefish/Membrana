import { describe, expect, it } from 'vitest';

import { createReferenceValue, createDateTimeValue } from '@membrana/core';

import {
  formatReferenceForPrint,
  formatVariableValueForPrint,
  formatVariableValueForPrintRuntime,
} from './format-reference.js';
import { createStubScenarioRuntimeHost } from './host.js';

describe('format-reference (DBR5)', () => {
  it('formats valid and invalid references for Print (sync fallback)', () => {
    expect(formatReferenceForPrint(null)).toBe('null');
    expect(formatReferenceForPrint(createReferenceValue('DeviceRef', 'dev-1'))).toBe(
      'device(dev-1, valid)',
    );
    expect(
      formatReferenceForPrint({ kind: 'DeviceRef', handle: 'dev-1', valid: false }),
    ).toBe('device(dev-1, invalid)');
  });

  it('formats DateTime value as ISO for Print', () => {
    expect(formatVariableValueForPrint(createDateTimeValue('2026-06-18T12:00:00.000Z'))).toBe(
      '2026-06-18T12:00:00.000Z',
    );
  });

  it('runtime Print resolves reference metadata from host', async () => {
    const host = createStubScenarioRuntimeHost({
      getResourceMetadata: (ref) => ({
        fields: {
          sample: ref.handle ?? 'null',
        },
      }),
    });
    const line = await formatVariableValueForPrintRuntime(
      createReferenceValue('ServerRef', 'srv-1'),
      host,
    );
    expect(line).toContain('server(srv-1)');
    expect(line).toContain('sample: srv-1');
  });

  it('runtime Print returns ISO datetime without prefix', async () => {
    const host = createStubScenarioRuntimeHost();
    const line = await formatVariableValueForPrintRuntime(
      createDateTimeValue('2026-06-18T12:00:00.000Z'),
      host,
    );
    expect(line).toBe('2026-06-18T12:00:00.000Z');
  });
});
