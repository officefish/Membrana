/**
 * Зубы ручки панели sweep-preview (#2588 b6, порча P29 плана `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Красные на стволе debe79e9: модуля нет — import падает. Порчи после реализации: ручка зависит от
 * флагов (при выключенном cron отвечает 503) → красный; dryRun не жёстко true → красный; второй
 * маршрут под префиксом → красный; снять @OwnerAdmin → красный; 500 вместо кода media → красный.
 *
 * #2632 g5a: прокси журнала — четыре GET под тем же префиксом, каждый @OwnerAdmin; настоящий клиент на
 * подменном транспорте: путь и метод к media, токен только заголовком, тело как есть, исходы → 503/502/
 * статус media, 5xx media → 502. Превью помечает прогон trigger=panel; cron (без trigger) — тело { dryRun }.
 */
import 'reflect-metadata';

import { HttpException, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { PANEL_DENY_AS_404_KEY, PANEL_MIN_ROLE_KEY } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard } from '../panel-auth/panel-auth.guard';
import { ColdArchiveSweepClient, type SweepFetch, type SweepOutcome, type SweepReport } from './cold-archive-sweep.client';
import { ColdArchiveSweepController, SWEEP_PREVIEW_ROUTE_PREFIX, unwrapSweepOutcome } from './cold-archive-sweep.controller';

const REPORT: SweepReport = {
  dryRun: true,
  now: '2026-10-06T12:00:00.000Z',
  candidates: [{ batchId: 'b-1', deviceId: 'd-1', expiresAt: '2026-10-05T10:00:00.000Z', sampleCount: 3, frozenBytes: 1000 }],
  purged: [],
  refusal: null,
};

/** Уборка выключена (умолчания env): превью всё равно работает — от флагов оно не зависит (решение 05.10). */
const FLAGS_OFF = { COLD_ARCHIVE_SWEEP_ENABLED: false, COLD_ARCHIVE_SWEEP_DRY_RUN: true };

function make(outcome: SweepOutcome) {
  const client = { purgeExpired: vi.fn(async () => outcome) };
  return { controller: new ColdArchiveSweepController(client as never, FLAGS_OFF), client };
}

describe('GET v1/panel/admin/cold-archive/sweep-preview — P29', () => {
  it('зовёт media ЖЁСТКО с dryRun=true и отдаёт отчёт как есть — от флагов не зависит (флагов в конструкторе нет)', async () => {
    const { controller, client } = make({ kind: 'ok', report: REPORT });
    expect(await controller.sweepPreview()).toEqual(REPORT);
    expect(client.purgeExpired).toHaveBeenCalledTimes(1);
    expect(client.purgeExpired).toHaveBeenCalledWith(true, 'panel', { enabledSnapshot: false, dryRunSnapshot: true });
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

    const e500 = await make({ kind: 'media-rejected', status: 500, code: 'internal' }).controller.sweepPreview().catch((e: unknown) => e as HttpException);
    expect(e500.getStatus()).toBe(502);
    expect(e500.getResponse()).toEqual({ code: 'media_rejected', status: 500 });
  });

  it('инвентарь: GET sweep-preview и четыре GET журнала, каждый @OwnerAdmin (owner, 404 не-owner), охрана PanelAuthGuard', () => {
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
    ).toEqual(
      ['sweep-preview', 'purge-runs', 'purge-runs/:id', 'purge-runs/:id/verify', 'purge-schedule'].map((path) => ({ method: 'GET', path, minRole: 'owner', denyAs404: true })),
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ColdArchiveSweepController)).toEqual([PanelAuthGuard]);
  });
});

const BASE = 'http://media.internal:3200';
const TOKEN = 'media-secret-token';
const reply = (status: number, body: unknown) => ({ status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

function real(fetchImpl: SweepFetch, url: string | undefined = BASE) {
  const fetchSpy = vi.fn(fetchImpl);
  const client = new ColdArchiveSweepClient({ MEDIA_API_URL: url, MEDIA_API_TOKEN: TOKEN, API_INTERNAL_TOKEN: 'x' } as never, fetchSpy);
  return { controller: new ColdArchiveSweepController(client, FLAGS_OFF), client, fetchSpy };
}

describe('g5a: прокси журнала уборщика — только чтение, тело media как есть', () => {
  it('каждая ручка — GET к своей двери media, токен только заголовком, без тела; ответ — тело media', async () => {
    const body = { runId: 'r-1', jobs: [] };
    const { controller, fetchSpy } = real(async () => reply(200, body));
    const id = '00000000-0000-4000-8000-000000000001';
    expect(await controller.purgeRuns('5')).toEqual(body);
    expect(await controller.purgeRun(id)).toEqual(body);
    expect(await controller.purgeRunVerify(id)).toEqual(body);
    expect(await controller.purgeSchedule(undefined)).toEqual(body);
    expect(fetchSpy.mock.calls.map(([url, init]) => [init.method, url.replace(BASE, ''), init.body])).toEqual([
      ['GET', '/v1/internal/downgrade-archive/purge-runs?limit=5', undefined],
      ['GET', `/v1/internal/downgrade-archive/purge-runs/${id}`, undefined],
      ['GET', `/v1/internal/downgrade-archive/purge-runs/${id}/verify`, undefined],
      ['GET', '/v1/internal/downgrade-archive/purge-schedule', undefined],
    ]);
    for (const [url, init] of fetchSpy.mock.calls) {
      expect(init.headers['X-Membrana-Token']).toBe(TOKEN);
      expect(url).not.toContain(TOKEN);
    }
  });

  it('параметры экранируются: :id и limit не меняют путь к media', async () => {
    const { controller, fetchSpy } = real(async () => reply(400, { code: 'invalid_run_id' }));
    await controller.purgeRun('../purge-expired').catch(() => undefined);
    await controller.purgeRuns('1&x=2').catch(() => undefined);
    expect(fetchSpy.mock.calls.map(([url]) => url.replace(BASE, ''))).toEqual([
      '/v1/internal/downgrade-archive/purge-runs/..%2Fpurge-expired',
      '/v1/internal/downgrade-archive/purge-runs?limit=1%26x%3D2',
    ]);
  });

  it('исходы → свой код: 400/404 media — статус и код; 5xx media → 502; сеть → 502 без detail; нет адреса → 503', async () => {
    const code = async (c: ReturnType<typeof real>, call: (x: ColdArchiveSweepController) => Promise<unknown>) => {
      const e = (await call(c.controller).catch((err: unknown) => err)) as HttpException;
      return [e.getStatus(), e.getResponse()];
    };
    expect(await code(real(async () => reply(404, { code: 'run_not_found' })), (x) => x.purgeRun('00000000-0000-4000-8000-000000000009'))).toEqual([404, { code: 'run_not_found', status: 404 }]);
    expect(await code(real(async () => reply(400, { code: 'invalid_limit' })), (x) => x.purgeSchedule('0'))).toEqual([400, { code: 'invalid_limit', status: 400 }]);
    expect(await code(real(async () => reply(503, 'oops')), (x) => x.purgeRuns(undefined))).toEqual([502, { code: 'media_rejected', status: 503 }]);
    expect(
      await code(real(async () => { throw new Error(`connect ECONNREFUSED ${BASE}`); }), (x) => x.purgeRunVerify('00000000-0000-4000-8000-000000000001')),
    ).toEqual([502, { code: 'media_unreachable' }]);
    expect(await code(real(async () => reply(200, 'not json')), (x) => x.purgeRuns(undefined))).toEqual([502, { code: 'media_unreachable' }]);
    const none = real(async () => reply(200, {}), '');
    expect(await code(none, (x) => x.purgeRuns(undefined))).toEqual([503, { code: 'media_not_configured', missing: ['MEDIA_API_URL'] }]);
    expect(none.fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('стык №3 g3b: превью шлёт trigger=panel; вызов без trigger (cron) — тело ровно { dryRun }', async () => {
    const { controller, client, fetchSpy } = real(async () => reply(200, REPORT));
    await controller.sweepPreview();
    await client.purgeExpired(false);
    expect(fetchSpy.mock.calls.map(([, init]) => JSON.parse(init.body!))).toEqual([{ dryRun: true, trigger: 'panel', enabledSnapshot: false, dryRunSnapshot: true }, { dryRun: false }]);
  });
});
