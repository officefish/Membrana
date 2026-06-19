import { describe, expect, it } from 'vitest';

import { createReferenceValue, createDateTimeValue } from '@membrana/core';

import { formatReferenceForPrint, formatVariableValueForPrint } from './format-reference.js';

describe('format-reference (DBR5)', () => {
  it('formats valid and invalid references for Print', () => {
    expect(formatReferenceForPrint(null)).toBe('null');
    expect(formatReferenceForPrint(createReferenceValue('DeviceRef', 'dev-1'))).toBe(
      'DeviceRef(dev-1, valid)',
    );
    expect(
      formatReferenceForPrint({ kind: 'DeviceRef', handle: 'dev-1', valid: false }),
    ).toBe('DeviceRef(dev-1, invalid)');
  });

  it('formats DateTime value for Print', () => {
    expect(formatVariableValueForPrint(createDateTimeValue('2026-06-18T12:00:00.000Z'))).toBe(
      'DateTime(2026-06-18T12:00:00.000Z)',
    );
  });
});
