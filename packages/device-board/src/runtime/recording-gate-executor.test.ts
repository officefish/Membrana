import { describe, expect, it } from 'vitest';

import {
  IS_RECORDING_WINDOW_FULL_FALSE_HANDLE,
  IS_RECORDING_WINDOW_FULL_TRUE_HANDLE,
} from '../graph/is-recording-window-full-node.js';

describe('recording-gate-executor (R3)', () => {
  it('gate exec branch handles match is-valid convention', () => {
    expect(IS_RECORDING_WINDOW_FULL_TRUE_HANDLE).toBe('exec-true-out');
    expect(IS_RECORDING_WINDOW_FULL_FALSE_HANDLE).toBe('exec-false-out');
  });
});
