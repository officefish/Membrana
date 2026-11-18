/**
 * Зубы двери уборки (#2588 b5, порча P25 плана `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Красные на стволе c5c01a65: контроллера нет — import падает; в модуле архива ни контроллера, ни сервиса
 * уборки. Порчи после реализации: умолчание dryRun (пропущено → боевой или dryRun) → красный (400
 * ожидается); строка "false" как false → красный; снять ApiTokenGuard → красный; второй маршрут под
 * префиксом → красный; `now` из тела → красный (сервис получает серверное время).
 *
 * #2632 g4: двери чтения журнала — ровно пять GET под тем же префиксом и охранником (класс, не метод);
 * POST по-прежнему один; `limit` и `:id` разбираются до БД; незнакомый прогон — 404.
 */
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BadRequestException, NotFoundException, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DowngradeArchivePurgeController, PURGE_ROUTE_PREFIX, parseDryRun } from './downgrade-archive-purge.controller';
import { PURGE_LIST_DEFAULT_LIMIT, parseLimit } from './purge-journal.dto';

const HERE = dirname(fileURLToPath(import.meta.url));

function make() {
  const service = { purgeExpired: vi.fn(async (now: Date, o: { dryRun: boolean }) => ({ dryRun: o.dryRun, now, candidates: [], frozenBytes: 0, purged: [], purgedIds: [], refused: [], blobs: { deleted: 0, failed: 0 }, refusal: null })) };
  const findMany = vi.fn(async () => []);
  const prisma = {
    coldArchivePurgeRun: { findMany, findUnique: vi.fn(async () => null), findFirst: vi.fn(async () => null) },
    coldArchivePurgeJob: { findMany },
    downgradeArchiveBatch: { findMany },
  };
  return { controller: new DowngradeArchivePurgeController(service as never, prisma as never, { resolvePath: (r: string) => r } as never), service, prisma, findMany };
}

describe('P25: dryRun в теле обязателен и булев', () => {
  it.each([undefined, {}, { dryRun: 'true' }, { dryRun: 'false' }, { dryRun: 1 }, { dryRun: null }, { dryrun: true }])('тело %j → 400 dry_run_required, сервис не зван', async (body) => {
    const { controller, service } = make();
    const err = await controller.purgeExpired(body as never).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toMatchObject({ code: 'dry_run_required' });
    expect(service.purgeExpired).toHaveBeenCalledTimes(0);
  });

  it('{dryRun:true} и {dryRun:false} доходят как есть; время — серверное, тело его не подменяет', async () => {
    const { controller, service } = make();
    const before = Date.now();
    const report = await controller.purgeExpired({ dryRun: true, now: '1999-01-01T00:00:00.000Z' } as never);
    expect(report.dryRun).toBe(true);
    const [now, options] = service.purgeExpired.mock.calls[0]!;
    expect(options).toEqual({ dryRun: true });
    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    await controller.purgeExpired({ dryRun: false });
    expect(service.purgeExpired.mock.calls[1]![1]).toEqual({ dryRun: false });
    expect(parseDryRun({ dryRun: false })).toBe(false);
  });
});

describe('g4: двери чтения журнала — параметры до БД, 404 на незнакомый прогон', () => {
  it.each(['0', '101', '-1', '2.5', 'abc', '1e2'])('?limit=%s → 400 invalid_limit, БД не спрошена', async (limit) => {
    const { controller, findMany } = make();
    for (const call of [() => controller.runs(limit), () => controller.schedule(limit)]) {
      const err = await call().catch((e: unknown) => e);
      expect((err as BadRequestException).getResponse()).toMatchObject({ code: 'invalid_limit' });
    }
    expect(findMany).toHaveBeenCalledTimes(0);
  });

  it('limit пустой → 20, иначе как есть; журнал и график читаются с этим take', async () => {
    const { controller, findMany } = make();
    expect(parseLimit(undefined)).toBe(PURGE_LIST_DEFAULT_LIMIT);
    await controller.runs(undefined);
    await controller.schedule('7');
    expect((findMany.mock.calls as unknown as [{ take: number }][]).map((c) => c[0].take)).toEqual([20, 7]);
  });

  it(':id не uuid → 400 invalid_run_id; незнакомый uuid → 404 run_not_found (run и verify)', async () => {
    const { controller } = make();
    for (const call of [() => controller.run('../x'), () => controller.verify('1')]) {
      expect(((await call().catch((e: unknown) => e)) as BadRequestException).getResponse()).toMatchObject({ code: 'invalid_run_id' });
    }
    const id = '00000000-0000-4000-8000-000000000001';
    for (const call of [() => controller.run(id), () => controller.verify(id)]) {
      const err = await call().catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect((err as NotFoundException).getResponse()).toMatchObject({ code: 'run_not_found' });
    }
  });
});

describe('инвентарь двери: POST purge-expired и пять GET журнала под v1/internal/downgrade-archive, охрана ApiTokenGuard', () => {
  it('контракт маршрутов и охраны', () => {
    const proto = DowngradeArchivePurgeController.prototype as Record<string, unknown>;
    const handlers = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor' && typeof proto[name] === 'function' && Reflect.getMetadata(PATH_METADATA, proto[name] as object) !== undefined,
    );
    expect(Reflect.getMetadata(PATH_METADATA, DowngradeArchivePurgeController)).toBe('v1/internal/downgrade-archive');
    expect(PURGE_ROUTE_PREFIX).toBe('v1/internal/downgrade-archive');
    expect(
      handlers.map((name) => ({
        method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, proto[name] as object) as RequestMethod],
        path: String(Reflect.getMetadata(PATH_METADATA, proto[name] as object)),
      })),
    ).toEqual([
      { method: 'POST', path: 'purge-expired' },
      { method: 'GET', path: 'purge-runs' },
      { method: 'GET', path: 'purge-runs/:id' },
      { method: 'GET', path: 'purge-runs/:id/verify' },
      { method: 'GET', path: 'purge-pulse' },
      { method: 'GET', path: 'purge-schedule' },
    ]);
    // охранник — на классе и покрывает все шесть маршрутов; методы его не переопределяют
    for (const name of handlers) expect(Reflect.getMetadata(GUARDS_METADATA, proto[name] as object)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, DowngradeArchivePurgeController)).toEqual([ApiTokenGuard]);
  });

  it('провод: сервис и контроллер уборки зарегистрированы в модуле архива блока 1, BlobModule подключён', () => {
    const module = readFileSync(join(HERE, 'downgrade-archive.module.ts'), 'utf8');
    expect(module).toMatch(/DowngradeArchivePurgeService/);
    expect(module).toMatch(/controllers: \[[^\]]*DowngradeArchivePurgeController[^\]]*\]/);
    expect(module).toMatch(/imports: \[[^\]]*BlobModule[^\]]*\]/);
  });
});
