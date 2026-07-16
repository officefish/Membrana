import { describe, expect, it } from 'vitest';

import { PanelGateController } from './panel-gate.controller';
import {
  mintSessionToken,
  mintPartnerSessionToken,
  resolveIdentity,
  PANEL_SESSION_COOKIE,
  type PanelIdentity,
} from './panel-auth-core';

const SECRET = 'gate-test-secret';
const NOW = 1_000_000;

function identityFrom(token?: string): PanelIdentity {
  const cookie = token ? `${PANEL_SESSION_COOKIE}=${token}` : undefined;
  return resolveIdentity(cookie, SECRET, NOW);
}

function fakeRes() {
  return {
    code: 0,
    ended: false,
    status(c: number) {
      this.code = c;
      return this;
    },
    end() {
      this.ended = true;
    },
  };
}

function gate(sectionId: string, identity: PanelIdentity): number {
  const res = fakeRes();
  new PanelGateController().gate(
    sectionId,
    { panelIdentity: identity } as never,
    res as never,
  );
  return res.code;
}

describe('PanelGateController — forward_auth маршрут-моста', () => {
  it('owner с валидной подписью → 204 (allow)', () => {
    const token = mintSessionToken(SECRET, 'owner', 'gh:1', NOW + 3600);
    expect(gate('graphify', identityFrom(token))).toBe(204);
  });

  it('graphify owner-only: operator/ally/public → 403', () => {
    expect(gate('graphify', identityFrom(mintSessionToken(SECRET, 'operator', 'x', NOW + 3600)))).toBe(403);
    expect(gate('graphify', identityFrom(mintSessionToken(SECRET, 'ally', 'x', NOW + 3600)))).toBe(403);
    expect(gate('graphify', identityFrom(undefined))).toBe(403);
  });

  it('grant graphify НЕ открывает owner-раздел (лестница ролей не размывается)', () => {
    const token = mintPartnerSessionToken(SECRET, 'user:1', ['graphify', '*'], 1, NOW + 3600);
    expect(gate('graphify', identityFrom(token))).toBe(403);
  });

  it('битая подпись → identity public → 403', () => {
    const token = mintSessionToken(SECRET, 'owner', 'x', NOW + 3600);
    expect(gate('graphify', identityFrom(`${token.slice(0, -2)}xx`))).toBe(403);
  });

  it('токен подписан чужим секретом → 403', () => {
    const token = mintSessionToken('other-secret', 'owner', 'x', NOW + 3600);
    expect(gate('graphify', identityFrom(token))).toBe(403);
  });

  it('просроченный токен → public → 403', () => {
    const token = mintSessionToken(SECRET, 'owner', 'x', NOW - 1);
    expect(gate('graphify', identityFrom(token))).toBe(403);
  });

  it('раздел не под мостом → 404 (даже owner)', () => {
    const token = mintSessionToken(SECRET, 'owner', 'x', NOW + 3600);
    expect(gate('research-tree', identityFrom(token))).toBe(404);
    expect(gate('nonsense', identityFrom(undefined))).toBe(404);
  });
});
