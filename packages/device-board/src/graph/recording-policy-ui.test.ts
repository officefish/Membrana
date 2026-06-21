import { describe, expect, it } from 'vitest';

import {
  captureFormatInspectorLabel,
  formatRecordingPolicyBadge,
} from './recording-policy-ui.js';

describe('recording-policy-ui (A3)', () => {
  it('formats badge with windowSec and captureFormat', () => {
    expect(formatRecordingPolicyBadge({ windowSec: 5, captureFormat: 'wav' })).toBe('5s · WAV');
    expect(formatRecordingPolicyBadge({ windowSec: 10, captureFormat: 'webm' })).toBe('10s · WEBM');
  });

  it('resolves invalid windowSec to nearest preset in badge', () => {
    expect(formatRecordingPolicyBadge({ windowSec: 99, captureFormat: 'invalid' as 'wav' })).toBe(
      '30s · WAV',
    );
  });

  it('labels capture formats for inspector select', () => {
    expect(captureFormatInspectorLabel('wav')).toContain('WAV');
    expect(captureFormatInspectorLabel('webm')).toContain('WebM');
  });
});
