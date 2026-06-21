import { describe, expect, it } from 'vitest';

import { defaultVariableNamePrefix } from './variable-node.js';

describe('defaultVariableNamePrefix', () => {
  it('maps JournalRef to journal', () => {
    expect(defaultVariableNamePrefix('JournalRef')).toBe('journal');
  });

  it('maps known value types', () => {
    expect(defaultVariableNamePrefix('DateTime')).toBe('datetime');
    expect(defaultVariableNamePrefix('Integer')).toBe('integer');
    expect(defaultVariableNamePrefix('String')).toBe('string');
    expect(defaultVariableNamePrefix('RecordingPolicy')).toBe('recordingpolicy');
  });
});
