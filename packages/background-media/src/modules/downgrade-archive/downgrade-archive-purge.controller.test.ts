/**
 * Зубы двери уборки (#2588 b5, порча P25 плана `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Красные на стволе c5c01a65: контроллера нет — import падает; в модуле архива ни контроллера, ни сервиса
 * уборки. Порчи после реализации: умолчание dryRun (пропущено → боевой или dryRun) → красный (400
 * ожидается); строка "false" как false → красный; снять ApiTokenGuard → красный; второй маршрут под
 * префиксом → красный; `now` из тела → красный (сервис получает серверное время).
 */
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BadRequestException, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DowngradeArchivePurgeController, PURGE_ROUTE_PREFIX, parseDryRun } from './downgrade-archive-purge.controller';

const HERE = dirname(fileURLToPath(import.meta.url));

function make() {
  const service = { purgeExpired: vi.fn(async (now: Date, o: { dryRun: boolean }) => ({ dryRun: o.dryRun, now, candidates: [], frozenBytes: 0, purged: [], purgedIds: [], refused: [], blobs: { deleted: 0, failed: 0 }, refusal: null })) };
  return { controller: new DowngradeArchivePurgeController(service as never), service };
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

describe('инвентарь двери: ровно POST purge-expired под v1/internal/downgrade-archive, охрана ApiTokenGuard', () => {
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
    ).toEqual([{ method: 'POST', path: 'purge-expired' }]);
    expect(Reflect.getMetadata(GUARDS_METADATA, DowngradeArchivePurgeController)).toEqual([ApiTokenGuard]);
  });

  it('провод: сервис и контроллер уборки зарегистрированы в модуле архива блока 1, BlobModule подключён', () => {
    const module = readFileSync(join(HERE, 'downgrade-archive.module.ts'), 'utf8');
    expect(module).toMatch(/DowngradeArchivePurgeService/);
    expect(module).toMatch(/controllers: \[[^\]]*DowngradeArchivePurgeController[^\]]*\]/);
    expect(module).toMatch(/imports: \[[^\]]*BlobModule[^\]]*\]/);
  });
});
