import { describe, expect, it } from 'vitest';

import { scrubLogMessage } from './shell-log-scrub';

describe('scrubLogMessage', () => {
  it('redacts Bearer tokens', () => {
    expect(scrubLogMessage('fetch failed Bearer abc123.xyz')).toBe(
      'fetch failed Bearer [redacted]',
    );
  });

  it('redacts pairingToken fields', () => {
    expect(scrubLogMessage("pairingToken: 'secret-key-99'")).toBe('pairingToken [redacted]');
  });

  it('leaves device-board lines unchanged', () => {
    const line = "[device-board][media] upload-ok {runId: '092a986c'}";
    expect(scrubLogMessage(line)).toBe(line);
  });
});
