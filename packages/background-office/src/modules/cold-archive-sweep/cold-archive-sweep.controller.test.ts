/**
 * Зубы ручки панели sweep-preview (#2588 b6, порча P29 плана `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Красные на стволе debe79e9: модуля нет — import падает. Порчи после реализации: ручка зависит от
 * флагов (при выключенном cron отвечает 503) → красный; dryRun не жёстко true → красный; второй
 * маршрут под префиксом → красный; снять @OwnerAdmin → красный; 500 вместо кода media → красный.
 */
import 'reflect-metadata';

import { HttpException, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { PANEL_DENY_AS_404_KEY, PANEL_MIN_ROLE_KEY } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard } from '../panel-auth/panel-auth.guard';
import type { SweepOutcome, SweepReport } from './cold-archive-sweep.client';
import { ColdArchiveSweepController, SWEEP_PREVIEW_ROUTE_PREFIX, unwrapSweepOutcome } from './cold-archive-sweep.controller';

const REPORT: SweepReport = {
  dryRun: true,
  now: '2026-10-06T12:00:00.000Z',
  candidates: [{ batchId: 'b-1', deviceId: 'd-1', expiresAt: '2026-10-05T10:00:00.000Z', sampleCount: 3, frozenBytes: 1000 }],
  purged: [],
  refusal: null,
};

function make(outcome: SweepOutcome) {
  const client = { purgeExpired: vi.fn(async () => outcome) };
  return { controller: new ColdArchiveSweepController(client as never), client };
}

describe('GET v1/panel/admin/cold-archive/sweep-preview — P29', () => {
  it('зовёт media ЖЁСТКО с dryRun=true и отдаёт отчёт как есть — от флагов не зависит (флагов в конструкторе нет)', async () => {
    const { controller, client } = make({ kind: 'ok', report: REPORT });
    expect(await controller.sweepPreview()).toEqual(REPORT);
    expect(client.purgeExpired).toHaveBeenCalledTimes(1);
    expect(client.purgeExpired).toHaveBeenCalledWith(true);
  });

  it('исходы → HTTP своим кодом: 503 media_not_configured с именем переменной, 502 без detail, отказ media — его статус и код', async () => {
    const e503 = await make({ kind: 'media-not-configured', missing: ['MEDIA_API_URL'] }).controller.sweepPreview().catch((e: unknown) => e as HttpException);
    expect(e503.getStatus()).toBe(503);
    expect(e503.getResponse()).toEqual({ code: 'media_not_configured', missing: ['MEDIA_API_URL'] });

    const e502 = await make({ kind: 'media-unreachable', detail: 'Error: connect ECONNREFUSED <host>' }).controller.sweepPreview().catch((e: unknown) => e as HttpException);
    expect(e502.getStatus()).toBe(502);
    expect(e502.getResponse()).toEqual({ code: 'media_unreachable' });

    const e404 = await make({ kind: 'media-rejected', status: 404, code: null }).controller.sweepPreview().catch((e: unknown) => e as HttpException);
    expect(e404.getStatus()).toBe(404);
    expect(e404.getResponse()).toEqual({ code: 'media_rejected', status: 404 });

    const e400 = await make({ kind: 'media-rejected', status: 400, code: 'dry_run_required' }).controller.sweepPreview().catch((e: unknown) => e as HttpException);
    expect(e400.getStatus()).toBe(400);
    expect(e400.getResponse()).toEqual({ code: 'dry_run_required', status: 400 });

    expect(unwrapSweepOutcome({ kind: 'ok', report: REPORT })).toBe(REPORT);
  });

  it('инвентарь: ровно одна ручка GET sweep-preview, @OwnerAdmin (owner, 404 не-owner), охрана PanelAuthGuard', () => {
    const proto = ColdArchiveSweepController.prototype as Record<string, unknown>;
    const handlers = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor' && typeof proto[name] === 'function' && Reflect.getMetadata(PATH_METADATA, proto[name] as object) !== undefined,
    );
    expect(Reflect.getMetadata(PATH_METADATA, ColdArchiveSweepController)).toBe('v1/panel/admin/cold-archive');
    expect(SWEEP_PREVIEW_ROUTE_PREFIX).toBe('v1/panel/admin/cold-archive');
    expect(
      handlers.map((name) => ({
        method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, proto[name] as object) as RequestMethod],
        path: String(Reflect.getMetadata(PATH_METADATA, proto[name] as object)),
        minRole: Reflect.getMetadata(PANEL_MIN_ROLE_KEY, proto[name] as object) as string,
        denyAs404: Reflect.getMetadata(PANEL_DENY_AS_404_KEY, proto[name] as object) === true,
      })),
    ).toEqual([{ method: 'GET', path: 'sweep-preview', minRole: 'owner', denyAs404: true }]);
    expect(Reflect.getMetadata(GUARDS_METADATA, ColdArchiveSweepController)).toEqual([PanelAuthGuard]);
  });
});
