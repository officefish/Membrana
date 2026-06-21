import { describe, expect, it } from 'vitest';

import {
  proposeNewFunctionPin,
  removeFunctionPinFromList,
  updateFunctionPinInList,
} from './function-pin-ops.js';
import { createDefaultFunctionExecInputPin } from '@membrana/core';

describe('function-pin-ops', () => {
  it('proposeNewFunctionPin respects max count', () => {
    const pins = Array.from({ length: 9 }, (_, index) => ({
      id: `p-${index}`,
      name: `p-${index}`,
      kind: 'data' as const,
      socketType: 'DeviceRef' as const,
    }));
    const result = proposeNewFunctionPin('input', 'exec', pins);
    expect('error' in result).toBe(true);
  });

  it('removeFunctionPinFromList keeps at least one pin', () => {
    const pins = [createDefaultFunctionExecInputPin()];
    const result = removeFunctionPinFromList(pins, 'exec-in');
    expect('error' in result).toBe(true);
  });

  it('updateFunctionPinInList renames id from name', () => {
    const pins = [{ id: 'data-in', name: 'data-in', kind: 'data' as const, socketType: 'DeviceRef' as const }];
    const result = updateFunctionPinInList(pins, 'data-in', { name: 'device ref' });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.pins[0]?.name).toBe('device ref');
      expect(result.renamedFrom).toBe('data-in');
      expect(result.renamedTo).toBe('device-ref');
    }
  });
});
