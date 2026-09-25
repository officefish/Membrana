/**
 * Зубы двери «регистрация в кабинете по промокоду панели» (заседание M1,
 * ратифицировано владельцем 21.09; протокол
 * docs/seanses/cabinet-registration-promo-m1-grant-door-2026-09-21.md).
 *
 * Предмет: чистое ядро consumeCabinetRegistrationCode и замок единственного
 * пишущего контура. Каждый зуб красен на стволе: ни функции, ни замка там нет.
 */
import { describe, expect, it } from 'vitest';

import {
  CABINET_REGISTER_GRANT,
  consumeCabinetRegistrationCode,
  createStateLock,
  emptyState,
  mintCode,
  revokeCode,
  type PanelUsersState,
} from './panel-users-core';

const NOW_SEC = 1_800_000_000;
const NOW_ISO = '2026-09-22T09:00:00.000Z';

function stateWithCabinetCode(
  overrides: Partial<Parameters<typeof mintCode>[1]> = {},
): { state: PanelUsersState; code: string; codeId: string } {
  const { state, code } = mintCode(
    emptyState(),
    {
      label: 'кабинет',
      grants: [CABINET_REGISTER_GRANT],
      expiresAt: NOW_SEC + 3600,
      maxUses: 2,
      ...overrides,
    },
    'owner',
    NOW_ISO,
  );
  return { state, code: code.code, codeId: code.id };
}

function usedCountOf(state: PanelUsersState, codeId: string): number {
  return state.codes.find((c) => c.id === codeId)!.usedCount;
}

describe('дверь кабинета: литерал гранта', () => {
  it('грант — строка cabinet-register, проходит нормализацию и не является разделом', () => {
    expect(CABINET_REGISTER_GRANT).toBe('cabinet-register');
  });
});

describe('дверь кабинета: отказы и порядок предикатов', () => {
  it('нет такого кода → not_found', () => {
    const { state } = stateWithCabinetCode();
    const r = consumeCabinetRegistrationCode(state, 'НЕТТАКОГО', 'redeem', NOW_SEC, NOW_ISO);
    expect(r.outcome).toEqual({ ok: false, reason: 'not_found' });
  });

  it('код отозван → revoked, погашенное не откатывается', () => {
    const { state, code, codeId } = stateWithCabinetCode();
    const redeemed = consumeCabinetRegistrationCode(state, code, 'redeem', NOW_SEC, NOW_ISO);
    expect(redeemed.outcome).toMatchObject({ ok: true });
    expect(usedCountOf(redeemed.state, codeId)).toBe(1);

    const revoked = revokeCode(redeemed.state, codeId, 'owner', NOW_ISO)!;
    expect(usedCountOf(revoked, codeId)).toBe(1);

    const after = consumeCabinetRegistrationCode(revoked, code, 'redeem', NOW_SEC, NOW_ISO);
    expect(after.outcome).toEqual({ ok: false, reason: 'revoked' });
  });

  it('код истёк → expired', () => {
    const { state, code } = stateWithCabinetCode({ expiresAt: NOW_SEC - 1 });
    const r = consumeCabinetRegistrationCode(state, code, 'redeem', NOW_SEC, NOW_ISO);
    expect(r.outcome).toEqual({ ok: false, reason: 'expired' });
  });

  it('код без гранта cabinet-register → grant_mismatch', () => {
    const { state, code } = stateWithCabinetCode({ grants: [] });
    const r = consumeCabinetRegistrationCode(state, code, 'redeem', NOW_SEC, NOW_ISO);
    expect(r.outcome).toEqual({ ok: false, reason: 'grant_mismatch' });
  });

  it('код только с разделами панели (в том числе wildcard) → grant_mismatch', () => {
    const wildcard = stateWithCabinetCode({ grants: ['*'] });
    expect(
      consumeCabinetRegistrationCode(wildcard.state, wildcard.code, 'redeem', NOW_SEC, NOW_ISO)
        .outcome,
    ).toEqual({ ok: false, reason: 'grant_mismatch' });

    const section = stateWithCabinetCode({ grants: ['drift-anchors'] });
    expect(
      consumeCabinetRegistrationCode(section.state, section.code, 'redeem', NOW_SEC, NOW_ISO)
        .outcome,
    ).toEqual({ ok: false, reason: 'grant_mismatch' });
  });

  it('использования исчерпаны → exhausted', () => {
    const { state, code } = stateWithCabinetCode({ maxUses: 1 });
    const first = consumeCabinetRegistrationCode(state, code, 'redeem', NOW_SEC, NOW_ISO);
    expect(first.outcome).toMatchObject({ ok: true });
    const second = consumeCabinetRegistrationCode(first.state, code, 'redeem', NOW_SEC, NOW_ISO);
    expect(second.outcome).toEqual({ ok: false, reason: 'exhausted' });
  });

  it('порядок предикатов: отозванный И истёкший И исчерпанный код отвечает revoked', () => {
    const { state, code, codeId } = stateWithCabinetCode({ maxUses: 1, expiresAt: NOW_SEC - 1 });
    const used = consumeCabinetRegistrationCode(state, code, 'redeem', NOW_SEC - 3600, NOW_ISO);
    expect(used.outcome).toMatchObject({ ok: true });
    const revoked = revokeCode(used.state, codeId, 'owner', NOW_ISO)!;

    expect(
      consumeCabinetRegistrationCode(revoked, code, 'redeem', NOW_SEC, NOW_ISO).outcome,
    ).toEqual({ ok: false, reason: 'revoked' });
  });

  it('порядок предикатов: истёкший И без гранта И исчерпанный отвечает expired', () => {
    const { state, code } = stateWithCabinetCode({
      grants: ['drift-anchors'],
      expiresAt: NOW_SEC - 1,
      maxUses: 1,
    });
    const r = consumeCabinetRegistrationCode(state, code, 'redeem', NOW_SEC, NOW_ISO);
    expect(r.outcome).toEqual({ ok: false, reason: 'expired' });
  });
});

describe('дверь кабинета: режимы check и redeem', () => {
  it('check отвечает redeemable и НЕ трогает счётчик использований', () => {
    const { state, code, codeId } = stateWithCabinetCode();
    const r = consumeCabinetRegistrationCode(state, code, 'check', NOW_SEC, NOW_ISO);

    expect(r.outcome).toEqual({
      ok: true,
      redeemable: true,
      grant: 'cabinet-register',
      uses: { used: 0, max: 2 },
    });
    expect(usedCountOf(r.state, codeId)).toBe(0);
  });

  it('redeem приращает счётчик и отвечает кодом, грантом и использованиями', () => {
    const { state, code, codeId } = stateWithCabinetCode();
    const r = consumeCabinetRegistrationCode(state, code, 'redeem', NOW_SEC, NOW_ISO);

    expect(r.outcome).toEqual({
      ok: true,
      code,
      grant: 'cabinet-register',
      uses: { used: 1, max: 2 },
    });
    expect(usedCountOf(r.state, codeId)).toBe(1);
  });

  it('дверь не создаёт пользователя панели', () => {
    const { state, code } = stateWithCabinetCode();
    const r = consumeCabinetRegistrationCode(state, code, 'redeem', NOW_SEC, NOW_ISO);
    expect(r.state.users).toHaveLength(0);
  });

  it('аудит redeem-cabinet-code пишется и на успех, и на отказ redeem', () => {
    const { state, code, codeId } = stateWithCabinetCode();
    const ok = consumeCabinetRegistrationCode(state, code, 'redeem', NOW_SEC, NOW_ISO);
    const okEntry = ok.state.audit.at(-1)!;
    expect(okEntry.action).toBe('redeem-cabinet-code');
    expect(okEntry.target).toBe(codeId);
    expect(okEntry.detail).toContain('usedCount=1');

    const fail = consumeCabinetRegistrationCode(ok.state, 'НЕТТАКОГО', 'redeem', NOW_SEC, NOW_ISO);
    const failEntry = fail.state.audit.at(-1)!;
    expect(failEntry.action).toBe('redeem-cabinet-code');
    expect(failEntry.detail).toContain('not_found');
  });

  // Разъяснение ведущей 22.09 при исполнении M1: действие названо redeem-*, а
  // check по M2 регулярно зовёт чекер живости заведомо негодным кодом — лента с
  // капом AUDIT_CAP вытеснила бы выдачи и отзывы шумом.
  it('check следа в аудите не оставляет — ни на успех, ни на отказ', () => {
    const { state, code } = stateWithCabinetCode();
    const before = state.audit.length;

    const ok = consumeCabinetRegistrationCode(state, code, 'check', NOW_SEC, NOW_ISO);
    expect(ok.state.audit).toHaveLength(before);

    const fail = consumeCabinetRegistrationCode(state, 'НЕТТАКОГО', 'check', NOW_SEC, NOW_ISO);
    expect(fail.state.audit).toHaveLength(before);
  });
});

describe('дверь кабинета: замок единственного пишущего контура', () => {
  it('гонка при maxUses=1: два одновременных redeem дают ровно один успех', async () => {
    const { state, code, codeId } = stateWithCabinetCode({ maxUses: 1 });

    // Стор с ожиданием между чтением и записью — так ведёт себя любой контур,
    // где между снимком и записью есть await. Без замка оба захода читают
    // usedCount=0 и оба отвечают «успех», нарушая maxUses.
    let live = state;
    const store = {
      snapshot: () => live,
      async write(next: PanelUsersState) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        live = next;
      },
    };

    const lock = createStateLock();
    const attempt = () =>
      lock.run(async () => {
        const result = consumeCabinetRegistrationCode(store.snapshot(), code, 'redeem', NOW_SEC, NOW_ISO);
        await store.write(result.state);
        return result.outcome;
      });

    const outcomes = await Promise.all([attempt(), attempt()]);
    const successes = outcomes.filter((o) => o.ok);
    const refusals = outcomes.filter((o) => !o.ok);

    expect(successes).toHaveLength(1);
    expect(refusals).toEqual([{ ok: false, reason: 'exhausted' }]);
    expect(usedCountOf(live, codeId)).toBe(1);
  });

  it('замок исполняет участки по одному, в порядке обращения', async () => {
    const lock = createStateLock();
    const trail: string[] = [];

    const section = (name: string, ms: number) =>
      lock.run(async () => {
        trail.push(`${name}:вошёл`);
        await new Promise((resolve) => setTimeout(resolve, ms));
        trail.push(`${name}:вышел`);
      });

    await Promise.all([section('первый', 10), section('второй', 1)]);

    expect(trail).toEqual([
      'первый:вошёл',
      'первый:вышел',
      'второй:вошёл',
      'второй:вышел',
    ]);
  });
});
