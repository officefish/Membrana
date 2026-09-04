import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';

import { PromoRedemptionRateLimiter } from './promo-redemption-rate-limit';
import { TariffController } from './tariff.controller';
import { ALL_TRANSITION_DENY_REASONS, type TransitionOutcome } from './tariff-transition.service';

/**
 * Зубы серверного пути (блок b1 спринта `tariff-promo-server-wiring`, #1761).
 *
 * Контроллер — тонкая обёртка, и зубы держат ровно её обещания: мембрана берётся
 * из СЕССИИ (телом не подменяется), каждая причина закрытого списка уезжает
 * различимо (без склейки), мусорная форма кода не доезжает до сервиса.
 */

/**
 * Закрытый список причин наружу. Берётся ИЗ ИСХОДНИКОВ, а не переписывается здесь.
 *
 * Ручная копия тут стояла до #2281 под обещанием «новая причина без зуба = красный» — и обещание
 * было пустым: тесты исключены из `tsc`, vitest типы не проверяет, так что копия могла молча
 * отстать от типа навсегда. Импорт снимает вопрос: новая причина попадает в перебор сама.
 */
const ALL_DENY_REASONS = ALL_TRANSITION_DENY_REASONS;

function makeController(outcome: TransitionOutcome) {
  const membraneService = {
    getOrCreateMembraneForUser: vi.fn(async () => ({ id: 'membrane-from-session' })),
  };
  const transition = {
    redeemPromo: vi.fn(async () => outcome),
    selectTariff: vi.fn(async () => outcome),
  };
  const catalog = { listForMembrane: vi.fn(async () => ({ currentTariffId: 'free', items: [] })) };
  const fanout = { syncAllNodes: vi.fn(async () => ({ updated: 2, failed: 1 })) };
  const rateLimiter = { assertAllowed: vi.fn() };
  const controller = new TariffController(
    membraneService as never,
    transition as never,
    catalog as never,
    fanout as never,
    rateLimiter as never,
  );
  const req = { authUser: { id: 'user-1' }, headers: {}, ip: '203.0.113.10' } as never;
  return { controller, membraneService, transition, catalog, fanout, rateLimiter, req };
}

describe('POST membranes/me/tariff/promo-redemptions', () => {
  it('успех уезжает как есть; мембрана — из сессии, не из тела', async () => {
    const ok: TransitionOutcome = { ok: true, fromTariffId: 'free', toTariffId: 'pro' };
    const { controller, membraneService, transition, rateLimiter, req } = makeController(ok);

    const res = await controller.redeemPromo(req, {
      code: 'PROMO-2026',
      // Попытка подменить мембрану телом — поле не существует в DTO и обязано игнорироваться.
      ...( { membraneId: 'evil-membrane', actorId: 'evil-actor' } as object),
    } as never);

    expect(res).toEqual(ok);
    expect(membraneService.getOrCreateMembraneForUser).toHaveBeenCalledWith('user-1');
    expect(transition.redeemPromo).toHaveBeenCalledWith({
      membraneId: 'membrane-from-session',
      code: 'PROMO-2026',
      actorId: 'user-1',
    });
    expect(rateLimiter.assertAllowed).toHaveBeenCalledWith({
      accountId: 'user-1',
      ip: '203.0.113.10',
    });
  });

  it.each(ALL_DENY_REASONS)('причина «%s» доходит различимо, без склейки', async (reason) => {
    const deny = { ok: false, reason } as TransitionOutcome;
    const { controller, req } = makeController(deny);
    const res = await controller.redeemPromo(req, { code: 'PROMO-2026' });
    expect(res).toEqual({ ok: false, reason });
  });

  it('promo_unknown и promo_already_redeemed различимы МЕЖДУ СОБОЙ (не «код не сработал»)', async () => {
    const unknown = await makeController({ ok: false, reason: 'promo_unknown' })
      .controller.redeemPromo({ authUser: { id: 'u' } } as never, { code: 'NO-SUCH' });
    const redeemed = await makeController({ ok: false, reason: 'promo_already_redeemed' })
      .controller.redeemPromo({ authUser: { id: 'u' } } as never, { code: 'SPENT-1' });
    expect(unknown).not.toEqual(redeemed);
  });

  it('мусорная форма кода — 400 ДО сервиса: пусто, пробелы, длина, спецсимволы', async () => {
    const { controller, transition, req } = makeController({
      ok: false,
      reason: 'promo_unknown',
    });
    for (const bad of ['', '  ', 'ab', 'с пробелом', 'кириллица', 'x'.repeat(65), 'a;drop']) {
      await expect(controller.redeemPromo(req, { code: bad })).rejects.toThrow(
        BadRequestException,
      );
    }
    expect(transition.redeemPromo).not.toHaveBeenCalled();
  });

  it('код обрезается по краям, но не внутри', async () => {
    const { controller, transition, req } = makeController({
      ok: true,
      fromTariffId: 'free',
      toTariffId: 'pro',
    });
    await controller.redeemPromo(req, { code: '  PROMO-2026  ' });
    expect(transition.redeemPromo).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PROMO-2026' }),
    );
  });

  it('N+1 попытка с одного аккаунта/IP получает 429 до домена', async () => {
    const ok: TransitionOutcome = { ok: true, fromTariffId: 'free', toTariffId: 'pro' };
    const membraneService = {
      getOrCreateMembraneForUser: vi.fn(async () => ({ id: 'membrane-from-session' })),
    };
    const transition = { redeemPromo: vi.fn(async () => ok) };
    const limiter = new PromoRedemptionRateLimiter({ maxAttempts: 2, windowMs: 60_000 });
    const controller = new TariffController(
      membraneService as never,
      transition as never,
      { listForMembrane: vi.fn() } as never,
      { syncAllNodes: vi.fn() } as never,
      limiter,
    );
    const req = { authUser: { id: 'user-1' }, headers: {}, ip: '203.0.113.10' } as never;

    await controller.redeemPromo(req, { code: 'PROMO-2026' });
    await controller.redeemPromo(req, { code: 'PROMO-2026' });
    await expect(controller.redeemPromo(req, { code: 'PROMO-2026' })).rejects.toMatchObject({
      status: 429,
    });
    expect(transition.redeemPromo).toHaveBeenCalledTimes(2);
  });
});

/**
 * Зубы выбора тарифа собственным решением (#2281).
 *
 * Держат ровно те обещания ручки, которых нет ни у домена, ни у сервиса: мембрана из сессии,
 * форма цели — граница транспорта, и ПОРЯДОК «разноска только после успеха».
 */
describe('POST membranes/me/tariff (собственный выбор)', () => {
  it('успех несёт счёт разноски; мембрана — из сессии, не из тела', async () => {
    const ok: TransitionOutcome = { ok: true, fromTariffId: 'free-v1', toTariffId: 'checkpoint-v1' };
    const { controller, membraneService, transition, fanout, req } = makeController(ok);

    const res = await controller.selectTariff(req, {
      toTariffId: 'checkpoint-v1',
      ...({ membraneId: 'evil-membrane', actorId: 'evil-actor' } as object),
    } as never);

    expect(res).toEqual({ ...ok, contextSync: { updated: 2, failed: 1 } });
    expect(membraneService.getOrCreateMembraneForUser).toHaveBeenCalledWith('user-1');
    expect(transition.selectTariff).toHaveBeenCalledWith({
      membraneId: 'membrane-from-session',
      toTariffId: 'checkpoint-v1',
      actorId: 'user-1',
    });
    expect(fanout.syncAllNodes).toHaveBeenCalledWith('membrane-from-session');
  });

  it('ПОРЯДОК: при отказе перехода разноски НЕ было и счёта в ответе нет', async () => {
    // Разнести контекст после отказа значило бы дёргать все приборы мембраны на каждой
    // отклонённой попытке — и соврать ответом, будто что-то менялось.
    const deny: TransitionOutcome = { ok: false, reason: 'same_tariff' };
    const { controller, fanout, req } = makeController(deny);

    const res = await controller.selectTariff(req, { toTariffId: 'free-v1' });

    expect(res).toEqual({ ok: false, reason: 'same_tariff' });
    expect(res).not.toHaveProperty('contextSync');
    expect(fanout.syncAllNodes).not.toHaveBeenCalled();
  });

  it('провал разноски смену НЕ отменяет — ok остаётся true при failed > 0', async () => {
    const ok: TransitionOutcome = { ok: true, fromTariffId: 'free-v1', toTariffId: 'checkpoint-v1' };
    const { controller, fanout, req } = makeController(ok);
    fanout.syncAllNodes.mockResolvedValueOnce({ updated: 0, failed: 3 });

    const res = await controller.selectTariff(req, { toTariffId: 'checkpoint-v1' });

    expect(res).toMatchObject({ ok: true, contextSync: { updated: 0, failed: 3 } });
  });

  it.each(ALL_DENY_REASONS)('причина «%s» доходит различимо и без счёта', async (reason) => {
    const { controller, req } = makeController({ ok: false, reason } as TransitionOutcome);
    const res = await controller.selectTariff(req, { toTariffId: 'checkpoint-v1' });
    expect(res).toEqual({ ok: false, reason });
  });

  it('мусорная форма цели — 400 ДО сервиса', async () => {
    const { controller, transition, fanout, req } = makeController({
      ok: false,
      reason: 'unknown_target_tariff',
    });
    const trash = ['', '  ', 'a', 'Free-V1', 'с пробелом', 'кириллица', 'x'.repeat(65), 'a;drop'];
    for (const bad of trash) {
      await expect(controller.selectTariff(req, { toTariffId: bad })).rejects.toThrow(
        BadRequestException,
      );
    }
    expect(transition.selectTariff).not.toHaveBeenCalled();
    expect(fanout.syncAllNodes).not.toHaveBeenCalled();
  });

  it('цель обрезается по краям', async () => {
    const { controller, transition, req } = makeController({
      ok: true,
      fromTariffId: 'free-v1',
      toTariffId: 'checkpoint-v1',
    });
    await controller.selectTariff(req, { toTariffId: '  checkpoint-v1  ' });
    expect(transition.selectTariff).toHaveBeenCalledWith(
      expect.objectContaining({ toTariffId: 'checkpoint-v1' }),
    );
  });

  it('ограничитель частоты промокода на собственный выбор НЕ распространяется', async () => {
    // Он заведён против перебора СЕКРЕТА. Своя цель секретом не является, и лимит здесь означал
    // бы «нельзя передумать больше двух раз» — правило, которого никто не вводил.
    const { controller, rateLimiter, req } = makeController({
      ok: true,
      fromTariffId: 'free-v1',
      toTariffId: 'checkpoint-v1',
    });
    await controller.selectTariff(req, { toTariffId: 'checkpoint-v1' });
    expect(rateLimiter.assertAllowed).not.toHaveBeenCalled();
  });
});

describe('GET tariffs', () => {
  it('витрина строится для мембраны ИЗ СЕССИИ', async () => {
    const { controller, catalog, membraneService, req } = makeController({
      ok: true,
      fromTariffId: 'free-v1',
      toTariffId: 'checkpoint-v1',
    });
    await controller.listTariffs(req);
    expect(membraneService.getOrCreateMembraneForUser).toHaveBeenCalledWith('user-1');
    expect(catalog.listForMembrane).toHaveBeenCalledWith('membrane-from-session');
  });
});
