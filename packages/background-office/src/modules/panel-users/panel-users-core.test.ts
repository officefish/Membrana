import { describe, expect, it } from 'vitest';

import {
  AUDIT_CAP,
  appendAudit,
  codePrefix,
  emptyState,
  generatePromoCode,
  grantsAllowSection,
  mintCode,
  normalizeGrants,
  parseState,
  redeemCode,
  revokeCode,
  revokeUser,
  setUserGrants,
  type PanelUsersState,
} from './panel-users-core';

const NOW_SEC = 1_800_000_000;
const NOW_ISO = '2026-07-14T18:00:00.000Z';

function stateWithCode(overrides: Partial<Parameters<typeof mintCode>[1]> = {}): {
  state: PanelUsersState;
  code: string;
} {
  const { state, code } = mintCode(
    emptyState(),
    { label: 'press', grants: ['*'], expiresAt: NOW_SEC + 3600, maxUses: 2, ...overrides },
    'owner',
    NOW_ISO,
  );
  return { state, code: code.code };
}

describe('panel-users-core: гранты', () => {
  it("wildcard '*' открывает любой раздел; точный грант — только свой", () => {
    expect(grantsAllowSection(['*'], 'detector-compare')).toBe(true);
    expect(grantsAllowSection(['*'], 'будущий-раздел')).toBe(true);
    expect(grantsAllowSection(['drift-anchors'], 'drift-anchors')).toBe(true);
    expect(grantsAllowSection(['drift-anchors'], 'detector-compare')).toBe(false);
    expect(grantsAllowSection([], 'detector-compare')).toBe(false);
  });

  it('normalizeGrants: трим, дедуп, отбрасывание мусора', () => {
    expect(normalizeGrants([' a ', 'a', '', 42, 'b'])).toEqual(['a', 'b']);
    expect(normalizeGrants('not-array')).toEqual([]);
  });
});

describe('panel-users-core: промокоды', () => {
  it('generatePromoCode — 16 символов алфавита base32, детерминизм по rng', () => {
    const code = generatePromoCode();
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTVWXYZ0-9]{16}$/);
    const fixed = generatePromoCode(() => Buffer.alloc(16, 0));
    expect(fixed).toBe('A'.repeat(16));
    expect(codePrefix(fixed)).toBe('AAAA…');
  });

  it('mintCode пишет аудит и код с нулевым счётчиком', () => {
    const { state } = stateWithCode();
    expect(state.codes).toHaveLength(1);
    expect(state.codes[0]!.usedCount).toBe(0);
    expect(state.audit.at(-1)!.action).toBe('mint-code');
  });

  it('revokeCode: отзыв работает один раз, несуществующий id → null', () => {
    const { state } = stateWithCode();
    const revoked = revokeCode(state, state.codes[0]!.id, 'owner', NOW_ISO)!;
    expect(revoked.codes[0]!.revoked).toBe(true);
    expect(revokeCode(revoked, state.codes[0]!.id, 'owner', NOW_ISO)).toBeNull();
    expect(revokeCode(state, 'nope', 'owner', NOW_ISO)).toBeNull();
  });
});

describe('panel-users-core: регистрация', () => {
  it('успех: пользователь получает гранты кода, usedCount растёт, аудит пишется', () => {
    const { state, code } = stateWithCode();
    const result = redeemCode(state, code.toLowerCase(), '  Пётр  ', NOW_SEC, NOW_ISO)!;
    expect(result.user.name).toBe('Пётр');
    expect(result.user.grants).toEqual(['*']);
    expect(result.user.permVersion).toBe(1);
    expect(result.state.codes[0]!.usedCount).toBe(1);
    expect(result.state.audit.at(-1)!.action).toBe('register');
  });

  it('отказ одинаков для всех причин: нет кода / истёк / исчерпан / отозван / пустое имя', () => {
    const { state, code } = stateWithCode({ maxUses: 1 });
    expect(redeemCode(state, 'WRONGCODE0000000', 'X', NOW_SEC, NOW_ISO)).toBeNull();
    expect(redeemCode(state, code, '   ', NOW_SEC, NOW_ISO)).toBeNull();

    const expired = stateWithCode({ expiresAt: NOW_SEC - 1 });
    expect(redeemCode(expired.state, expired.code, 'X', NOW_SEC, NOW_ISO)).toBeNull();

    const used = redeemCode(state, code, 'first', NOW_SEC, NOW_ISO)!;
    expect(redeemCode(used.state, code, 'second', NOW_SEC, NOW_ISO)).toBeNull();

    const revoked = revokeCode(state, state.codes[0]!.id, 'owner', NOW_ISO)!;
    expect(redeemCode(revoked, code, 'X', NOW_SEC, NOW_ISO)).toBeNull();
  });
});

describe('panel-users-core: галочки и эпоха', () => {
  it('setUserGrants инкрементит permVersion и пишет аудит с прошлым набором', () => {
    const { state, code } = stateWithCode();
    const { state: withUser, user } = redeemCode(state, code, 'Пётр', NOW_SEC, NOW_ISO)!;
    const next = setUserGrants(withUser, user.id, ['detector-compare'], 'github:1:owner', NOW_ISO)!;
    const updated = next.users[0]!;
    expect(updated.grants).toEqual(['detector-compare']);
    expect(updated.permVersion).toBe(2);
    expect(next.audit.at(-1)!.detail).toContain('было [*]');
    expect(setUserGrants(withUser, 'nope', [], 'owner', NOW_ISO)).toBeNull();
  });

  it('revokeUser: одна попытка, permVersion растёт (cookie-эпоха отстанет)', () => {
    const { state, code } = stateWithCode();
    const { state: withUser, user } = redeemCode(state, code, 'Пётр', NOW_SEC, NOW_ISO)!;
    const next = revokeUser(withUser, user.id, 'owner', NOW_ISO)!;
    expect(next.users[0]!.revoked).toBe(true);
    expect(next.users[0]!.permVersion).toBe(2);
    expect(revokeUser(next, user.id, 'owner', NOW_ISO)).toBeNull();
  });
});

describe('panel-users-core: аудит и парс', () => {
  it('аудит капится: старые записи отрезаются с головы', () => {
    let state = emptyState();
    for (let i = 0; i < AUDIT_CAP + 10; i++) {
      state = appendAudit(state, {
        at: NOW_ISO,
        actor: 'owner',
        action: 'grants',
        target: `u${i}`,
        detail: '',
      });
    }
    expect(state.audit).toHaveLength(AUDIT_CAP);
    expect(state.audit[0]!.target).toBe('u10');
  });

  it('parseState: круговорот сериализации; мусор → null', () => {
    const { state } = stateWithCode();
    expect(parseState(JSON.stringify(state))).toEqual(state);
    expect(parseState('not json')).toBeNull();
    expect(parseState('{"schemaVersion":2,"users":[],"codes":[]}')).toBeNull();
    expect(parseState('{"schemaVersion":1,"users":{}}')).toBeNull();
  });
});
