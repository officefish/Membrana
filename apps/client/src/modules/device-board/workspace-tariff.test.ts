import { describe, expect, it } from 'vitest';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import {
  FREE_V1_WORKSPACE_TARIFF,
  formatWorkspaceQuotaMessage,
  resolveWorkspaceTariff,
} from './workspace-tariff.js';

const PAIRING: PairedNodeCredentials = {
  deviceId: 'dev-1',
  mediaApiUrl: 'https://media.example',
  mediaToken: 't',
  token: 'cab',
  expiresAt: '2099-01-01T00:00:00.000Z',
  membraneId: 'm',
  nodeId: 'n',
  nodeLabel: 'node',
};

describe('resolveWorkspaceTariff', () => {
  it('uses local free-v1 mirror when autonomous', () => {
    expect(resolveWorkspaceTariff('autonomous', null)).toEqual({
      ...FREE_V1_WORKSPACE_TARIFF,
      source: 'local',
    });
  });

  it('uses paired tariff from cabinet when present', () => {
    expect(resolveWorkspaceTariff('paired', { ...PAIRING, maxUserWorkspaces: 10 })).toEqual({
      sku: 'free-v1',
      maxUserWorkspaces: 10,
      source: 'paired',
    });
  });

  it('falls back to local free-v1 when pair omits quota', () => {
    expect(resolveWorkspaceTariff('paired', PAIRING)).toEqual({
      ...FREE_V1_WORKSPACE_TARIFF,
      source: 'local',
    });
  });
});

describe('formatWorkspaceQuotaMessage', () => {
  it('only applies when used >= max', () => {
    expect(formatWorkspaceQuotaMessage(3, 3)).toContain('3/3');
    expect(formatWorkspaceQuotaMessage(2, 3)).toContain('2/3');
  });
});
