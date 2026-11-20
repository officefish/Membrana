/**
 * Зубы двери уборки (#2588 b5, порча P25 плана `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Красные на стволе c5c01a65: контроллера нет — import падает; в модуле архива ни контроллера, ни сервиса
 * уборки. Порчи после реализации: умолчание dryRun (пропущено → боевой или dryRun) → красный (400
 * ожидается); строка "false" как false → красный; снять ApiTokenGuard → красный; второй маршрут под
 * префиксом → красный; `now` из тела → красный (сервис получает серверное время).
 *
 * #2632 g4a + g4b: двери чтения журнала — ровно пять GET под тем же префиксом и охранником (класс, не метод);
 * POST по-прежнему один; `limit` и `:id` разбираются до БД; незнакомый прогон — 404.
 */
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BadRequestException, ForbiddenException, NotFoundException, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { envSchema } from '../../config/env.schema';
import { DowngradeArchivePurgeController, PURGE_ROUTE_PREFIX, parseDryRun } from './downgrade-archive-purge.controller';
import { PURGE_LIST_DEFAULT_LIMIT, parseLimit } from './purge-journal.dto';

const HERE = dirname(fileURLToPath(import.meta.url));

function make(config: { PURGE_LIVE_ENABLED: boolean } = { PURGE_LIVE_ENABLED: true }) {
  const service = { purgeExpired: vi.fn(async (now: Date, o: { dryRun: boolean }) => ({ dryRun: o.dryRun, now, candidates: [], frozenBytes: 0, purged: [], purgedIds: [], refused: [], blobs: { deleted: 0, failed: 0 }, refusal: null })) };
  const findMany = vi.fn(async () => []);
  const prisma = {
    coldArchivePurgeRun: { findMany, findUnique: vi.fn(async () => null), findFirst: vi.fn(async () => null) },
    coldArchivePurgeJob: { findMany },
    downgradeArchiveBatch: { findMany },
  };
  return { controller: new DowngradeArchivePurgeController(service as never, prisma as never, { resolvePath: (r: string) => r } as never, config), service, prisma, findMany };
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

describe('Д3 ADR-0032: второй ключ live-удаления на стороне media (PURGE_LIVE_ENABLED)', () => {
  it('флаг выключен: dryRun:false → 403 purge_live_disabled, сервис не зван, прогона нет; dryRun:true работает как раньше', async () => {
    const { controller, service } = make({ PURGE_LIVE_ENABLED: false });
    const err = await controller.purgeExpired({ dryRun: false, trigger: 'manual' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err as ForbiddenException).getResponse()).toMatchObject({ code: 'purge_live_disabled' });
    expect(service.purgeExpired).toHaveBeenCalledTimes(0);
    expect((await controller.purgeExpired({ dryRun: true, trigger: 'panel' })).dryRun).toBe(true);
    expect(service.purgeExpired.mock.calls.map((c) => c[1])).toEqual([{ dryRun: true, trigger: 'panel' }]);
  });

  it('разбор тела — раньше флага: кривое тело при выключенном флаге — 400, не 403', async () => {
    const { controller } = make({ PURGE_LIVE_ENABLED: false });
    const err = await controller.purgeExpired({ dryRun: false, trigger: 'nightly' }).catch((e: unknown) => e);
    expect((err as BadRequestException).getResponse()).toMatchObject({ code: 'invalid_trigger' });
  });

  it('флаг включён: dryRun:false доходит до исполнителя', async () => {
    const { controller, service } = make({ PURGE_LIVE_ENABLED: true });
    await controller.purgeExpired({ dryRun: false });
    expect(service.purgeExpired.mock.calls.map((c) => c[1])).toEqual([{ dryRun: false }]);
  });

  it('env: умолчание — выключено; включают только "true"/"1"; опечатка — выключено, старт не падает', () => {
    const flag = (env: Record<string, string>) => {
      const parsed = envSchema.safeParse({ API_INTERNAL_TOKEN: 't', DATABASE_URL: 'postgresql://u:p@localhost:5432/db', ...env });
      expect(parsed.success).toBe(true);
      return parsed.success ? parsed.data.PURGE_LIVE_ENABLED : 'unparsed';
    };
    expect(flag({})).toBe(false);
    expect(flag({ PURGE_LIVE_ENABLED: 'true' })).toBe(true);
    expect(flag({ PURGE_LIVE_ENABLED: '1' })).toBe(true);
    for (const v of ['false', '0', 'yes', 'TRUE', '']) expect(flag({ PURGE_LIVE_ENABLED: v })).toBe(false);
    const example = readFileSync(join(HERE, '..', '..', '..', '.env.example'), 'utf8');
    expect(example).toMatch(/^PURGE_LIVE_ENABLED=false$/m);
  });
});

describe('g5b (стык №3 g3b): trigger и снимок флагов в теле purge-expired', () => {
  it.each([
    [{ dryRun: true, trigger: 'nightly' }, 'invalid_trigger'],
    [{ dryRun: true, trigger: 'CRON' }, 'invalid_trigger'],
    [{ dryRun: true, trigger: null }, 'invalid_trigger'],
    [{ dryRun: true, trigger: 1 }, 'invalid_trigger'],
    [{ dryRun: true, enabledSnapshot: 'false' }, 'invalid_snapshot'],
    [{ dryRun: true, dryRunSnapshot: 0 }, 'invalid_snapshot'],
  ])('тело %j → 400 %s, сервис не зван', async (body, code) => {
    const { controller, service } = make();
    const err = await controller.purgeExpired(body as never).catch((e: unknown) => e);
    expect((err as BadRequestException).getResponse()).toMatchObject({ code });
    expect(service.purgeExpired).toHaveBeenCalledTimes(0);
  });

  it('каждый литерал словаря доходит до исполнителя; без поля — опций trigger нет (умолчание cron у исполнителя)', async () => {
    const { controller, service } = make();
    for (const trigger of ['cron', 'panel', 'manual']) await controller.purgeExpired({ dryRun: true, trigger });
    await controller.purgeExpired({ dryRun: false, trigger: 'panel', enabledSnapshot: false, dryRunSnapshot: true });
    await controller.purgeExpired({ dryRun: true });
    expect(service.purgeExpired.mock.calls.map((c) => c[1])).toEqual([
      { dryRun: true, trigger: 'cron' },
      { dryRun: true, trigger: 'panel' },
      { dryRun: true, trigger: 'manual' },
      { dryRun: false, trigger: 'panel', enabledSnapshot: false, dryRunSnapshot: true },
      { dryRun: true },
    ]);
  });
});

describe('g4a + g4b: двери чтения журнала — параметры до БД, 404 на незнакомый прогон', () => {
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
