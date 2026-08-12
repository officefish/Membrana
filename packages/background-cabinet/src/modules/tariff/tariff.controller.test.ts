import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';

import { TariffController } from './tariff.controller';
import type { TransitionOutcome } from './tariff-transition.service';

/**
 * Зубы серверного пути (блок b1 спринта `tariff-promo-server-wiring`, #1761).
 *
 * Контроллер — тонкая обёртка, и зубы держат ровно её обещания: мембрана берётся
 * из СЕССИИ (телом не подменяется), каждая причина закрытого списка уезжает
 * различимо (без склейки), мусорная форма кода не доезжает до сервиса.
 */

/** Закрытый список причин наружу: домен + сервис. Новая причина без зуба = красный. */
const ALL_DENY_REASONS = [
  'unknown_target_tariff',
  'same_tariff',
  'promo_downgrade_forbidden',
  'promo_already_redeemed',
  'promo_revoked',
  'promo_expired',
  'promo_target_mismatch',
  'promo_not_single_use',
  'promo_unknown',
  'membrane_unknown',
  'grid_unavailable',
  'tariff_moved_concurrently',
] as const;

function makeController(outcome: TransitionOutcome) {
  const membraneService = {
    getOrCreateMembraneForUser: vi.fn(async () => ({ id: 'membrane-from-session' })),
  };
  const transition = { redeemPromo: vi.fn(async () => outcome) };
  const controller = new TariffController(
    membraneService as never,
    transition as never,
  );
  const req = { authUser: { id: 'user-1' } } as never;
  return { controller, membraneService, transition, req };
}

describe('POST membranes/me/tariff/promo-redemptions', () => {
  it('успех уезжает как есть; мембрана — из сессии, не из тела', async () => {
    const ok: TransitionOutcome = { ok: true, fromTariffId: 'free', toTariffId: 'pro' };
    const { controller, membraneService, transition, req } = makeController(ok);

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
});
