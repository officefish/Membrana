import { describe, expect, it } from 'vitest';

import { resolveNodeCardStatus, type NodeCardStatus } from './nodeCardStatus';

describe('resolveNodeCardStatus (#279)', () => {
  // Полная таблица кейсов (Dynin): paired × keyStatus × live.
  const cases: ReadonlyArray<
    [boolean, 'active' | 'expired' | 'revoked' | null, boolean, NodeCardStatus]
  > = [
    [false, null, false, 'not-paired'],
    [false, 'active', true, 'not-paired'],
    [true, 'revoked', true, 'key-revoked'],
    [true, 'revoked', false, 'key-revoked'],
    [true, 'expired', true, 'key-expired'],
    [true, 'expired', false, 'key-expired'],
    [true, 'active', true, 'online'],
    [true, 'active', false, 'offline'],
    // Старый сервер без поля (null) — деградация к прежнему поведению.
    [true, null, true, 'online'],
    [true, null, false, 'offline'],
  ];

  it.each(cases)('paired=%s key=%s live=%s → %s', (paired, keyStatus, live, expected) => {
    expect(
      resolveNodeCardStatus({ paired, pairedKeyStatus: keyStatus, deviceLive: live }),
    ).toBe(expected);
  });

  it('ключ важнее транспорта: expired при live-устройстве всё равно «ключ устарел»', () => {
    expect(
      resolveNodeCardStatus({ paired: true, pairedKeyStatus: 'expired', deviceLive: true }),
    ).toBe('key-expired');
  });
});
