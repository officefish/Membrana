/**
 * Зубы первого потребителя `decideTransition` (спринт `tariff-transition-wiring`, блок B).
 *
 * Prisma подменена вручную, а не мокнута фреймворком: проверяется НЕ то, что
 * вызовы состоялись, а то, с какими УСЛОВИЯМИ они ушли. Условие `where` здесь
 * несущее — оно и есть повторная проверка вердикта домена, и подделка его
 * фикстурой сделала бы зуб зелёным при открытой гонке.
 */
import { describe, expect, it, vi } from 'vitest';

import { selfTransitionGate, TariffTransitionService } from './tariff-transition.service';

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
  /** Строка тарифа-цели в базе; `null` — сетка её знает, база нет. */
  targetTariffRow?: unknown;
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
    tariff: {
      findUnique: vi.fn(async (args: { where: { id: string } }) =>
        'targetTariffRow' in over ? over.targetTariffRow : { id: args.where.id },
      ),
    },
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

/**
 * Зубы перехода СОБСТВЕННЫМ ВЫБОРОМ (#2281, слово владельца 04.09).
 *
 * Носитель перехода тот же, поэтому здесь проверяется не «работает ли смена» (это держат зубы
 * промокода), а ровно то, чем собственный выбор ОТЛИЧАЕТСЯ: третье основание в журнале, ворота
 * названным местом и отсутствие запрета на понижение.
 */
describe('смена тарифа собственным выбором', () => {
  it('меняет тариф и пишет журнал с основанием self — одной транзакцией', async () => {
    const { prisma, tx, calls } = prismaStub();
    const out = await svc(prisma).selectTariff({
      membraneId: 'm-1',
      toTariffId: 'checkpoint-v1',
      actorId: 'u-1',
    });

    expect(out).toEqual({ ok: true, fromTariffId: 'free-v1', toTariffId: 'checkpoint-v1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Запись ровно одна: журнал append-only, и дубль означал бы две правды об одном переходе.
    expect(tx.tariffChangeLog.create).toHaveBeenCalledTimes(1);
    expect(calls.log).toMatchObject({
      membraneId: 'm-1',
      fromTariffId: 'free-v1',
      toTariffId: 'checkpoint-v1',
      proofType: 'self',
      proofRef: 'm-1',
      actorId: 'u-1',
    });
  });

  it('промокод НЕ трогается — своим выбором подарок не жгут', async () => {
    const { prisma, tx } = prismaStub();
    await svc(prisma).selectTariff({ membraneId: 'm-1', toTariffId: 'checkpoint-v1', actorId: 'u-1' });
    expect(tx.promoCode.updateMany).not.toHaveBeenCalled();
    expect(prisma.promoCode.findUnique).not.toHaveBeenCalled();
  });

  it('ПОНИЖЕНИЕ разрешено — «без ворот» означает и вниз тоже', async () => {
    // У промокода понижение запрещено (promo_downgrade_forbidden) — это правило ПОДАРКА, а не
    // перехода. Перенести его сюда значило бы запереть владельца на старшем тарифе.
    const { prisma, calls } = prismaStub({
      membrane: { id: 'm-1', tariffId: 'observatory-v1' },
    });
    const out = await svc(prisma).selectTariff({
      membraneId: 'm-1',
      toTariffId: 'free-v1',
      actorId: 'u-1',
    });

    expect(out).toEqual({ ok: true, fromTariffId: 'observatory-v1', toTariffId: 'free-v1' });
    expect(calls.log).toMatchObject({ proofType: 'self', toTariffId: 'free-v1' });
  });

  it('смена условна по ИСХОДНОМУ тарифу — иначе журнал соврал бы, откуда шли', async () => {
    const { prisma, calls } = prismaStub();
    await svc(prisma).selectTariff({ membraneId: 'm-1', toTariffId: 'checkpoint-v1', actorId: 'u-1' });
    expect(calls.moveWhere).toEqual({ id: 'm-1', tariffId: 'free-v1' });
  });

  it('параллельная смена — tariff_moved_concurrently, а не same_tariff', async () => {
    const { prisma } = prismaStub({ movedCount: 0 });
    const out = await svc(prisma).selectTariff({
      membraneId: 'm-1',
      toTariffId: 'checkpoint-v1',
      actorId: 'u-1',
    });
    expect(out).toEqual({ ok: false, reason: 'tariff_moved_concurrently' });
  });

  it('неизвестная цель — отказ домена, журнал не тронут', async () => {
    const { prisma, tx } = prismaStub();
    const out = await svc(prisma).selectTariff({
      membraneId: 'm-1',
      toTariffId: 'no-such-v1',
      actorId: 'u-1',
    });
    expect(out).toEqual({ ok: false, reason: 'unknown_target_tariff' });
    expect(tx.tariffChangeLog.create).not.toHaveBeenCalled();
  });

  it('цель = текущий тариф — same_tariff, пустой записи в журнале нет', async () => {
    const { prisma, tx } = prismaStub();
    const out = await svc(prisma).selectTariff({
      membraneId: 'm-1',
      toTariffId: 'free-v1',
      actorId: 'u-1',
    });
    expect(out).toEqual({ ok: false, reason: 'same_tariff' });
    expect(tx.tariffChangeLog.create).not.toHaveBeenCalled();
  });

  it('тариф ЕСТЬ в сетке, НЕТ в базе — unknown_target_tariff, а не падение внешним ключом', async () => {
    // Сетка и база наполняются разными руками; вердикт домена «разрешено» без этой проверки
    // доехал бы до записи и упал бы пятисоткой вместо ответа.
    const { prisma, tx } = prismaStub({ targetTariffRow: null });
    const out = await svc(prisma).selectTariff({
      membraneId: 'm-1',
      toTariffId: 'checkpoint-v1',
      actorId: 'u-1',
    });
    expect(out).toEqual({ ok: false, reason: 'unknown_target_tariff' });
    expect(tx.membrane.updateMany).not.toHaveBeenCalled();
    expect(tx.tariffChangeLog.create).not.toHaveBeenCalled();
  });

  it('мембраны нет — membrane_unknown до всякой записи', async () => {
    const { prisma, tx } = prismaStub({ membrane: null });
    const out = await svc(prisma).selectTariff({
      membraneId: 'm-gone',
      toTariffId: 'checkpoint-v1',
      actorId: 'u-1',
    });
    expect(out).toEqual({ ok: false, reason: 'membrane_unknown' });
    expect(tx.membrane.updateMany).not.toHaveBeenCalled();
  });
});

describe('ворота собственного выбора', () => {
  it('сегодня ОТКРЫТЫ — и это записано предикатом, а не отсутствием кода', () => {
    // Зуб держит РЕШЕНИЕ владельца 04.09, а не текущее поведение «само собой». Когда ворота
    // закроют оплатой, красный здесь скажет: место найдено, поменяли осознанно.
    expect(selfTransitionGate()).toEqual({ open: true });
  });
});
