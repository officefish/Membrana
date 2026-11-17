/**
 * Зубы пусковика и клиента уборки холодного архива (#2588 b6, порча P26–P28 плана
 * `docs/sprint/cut/cold-archive-retention-2588.json` + решения владельца 05.10 о флагах).
 *
 * Без сети: транспорт подставной через конструктор (`COLD_ARCHIVE_SWEEP_FETCH`). Красные на стволе
 * debe79e9: модуля нет — import падает; в `env.schema.ts` ствола `COLD_ARCHIVE_SWEEP_*` нет;
 * в `app.module.ts` ствола `ColdArchiveSweepModule` нет.
 *
 * Порчи после реализации: P26 звать media при выключенном флаге → красный (fetch 0); DRY_RUN
 * умолчание «боевой» → красный (тело `{dryRun:true}` ожидается); боевой без явного DRY_RUN=false →
 * красный; P27 бросать из тика при отказе media → красный; P28 расписание не `0 * * * *` → красный;
 * токен в логе/исходе → красный (сторож).
 */
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Logger } from '@nestjs/common';
import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { envSchema } from '../../config/env.schema';
import {
  COLD_ARCHIVE_SWEEP_FETCH,
  ColdArchiveSweepClient,
  PURGE_EXPIRED_PATH,
  SWEEP_OUTCOME_KINDS,
  SWEEP_TIMEOUT_MS,
  resolveMediaPair,
  sanitizeNetworkDetail,
  type SweepFetch,
  type SweepReport,
} from './cold-archive-sweep.client';
import { ColdArchiveSweepScheduler, SWEEP_CRON, summarizeOutcome, sweepModeOf } from './cold-archive-sweep.scheduler';

const HERE = dirname(fileURLToPath(import.meta.url));
const OFFICE_ROOT = join(HERE, '..', '..', '..');

// Фикстуры — слова, не hex (pre-commit gitleaks).
const MEDIA_TOKEN = 'office-to-media-door-test-value';
const INTERNAL = 'office-internal-test-value';
const BASE = 'https://media.test';

const REPORT: SweepReport = {
  dryRun: true,
  now: '2026-10-06T12:00:00.000Z',
  candidates: [
    { batchId: 'b-1', deviceId: 'd-1', expiresAt: '2026-10-05T10:00:00.000Z', sampleCount: 3, frozenBytes: 1000 },
    { batchId: 'b-2', deviceId: 'd-2', expiresAt: '2026-10-06T01:00:00.000Z', sampleCount: 1, frozenBytes: 24 },
  ],
  purged: [],
  refusal: null,
};

afterEach(() => vi.restoreAllMocks());

const response = (status: number, body: unknown) => ({ status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

type Flags = { COLD_ARCHIVE_SWEEP_ENABLED: boolean; COLD_ARCHIVE_SWEEP_DRY_RUN: boolean };
type Pair = { MEDIA_API_URL?: string; MEDIA_API_TOKEN?: string };

function makeClient(fetchImpl: SweepFetch, pair: Pair = { MEDIA_API_URL: BASE, MEDIA_API_TOKEN: MEDIA_TOKEN }) {
  const fetchSpy = vi.fn(fetchImpl);
  const config = { API_INTERNAL_TOKEN: INTERNAL, ...pair };
  return { client: new ColdArchiveSweepClient(config as never, fetchSpy), fetchSpy, config };
}

function makeScheduler(flags: Flags, fetchImpl: SweepFetch = async () => response(200, REPORT), pair?: Pair) {
  const { client, fetchSpy, config } = makeClient(fetchImpl, pair);
  const scheduler = new ColdArchiveSweepScheduler({ ...config, ...flags } as never, client);
  return { scheduler, fetchSpy };
}

describe('флаги → режим (решения владельца 05.10)', () => {
  it.each([
    [{ COLD_ARCHIVE_SWEEP_ENABLED: false, COLD_ARCHIVE_SWEEP_DRY_RUN: true }, 'disabled'],
    [{ COLD_ARCHIVE_SWEEP_ENABLED: false, COLD_ARCHIVE_SWEEP_DRY_RUN: false }, 'disabled'],
    [{ COLD_ARCHIVE_SWEEP_ENABLED: true, COLD_ARCHIVE_SWEEP_DRY_RUN: true }, 'dry-run'],
    [{ COLD_ARCHIVE_SWEEP_ENABLED: true, COLD_ARCHIVE_SWEEP_DRY_RUN: false }, 'live'],
  ] as const)('%j → %s', (flags, mode) => {
    expect(sweepModeOf(flags)).toBe(mode);
  });

  it('env: умолчания — ENABLED выкл, DRY_RUN вкл; "true"/"1" включают, "false"/"0" выключают', () => {
    const base = { API_INTERNAL_TOKEN: 'i', ANTHROPIC_API_KEY: 'a', GITHUB_TOKEN: 'g', GITHUB_OWNER: 'o', GITHUB_REPO: 'r' };
    const parse = (env: Record<string, string>) => {
      const parsed = envSchema.safeParse({ ...base, ...env });
      expect(parsed.success).toBe(true);
      return parsed.success ? sweepModeOf(parsed.data) : 'unparsed';
    };
    expect(parse({})).toBe('disabled');
    expect(parse({ COLD_ARCHIVE_SWEEP_DRY_RUN: 'false' })).toBe('disabled'); // DRY_RUN без ENABLED ничего не включает
    expect(parse({ COLD_ARCHIVE_SWEEP_ENABLED: 'true' })).toBe('dry-run'); // умолчание DRY_RUN — показать
    expect(parse({ COLD_ARCHIVE_SWEEP_ENABLED: '1', COLD_ARCHIVE_SWEEP_DRY_RUN: '1' })).toBe('dry-run');
    expect(parse({ COLD_ARCHIVE_SWEEP_ENABLED: 'true', COLD_ARCHIVE_SWEEP_DRY_RUN: 'false' })).toBe('live');
    expect(parse({ COLD_ARCHIVE_SWEEP_ENABLED: 'true', COLD_ARCHIVE_SWEEP_DRY_RUN: '0' })).toBe('live');
    expect(parse({ COLD_ARCHIVE_SWEEP_ENABLED: 'yes', COLD_ARCHIVE_SWEEP_DRY_RUN: 'false' })).toBe('disabled'); // «yes» — не включение
  });
});

describe('ColdArchiveSweepScheduler — P26 выключено = тишина; DRY_RUN умолчание; боевой только явно', () => {
  it('P26: ENABLED выкл → tick() = null, fetch 0 вызовов, ежечасной строки в лог нет; на старте — одна строка «выключена»', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { scheduler, fetchSpy } = makeScheduler({ COLD_ARCHIVE_SWEEP_ENABLED: false, COLD_ARCHIVE_SWEEP_DRY_RUN: false });
    scheduler.onModuleInit();
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0]![0])).toContain('выключена');
    log.mockClear();
    expect(await scheduler.tick()).toBeNull();
    await scheduler.hourly();
    expect(fetchSpy).toHaveBeenCalledTimes(0);
    expect(log).toHaveBeenCalledTimes(0);
    expect(warn).toHaveBeenCalledTimes(0);
  });

  it('ENABLED вкл, DRY_RUN умолчание (вкл) → ровно один POST с телом {dryRun:true}, лог несёт числа', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { scheduler, fetchSpy } = makeScheduler({ COLD_ARCHIVE_SWEEP_ENABLED: true, COLD_ARCHIVE_SWEEP_DRY_RUN: true });
    const outcome = await scheduler.tick();
    expect(outcome).toEqual({ kind: 'ok', report: REPORT });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(`${BASE}${PURGE_EXPIRED_PATH}`);
    expect(PURGE_EXPIRED_PATH).toBe('/v1/internal/downgrade-archive/purge-expired');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ dryRun: true });
    expect(init.headers['X-Membrana-Token']).toBe(MEDIA_TOKEN);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(SWEEP_TIMEOUT_MS).toBe(60_000);
    const summary = log.mock.calls.find((c) => String(c[1]).includes('dry-run'))?.[0] as Record<string, unknown>;
    expect(summary).toMatchObject({ outcome: 'ok', dryRun: true, candidates: 2, frozenBytes: 1024, purged: 0, refusal: null });
  });

  it('боевой — только ENABLED=true и DRY_RUN=false: тело {dryRun:false}; purged в лог поимённо', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const live: SweepReport = { ...REPORT, dryRun: false, purged: ['b-1', 'b-2'] };
    const { scheduler, fetchSpy } = makeScheduler({ COLD_ARCHIVE_SWEEP_ENABLED: true, COLD_ARCHIVE_SWEEP_DRY_RUN: false }, async () => response(200, live));
    await scheduler.hourly();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchSpy.mock.calls[0]![1].body)).toEqual({ dryRun: false });
    const summary = log.mock.calls.find((c) => String(c[1]).includes('purged'))?.[0] as Record<string, unknown>;
    expect(summary).toMatchObject({ outcome: 'ok', dryRun: false, purged: 2, purgedIds: ['b-1', 'b-2'] });
  });

  it('P27: отказ media (5xx / сеть / refusal) → warn с кодом, исключение наружу не летит, hourly() резолвится', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const flags = { COLD_ARCHIVE_SWEEP_ENABLED: true, COLD_ARCHIVE_SWEEP_DRY_RUN: true };

    const s503 = makeScheduler(flags, async () => response(503, { message: 'Service Unavailable' }));
    await expect(s503.scheduler.hourly()).resolves.toBeUndefined();
    expect(await s503.scheduler.tick()).toEqual({ kind: 'media-rejected', status: 503, code: 'Service Unavailable' });

    const sNet = makeScheduler(flags, async () => { throw Object.assign(new Error('connect ECONNREFUSED 203.0.113.9:3010'), { name: 'Error' }); });
    expect(await sNet.scheduler.tick()).toEqual({ kind: 'media-unreachable', detail: 'Error: connect ECONNREFUSED <host>' });

    // media ещё без боевой уборки (b5 не влит): отказ ВНУТРИ 200 — исход ok, refusal в сводке
    const refused: SweepReport = { ...REPORT, dryRun: false, refusal: { reason: 'purge_not_implemented' } };
    const sRef = makeScheduler({ ...flags, COLD_ARCHIVE_SWEEP_DRY_RUN: false }, async () => response(200, refused));
    await sRef.scheduler.hourly();
    const summary = log.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(summary).toMatchObject({ outcome: 'ok', refusal: 'purge_not_implemented', purged: 0 });

    expect(warn.mock.calls.length).toBeGreaterThanOrEqual(2);
    for (const call of warn.mock.calls) expect(String(call[1])).toMatch(/media/);
  });

  it('P28: расписание ровно "0 * * * *" UTC на методе hourly', () => {
    expect(SWEEP_CRON).toBe('0 * * * *');
    const options = Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, ColdArchiveSweepScheduler.prototype.hourly) as { name?: string; timeZone?: string } | undefined;
    // @nestjs/schedule@5 хранит опции под SCHEDULE_CRON_OPTIONS, а выражение — под ключом cronTime внутри них.
    expect(options).toMatchObject({ name: 'cold-archive-sweep-hourly', timeZone: 'UTC' });
    expect(String((options as Record<string, unknown> | undefined)?.cronTime)).toBe('0 * * * *');
  });

  it('без MEDIA_API_URL → media-not-configured, fetch 0; MEDIA_API_TOKEN пуст → заголовок несёт API_INTERNAL_TOKEN', async () => {
    const { scheduler, fetchSpy } = makeScheduler({ COLD_ARCHIVE_SWEEP_ENABLED: true, COLD_ARCHIVE_SWEEP_DRY_RUN: true }, async () => response(200, REPORT), {});
    expect(await scheduler.tick()).toEqual({ kind: 'media-not-configured', missing: ['MEDIA_API_URL'] });
    expect(fetchSpy).toHaveBeenCalledTimes(0);
    expect(resolveMediaPair({ MEDIA_API_URL: `${BASE}//`, MEDIA_API_TOKEN: undefined, API_INTERNAL_TOKEN: INTERNAL })).toEqual({ ok: true, baseUrl: BASE, token: INTERNAL });

    const { client, fetchSpy: spy2 } = makeClient(async () => response(200, REPORT), { MEDIA_API_URL: BASE });
    await client.purgeExpired(true);
    expect(spy2.mock.calls[0]![1].headers['X-Membrana-Token']).toBe(INTERNAL);
  });
});

describe('клиент: словарь исходов и сторож секрета', () => {
  it('не-JSON 200 и тело без candidates/purged → media-unreachable; 4xx с {code} → media-rejected с кодом', async () => {
    expect([...SWEEP_OUTCOME_KINDS]).toEqual(['ok', 'media-not-configured', 'media-unreachable', 'media-rejected']);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    expect(await makeClient(async () => response(200, '<html>')).client.purgeExpired(true)).toEqual({ kind: 'media-unreachable', detail: 'invalid JSON from media' });
    expect(await makeClient(async () => response(200, { ok: true })).client.purgeExpired(true)).toEqual({ kind: 'media-unreachable', detail: 'unexpected report shape from media' });
    expect(await makeClient(async () => response(400, { code: 'dry_run_required' })).client.purgeExpired(true)).toEqual({ kind: 'media-rejected', status: 400, code: 'dry_run_required' });
    expect(await makeClient(async () => response(401, '')).client.purgeExpired(true)).toEqual({ kind: 'media-rejected', status: 401, code: null });
  });

  it('токен-сторож: пять сценариев — токен, адрес media и хост из сетевой ошибки отсутствуют в исходах и Logger.warn; заголовок токен несёт', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const host = new URL(BASE).host;
    const scenarios: SweepFetch[] = [
      async () => response(200, REPORT),
      async () => response(401, { message: 'Invalid token' }),
      async () => response(500, 'boom'),
      async () => { throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { name: 'Error' }); },
      async () => { throw Object.assign(new Error(`fetch failed: ${BASE}${PURGE_EXPIRED_PATH}`), { name: 'TypeError' }); },
    ];
    const outcomes = [];
    for (const scenario of scenarios) {
      const { client, fetchSpy } = makeClient(scenario);
      outcomes.push(await client.purgeExpired(true), await client.purgeExpired(false));
      for (const call of fetchSpy.mock.calls) expect(call[1].headers['X-Membrana-Token']).toBe(MEDIA_TOKEN);
    }
    const everything = JSON.stringify(outcomes) + JSON.stringify(warn.mock.calls) + JSON.stringify(outcomes.map(summarizeOutcome));
    expect(everything).not.toContain(MEDIA_TOKEN);
    expect(everything).not.toContain(INTERNAL);
    expect(everything).not.toContain(BASE);
    expect(everything).not.toContain(host);
    expect(sanitizeNetworkDetail(new Error(`getaddrinfo ENOTFOUND ${host}`))).toBe('Error: getaddrinfo ENOTFOUND <host>');
    expect(COLD_ARCHIVE_SWEEP_FETCH).toBe('COLD_ARCHIVE_SWEEP_FETCH');
  });
});

describe('провод', () => {
  it('ColdArchiveSweepModule в app.module.ts; env-пример несёт оба флага выключенными/безопасными', () => {
    const appModule = readFileSync(join(OFFICE_ROOT, 'src/app.module.ts'), 'utf8');
    expect(appModule).toMatch(/import \{ ColdArchiveSweepModule \} from '\.\/modules\/cold-archive-sweep\/cold-archive-sweep\.module'/);
    expect(appModule).toMatch(/imports: \[[\s\S]*ColdArchiveSweepModule,[\s\S]*\]/);
    const example = readFileSync(join(OFFICE_ROOT, '.env.docker.example'), 'utf8');
    expect(example).toMatch(/^COLD_ARCHIVE_SWEEP_ENABLED=false$/m);
    expect(example).toMatch(/^COLD_ARCHIVE_SWEEP_DRY_RUN=true$/m);
  });
});
