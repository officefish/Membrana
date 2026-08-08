/**
 * Зубы первого потребителя `decideTransition` (спринт `tariff-transition-wiring`, блок B).
 *
 * Prisma подменена вручную, а не мокнута фреймворком: проверяется НЕ то, что
 * вызовы состоялись, а то, с какими УСЛОВИЯМИ они ушли. Условие `where` здесь
 * несущее — оно и есть повторная проверка вердикта домена, и подделка его
 * фикстурой сделала бы зуб зелёным при открытой гонке.
 */
import { describe, expect, it, vi } from 'vitest';

import { TariffTransitionService } from './tariff-transition.service';

const MEMBRANE = { id: 'm-1', tariffId: 'free-v1' };
const PROMO = {
  id: 'p-1',
  code: 'BLOCKPOST2026',
  targetTariffId: 'checkpoint-v1',
  status: 'active',
  maxRedemptions: 1,
  redeemedCount: 0,
  expiresAt: null,
};

/** Прибор наблюдения: помнит, с чем звали, и отвечает заданным. */
function prismaStub(over: {
  membrane?: unknown;
  promo?: unknown;
  spentCount?: number;
  movedCount?: number;
} = {}) {
  const calls: { spendWhere?: unknown; moveWhere?: unknown; log?: unknown } = {};
  const tx = {
    promoCode: {
      updateMany: vi.fn(async (args: { where: unknown }) => {
        calls.spendWhere = args.where;
        return { count: over.spentCount ?? 1 };
      }),
    },
    membrane: {
      updateMany: vi.fn(async (args: { where: unknown }) => {
        calls.moveWhere = args.where;
        return { count: over.movedCount ?? 1 };
      }),
    },
    tariffChangeLog: {
      create: vi.fn(async (args: { data: unknown }) => {
        calls.log = args.data;
        return args.data;
      }),
    },
  };
  const prisma = {
    membrane: {
      findUnique: vi.fn(async () => ('membrane' in over ? over.membrane : MEMBRANE)),
      updateMany: tx.membrane.updateMany,
    },
    promoCode: { findUnique: vi.fn(async () => ('promo' in over ? over.promo : PROMO)) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { prisma, tx, calls };
}

const svc = (prisma: unknown) =>
  new TariffTransitionService(prisma as never);

describe('погашение промокода', () => {
  it('поднимает тариф, списывает код и пишет журнал — одной транзакцией', async () => {
    const { prisma, tx, calls } = prismaStub();
    const out = await svc(prisma).redeemPromo({ membraneId: 'm-1', code: 'BLOCKPOST2026', actorId: 'u-1' });

    expect(out).toEqual({ ok: true, fromTariffId: 'free-v1', toTariffId: 'checkpoint-v1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.tariffChangeLog.create).toHaveBeenCalledTimes(1);
    expect(calls.log).toMatchObject({
      membraneId: 'm-1',
      fromTariffId: 'free-v1',
      toTariffId: 'checkpoint-v1',
      proofType: 'promo',
      proofRef: 'p-1',
      actorId: 'u-1',
    });
  });

  it('УСЛОВИЕ списания повторяет то, по чему судил домен — иначе вердикт лёг бы на другое состояние', async () => {
    const { prisma, calls } = prismaStub();
    await svc(prisma).redeemPromo({ membraneId: 'm-1', code: 'BLOCKPOST2026', actorId: 'u-1' });

    expect(calls.spendWhere).toEqual({ id: 'p-1', status: 'active', redeemedCount: 0 });
  });

  it('смена мембраны условна по ИСХОДНОМУ тарифу — два перехода не переплетутся', async () => {
    const { prisma, calls } = prismaStub();
    await svc(prisma).redeemPromo({ membraneId: 'm-1', code: 'BLOCKPOST2026', actorId: 'u-1' });

    expect(calls.moveWhere).toEqual({ id: 'm-1', tariffId: 'free-v1' });
  });

  it('нас опередили при списании → «уже использован», тариф НЕ тронут', async () => {
    const { prisma, tx } = prismaStub({ spentCount: 0 });
    const out = await svc(prisma).redeemPromo({ membraneId: 'm-1', code: 'BLOCKPOST2026', actorId: 'u-1' });

    expect(out).toEqual({ ok: false, reason: 'promo_already_redeemed' });
    expect(tx.membrane.updateMany).not.toHaveBeenCalled();
    expect(tx.tariffChangeLog.create).not.toHaveBeenCalled();
  });

  it('тариф увели между вердиктом и записью → СВОЯ причина, транзакция откатывается, подарок остаётся', async () => {
    const { prisma, tx } = prismaStub({ movedCount: 0 });
    const out = await svc(prisma).redeemPromo({ membraneId: 'm-1', code: 'BLOCKPOST2026', actorId: 'u-1' });

    expect(out.ok).toBe(false);
    // Причина названа ТОЧНО (#1777): до правки здесь отвечал `same_tariff` — «цель равна
    // текущему тарифу», то есть утверждение о другом субъекте. Проверка одного лишь
    // `ok === false` эту подмену пропустила и пропустила бы следующую такую же.
    if (!out.ok) expect(out.reason).toBe('tariff_moved_concurrently');
    // Журнал не пишется: транзакция брошена ДО него, и списание отменяется вместе с ней.
    expect(tx.tariffChangeLog.create).not.toHaveBeenCalled();
  });

  it('same_tariff остаётся живым в СВОЕЙ зоне: цель равна текущему тарифу', async () => {
    // Вторая половина той же леммы: заведя новую причину, нельзя отобрать у старой её
    // законный случай. Проверяется в зубах СЕРВИСА, а не домена: подмена рода произошла
    // здесь, значит здесь же и сторожим (решение исполнителя блока).
    const { prisma } = prismaStub({ promo: { ...PROMO, targetTariffId: MEMBRANE.tariffId } });
    const out = await svc(prisma).redeemPromo({ membraneId: 'm-1', code: 'BLOCKPOST2026', actorId: 'u-1' });

    expect(out).toEqual({ ok: false, reason: 'same_tariff' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('отказы приходят из закрытого списка домена', () => {
  it('многоразовый код — promo_not_single_use, и запись не начинается', async () => {
    const { prisma } = prismaStub({ promo: { ...PROMO, maxRedemptions: 3 } });
    const out = await svc(prisma).redeemPromo({ membraneId: 'm-1', code: 'BLOCKPOST2026', actorId: 'u-1' });

    expect(out).toEqual({ ok: false, reason: 'promo_not_single_use' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('уже погашенный код — promo_already_redeemed без обращения к транзакции', async () => {
    const { prisma } = prismaStub({ promo: { ...PROMO, status: 'spent', redeemedCount: 1 } });
    const out = await svc(prisma).redeemPromo({ membraneId: 'm-1', code: 'BLOCKPOST2026', actorId: 'u-1' });

    expect(out).toEqual({ ok: false, reason: 'promo_already_redeemed' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('ненайденные строки названы СВОИМИ причинами, а не причинами домена', async () => {
    const noPromo = prismaStub({ promo: null });
    expect(await svc(noPromo.prisma).redeemPromo({ membraneId: 'm-1', code: 'нет', actorId: 'u-1' }))
      .toEqual({ ok: false, reason: 'promo_unknown' });

    const noMembrane = prismaStub({ membrane: null });
    expect(await svc(noMembrane.prisma).redeemPromo({ membraneId: 'нет', code: 'BLOCKPOST2026', actorId: 'u-1' }))
      .toEqual({ ok: false, reason: 'membrane_unknown' });
  });
});
