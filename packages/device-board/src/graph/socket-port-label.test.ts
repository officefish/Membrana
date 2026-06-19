import { describe, expect, it } from 'vitest';

import {
  IS_VALID_FALSE_HANDLE,
  IS_VALID_TRUE_HANDLE,
} from './palette-node.js';
import { formatSocketPortLabel } from './socket-port-label.js';

describe('formatSocketPortLabel', () => {
  it('formats reference ports with ampersand prefix', () => {
    expect(
      formatSocketPortLabel({ name: 'device', kind: 'data', socketType: 'DeviceRef' }),
    ).toBe('& device');
    expect(
      formatSocketPortLabel({ name: 'value', kind: 'data', socketType: 'MicrophoneRef' }),
    ).toBe('& microphone');
    expect(
      formatSocketPortLabel({ name: 'server', kind: 'data', socketType: 'ServerRef' }),
    ).toBe('& server');
  });

  it('formats nullable port as & null', () => {
    expect(
      formatSocketPortLabel({ name: 'device', kind: 'data', socketType: 'DeviceRef', nullable: true }),
    ).toBe('& null');
  });

  it('formats DateTime port as datetime (value, no ampersand)', () => {
    expect(
      formatSocketPortLabel({ name: 'datetime', kind: 'data', socketType: 'DateTime' }),
    ).toBe('datetime');
  });

  it('formats exec ports', () => {
    expect(formatSocketPortLabel({ name: 'exec-in', kind: 'exec' })).toBe('exec');
  });

  it('formats is-valid branch outputs as true/false', () => {
    expect(formatSocketPortLabel({ name: IS_VALID_TRUE_HANDLE, kind: 'exec' })).toBe('true');
    expect(formatSocketPortLabel({ name: IS_VALID_FALSE_HANDLE, kind: 'exec' })).toBe('false');
  });
});
