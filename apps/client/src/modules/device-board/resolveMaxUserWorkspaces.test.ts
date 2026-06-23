import { describe, expect, it } from 'vitest';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { DEFAULT_MAX_USER_WORKSPACES, resolveMaxUserWorkspaces } from './resolveMaxUserWorkspaces';

const basePairing: PairedNodeCredentials = {
  token: 't',
  expiresAt: '2026-12-31T00:00:00.000Z',
  deviceId: 'd',
  mediaToken: 'm',
  mediaApiUrl: 'http://localhost:3010',
  membraneId: 'mem',
  nodeId: 'node',
  nodeLabel: 'Узел 1',
};

describe('resolveMaxUserWorkspaces', () => {
  it('returns default for autonomous mode', () => {
    expect(resolveMaxUserWorkspaces('autonomous', null)).toBe(DEFAULT_MAX_USER_WORKSPACES);
  });

  it('returns default when paired without tariff field', () => {
    expect(resolveMaxUserWorkspaces('paired', basePairing)).toBe(DEFAULT_MAX_USER_WORKSPACES);
  });

  it('uses tariff quota when paired', () => {
    expect(
      resolveMaxUserWorkspaces('paired', { ...basePairing, maxUserWorkspaces: 10 }),
    ).toBe(10);
  });

  it('falls back for invalid tariff values', () => {
    expect(
      resolveMaxUserWorkspaces('paired', { ...basePairing, maxUserWorkspaces: 0 }),
    ).toBe(DEFAULT_MAX_USER_WORKSPACES);
    expect(
      resolveMaxUserWorkspaces('paired', { ...basePairing, maxUserWorkspaces: Number.NaN }),
    ).toBe(DEFAULT_MAX_USER_WORKSPACES);
  });
});
