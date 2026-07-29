/**
 * Зубы смены тарифа (S8 плана интеграции; заседание `tariff-grid`).
 *
 * Сторожат вердикт M6: меняется одна ссылка и никаких снимков прав; промокод
 * одноразовый и ведёт только вверх; отказ по нашей проверке не сжигает подарок;
 * журнал пишется только при успехе. Проверка по ЖИВОЙ матрице.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { TariffGridDocument } from './tariff-grid';
import {
  decideTransition,
  membranePatch,
  rankOf,
  spendPromo,
  type PromoCodeSnapshot,
  type TransitionRequest,
} from './tariff-transition';

const LIVE: TariffGridDocument = JSON.parse(
  readFileSync(new URL('../../../../docs/tariffs/tariff-grid.json', import.meta.url), 'utf8'),
);

const NOW = new Date('2026-07-29T12:00:00Z');

const adminUp: TransitionRequest = {
  membraneId: 'm-1',
  currentTariffId: 'free-v1',
  targetTariffId: 'checkpoint-v1',
  proofType: 'admin',
  proofRef: 'admin-42',
  actorId: 'a-1',
};

const activePromo: PromoCodeSnapshot = {
  id: 'p-1',
  code: 'BLOCKPOST2026',
  targetTariffId: 'checkpoint-v1',
  status: 'active',
  maxRedemptions: 1,
  redeemedCount: 0,
  expiresAt: null,
};

describe('администратор', () => {
  it('поднимает тариф — переход разрешён, журнал заполнен', () => {
    const d = decideTransition(LIVE, adminUp, undefined, NOW);
    expect(d.allowed).toBe(true);
    expect(d.logEntry).toEqual({
      membraneId: 'm-1',
      fromTariffId: 'free-v1',
      toTariffId: 'checkpoint-v1',
      proofType: 'admin',
      proofRef: 'admin-42',
      actorId: 'a-1',
    });
  });

  it('понижает тариф — администратору можно в любую сторону', () => {
    const down = { ...adminUp, currentTariffId: 'observatory-v1', targetTariffId: 'free-v1' };
    expect(decideTransition(LIVE, down, undefined, NOW).allowed).toBe(true);
  });

  it('переход на тот же тариф отвергается — пустая операция не пишется в журнал', () => {
    const same = { ...adminUp, targetTariffId: 'free-v1' };
    const d = decideTransition(LIVE, same, undefined, NOW);
    expect(d.reason).toBe('same_tariff');
    expect(d.logEntry).toBeUndefined();
  });

  it('несуществующий тариф отвергается — выдуманных SKU не бывает', () => {
    const bogus = { ...adminUp, targetTariffId: 'premium-v99' };
    expect(decideTransition(LIVE, bogus, undefined, NOW).reason).toBe('unknown_target_tariff');
  });
});

describe('промокод', () => {
  const promoUp: TransitionRequest = { ...adminUp, proofType: 'promo', proofRef: 'p-1' };

  it('поднимает тариф и помечается к списанию', () => {
    const d = decideTransition(LIVE, promoUp, activePromo, NOW);
    expect(d.allowed).toBe(true);
    expect(d.spendPromo).toBe(true);
  });

  it('вниз не ведёт — понижение дело администратора, не подарка', () => {
    const down = { ...promoUp, currentTariffId: 'observatory-v1', targetTariffId: 'checkpoint-v1' };
    const d = decideTransition(LIVE, down, activePromo, NOW);
    expect(d.reason).toBe('promo_downgrade_forbidden');
    expect(d.spendPromo).toBe(false);
  });

  it('повторное погашение отвечает «уже использован», а не меняет тариф снова', () => {
    const used = { ...activePromo, status: 'spent' as const, redeemedCount: 1 };
    const d = decideTransition(LIVE, promoUp, used, NOW);
    expect(d.reason).toBe('promo_already_redeemed');
    expect(d.allowed).toBe(false);
  });

  it('отозванный код не работает', () => {
    const revoked = { ...activePromo, status: 'revoked' as const };
    expect(decideTransition(LIVE, promoUp, revoked, NOW).reason).toBe('promo_revoked');
  });

  it('истёкший код не работает; срок сверяется переданным «сейчас», а не календарём', () => {
    const expired = { ...activePromo, expiresAt: new Date('2026-07-28T00:00:00Z') };
    expect(decideTransition(LIVE, promoUp, expired, NOW).reason).toBe('promo_expired');
    const alive = { ...activePromo, expiresAt: new Date('2026-08-30T00:00:00Z') };
    expect(decideTransition(LIVE, promoUp, alive, NOW).allowed).toBe(true);
  });

  it('код на другой тариф не подходит и НЕ сгорает — подарок не теряется из-за нашей проверки', () => {
    const other = { ...activePromo, targetTariffId: 'observatory-v1' };
    const d = decideTransition(LIVE, promoUp, other, NOW);
    expect(d.reason).toBe('promo_target_mismatch');
    expect(d.spendPromo).toBe(false);
  });

  it('ни один отказ не списывает код', () => {
    const cases: PromoCodeSnapshot[] = [
      { ...activePromo, status: 'revoked' },
      { ...activePromo, status: 'spent', redeemedCount: 1 },
      { ...activePromo, expiresAt: new Date('2026-01-01T00:00:00Z') },
      { ...activePromo, targetTariffId: 'observatory-v1' },
    ];
    for (const promo of cases) {
      expect(decideTransition(LIVE, promoUp, promo, NOW).spendPromo).toBe(false);
    }
  });

  it('списание одноразового кода переводит его в «использован»', () => {
    const after = spendPromo(activePromo);
    expect(after.redeemedCount).toBe(1);
    expect(after.status).toBe('spent');
  });

  it('многоразовый код остаётся активным, пока не исчерпан', () => {
    const multi = { ...activePromo, maxRedemptions: 3 };
    const once = spendPromo(multi);
    expect(once.status).toBe('active');
    expect(spendPromo(spendPromo(once)).status).toBe('spent');
  });
});

describe('что меняется при переходе', () => {
  it('ровно ссылка на тариф — снимку прав негде появиться', () => {
    const d = decideTransition(LIVE, adminUp, undefined, NOW);
    const patch = membranePatch(d);
    expect(patch).toEqual({ tariffId: 'checkpoint-v1' });
    expect(Object.keys(patch!)).toEqual(['tariffId']);
  });

  it('при отказе менять нечего', () => {
    const d = decideTransition(LIVE, { ...adminUp, targetTariffId: 'free-v1' }, undefined, NOW);
    expect(membranePatch(d)).toBeUndefined();
  });

  it('ранги тарифов растут: Датчик → Блокпост → Наблюдательный пункт', () => {
    expect(rankOf(LIVE, 'free-v1')).toBe(0);
    expect(rankOf(LIVE, 'checkpoint-v1')).toBe(1);
    expect(rankOf(LIVE, 'observatory-v1')).toBe(2);
    expect(rankOf(LIVE, 'premium-v99')).toBeUndefined();
  });
});
