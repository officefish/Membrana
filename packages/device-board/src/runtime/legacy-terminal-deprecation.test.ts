import { describe, expect, it, vi } from 'vitest';

import {
  isLegacyTerminalNodeKind,
  LEGACY_TERMINAL_MIGRATION_HINT,
  logLegacyTerminalDeprecation,
} from './legacy-terminal-deprecation.js';

describe('legacy-terminal-deprecation (DBJ5)', () => {
  it('identifies legacy terminal node kinds', () => {
    expect(isLegacyTerminalNodeKind('new-track')).toBe(true);
    expect(isLegacyTerminalNodeKind('new-fft-trends-analysis')).toBe(true);
    expect(isLegacyTerminalNodeKind('publish-report')).toBe(false);
  });

  it('logs migration hint', () => {
    const log = vi.fn();
    logLegacyTerminalDeprecation(log, 'new-track', 'nt-1');
    expect(log).toHaveBeenCalledWith('legacy-terminal-deprecated', {
      nodeKind: 'new-track',
      nodeId: 'nt-1',
      migration: LEGACY_TERMINAL_MIGRATION_HINT,
    });
  });
});
