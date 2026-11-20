/**
 * Зубы ручки панели «пульс и режим» (#2632 g5b; Т1, Т6). Порчи: снять @OwnerAdmin → красный; выключенная
 * уборка спрашивает media → красный; режим не по флагам → красный; отказ media → 500 вместо своего кода →
 * красный; ручка не зарегистрирована в модуле → красный.
 */
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HttpException, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { PANEL_DENY_AS_404_KEY, PANEL_MIN_ROLE_KEY } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard } from '../panel-auth/panel-auth.guard';
import { ColdArchivePulseController } from './cold-archive-pulse.controller';
import { ColdArchiveSweepClient, type SweepFetch } from './cold-archive-sweep.client';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://media.internal:3200';
const reply = (status: number, body: unknown) => ({ status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

function make(flags: { COLD_ARCHIVE_SWEEP_ENABLED: boolean; COLD_ARCHIVE_SWEEP_DRY_RUN: boolean }, fetchImpl: SweepFetch) {
  const fetchSpy = vi.fn(fetchImpl);
  const config = { MEDIA_API_URL: BASE, MEDIA_API_TOKEN: 'media-door-test-value', API_INTERNAL_TOKEN: 'x', ...flags };
  const client = new ColdArchiveSweepClient(config as never, fetchSpy);
  return { controller: new ColdArchivePulseController(config as never, client), fetchSpy };
}

const RECENT = { lastSucceededRunAt: new Date(Date.now() - 60_000).toISOString(), lastFinishedRunAt: new Date(Date.now() - 60_000).toISOString() };

describe('GET v1/panel/admin/cold-archive/pulse', () => {
  it('Т6: выключено → mode/pulse disabled, media не вызывается', async () => {
    const { controller, fetchSpy } = make({ COLD_ARCHIVE_SWEEP_ENABLED: false, COLD_ARCHIVE_SWEEP_DRY_RUN: false }, async () => reply(200, RECENT));
    expect(await controller.pulse()).toMatchObject({ mode: 'disabled', pulse: 'disabled', lastSucceededRunAt: null });
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it('режим по флагам: dry-run / live; пульс из двери purge-pulse (GET, токен заголовком)', async () => {
    const dry = make({ COLD_ARCHIVE_SWEEP_ENABLED: true, COLD_ARCHIVE_SWEEP_DRY_RUN: true }, async () => reply(200, RECENT));
    expect(await dry.controller.pulse()).toMatchObject({ mode: 'dry-run', pulse: 'ok', ...RECENT });
    const [url, init] = dry.fetchSpy.mock.calls[0]!;
    expect([init.method, url]).toEqual(['GET', `${BASE}/v1/internal/downgrade-archive/purge-pulse`]);
    expect(init.headers['X-Membrana-Token']).toBe('media-door-test-value');

    const live = make({ COLD_ARCHIVE_SWEEP_ENABLED: true, COLD_ARCHIVE_SWEEP_DRY_RUN: false }, async () => reply(200, { lastSucceededRunAt: null, lastFinishedRunAt: null }));
    expect(await live.controller.pulse()).toMatchObject({ mode: 'live', pulse: 'stale' });
  });

  it('отказы media → свой код, не 500: 5xx → 502, сеть → 502, кривая форма → 502, 401 → 401', async () => {
    const on = { COLD_ARCHIVE_SWEEP_ENABLED: true, COLD_ARCHIVE_SWEEP_DRY_RUN: true };
    const status = async (fetchImpl: SweepFetch) => ((await make(on, fetchImpl).controller.pulse().catch((e: unknown) => e)) as HttpException).getStatus();
    expect(await status(async () => reply(500, 'boom'))).toBe(502);
    expect(await status(async () => { throw new Error('connect ECONNREFUSED'); })).toBe(502);
    expect(await status(async () => reply(200, { lastSucceededRunAt: 'never' }))).toBe(502);
    expect(await status(async () => reply(401, { message: 'Invalid token' }))).toBe(401);
  });

  it('инвентарь: ровно один GET pulse, @OwnerAdmin (owner, 404 не-owner), PanelAuthGuard; контроллер в модуле', () => {
    const proto = ColdArchivePulseController.prototype as Record<string, unknown>;
    const handlers = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor' && Reflect.getMetadata(PATH_METADATA, proto[n] as object) !== undefined);
    expect(Reflect.getMetadata(PATH_METADATA, ColdArchivePulseController)).toBe('v1/panel/admin/cold-archive');
    expect(
      handlers.map((n) => ({
        method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, proto[n] as object) as RequestMethod],
        path: String(Reflect.getMetadata(PATH_METADATA, proto[n] as object)),
        minRole: Reflect.getMetadata(PANEL_MIN_ROLE_KEY, proto[n] as object) as string,
        denyAs404: Reflect.getMetadata(PANEL_DENY_AS_404_KEY, proto[n] as object) === true,
      })),
    ).toEqual([{ method: 'GET', path: 'pulse', minRole: 'owner', denyAs404: true }]);
    expect(Reflect.getMetadata(GUARDS_METADATA, ColdArchivePulseController)).toEqual([PanelAuthGuard]);
    expect(readFileSync(join(HERE, 'cold-archive-sweep.module.ts'), 'utf8')).toMatch(/controllers: \[[^\]]*ColdArchivePulseController[^\]]*\]/);
  });
});
