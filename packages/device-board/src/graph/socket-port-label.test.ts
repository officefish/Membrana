import { describe, expect, it } from 'vitest';

import { formatSocketPortLabel } from './socket-port-label.js';

describe('formatSocketPortLabel', () => {
  it('formats reference ports with ampersand prefix', () => {
    expect(
      formatSocketPortLabel({ name: 'device', kind: 'data', socketType: 'DeviceRef' }),
    ).toBe('& device');
    expect(
      formatSocketPortLabel({ name: 'value', kind: 'data', socketType: 'MicrophoneRef' }),
    ).toBe('& microphone');
  });

  it('formats nullable port as & null', () => {
    expect(
      formatSocketPortLabel({ name: 'device', kind: 'data', socketType: 'DeviceRef', nullable: true }),
    ).toBe('& null');
  });

  it('formats exec ports', () => {
    expect(formatSocketPortLabel({ name: 'exec-in', kind: 'exec' })).toBe('exec');
  });
});
