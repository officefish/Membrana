/**
 * Зубы ручек «Пользователи кабинета» и клиента к двери кабинета (#2588 b3, порча P14–P17 плана
 * `docs/sprint/cut/cold-archive-retention-2588.json` + инвентарь маршрутов и сторож секрета).
 *
 * Без сети: fetch — подставной через конструктор (`CABINET_FETCH`). Красные на стволе 1cf33715:
 * модуля нет — import падает; в `panel-users.module.ts` ствола `CabinetUsersModule` нет; в
 * `env.schema.ts` ствола `CABINET_API_URL`/`CABINET_OFFICE_TOKEN` нет.
 *
 * Порчи после реализации: P14 без пары env отвечать пустым 200 или звать fetch → красный; P15 снять
 * `@OwnerAdmin` с ручки → красный (инвентарь); P16 не передавать актёра или брать его не из
 * panelIdentity → красный; P17 положить токен в исход/лог/текст ошибки → красный (сторож);
 * третья ручка под префиксом → красный; 500 вместо кода кабинета → красный.
 */
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HttpException, Logger, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { envSchema } from '../../config/env.schema';
import { PANEL_DENY_AS_404_KEY, PANEL_MIN_ROLE_KEY } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard } from '../panel-auth/panel-auth.guard';
import {
  CABINET_MEMBRANES_PATH,
  CABINET_OUTCOME_KINDS,
  CABINET_TIMEOUT_MS,
  CabinetUsersClient,
  refusalCodeFrom,
  resolveCabinetPair,
  sanitizeNetworkDetail,
  type CabinetFetch,
  type CabinetOutcome,
} from './cabinet-users.client';
import { CABINET_USERS_ROUTE_PREFIX, CabinetUsersController, unwrapCabinetOutcome } from './cabinet-users.controller';

const HERE = dirname(fileURLToPath(import.meta.url));
const OFFICE_ROOT = join(HERE, '..', '..', '..');

// Фикстуры — не секреты: слова, не hex (pre-commit gitleaks).
const TOKEN = 'office-to-cabinet-door-test-value';
const BASE = 'https://cabinet.test';
const M1 = '11111111-1111-4111-8111-111111111111';
const PAGE = {
  items: [{ membraneId: M1, userId: 'u-1', displayLabel: 'alice', tariffId: 'free', retentionDays: 14, isDefault: true, createdAt: '2026-10-01T10:00:00.000Z' }],
  nextCursor: null,
};

afterEach(() => vi.restoreAllMocks());

function response(status: number, body: unknown) {
  return { status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
}

function makeClient(fetchImpl: CabinetFetch, config: Partial<{ CABINET_API_URL: string; CABINET_OFFICE_TOKEN: string }> = { CABINET_API_URL: BASE, CABINET_OFFICE_TOKEN: TOKEN }) {
  const fetchSpy = vi.fn(fetchImpl);
  return { client: new CabinetUsersClient({ API_INTERNAL_TOKEN: 'internal', ...config } as never, fetchSpy), fetchSpy };
}

describe('CabinetUsersClient — P14 пара env', () => {
  it('без CABINET_API_URL и/или CABINET_OFFICE_TOKEN → cabinet-not-configured с именами недостающих; fetch не зван', async () => {
    const cases: [Partial<{ CABINET_API_URL: string; CABINET_OFFICE_TOKEN: string }>, string[]][] = [
      [{}, ['CABINET_API_URL', 'CABINET_OFFICE_TOKEN']],
      [{ CABINET_API_URL: BASE }, ['CABINET_OFFICE_TOKEN']],
      [{ CABINET_OFFICE_TOKEN: TOKEN }, ['CABINET_API_URL']],
      [{ CABINET_API_URL: '  ', CABINET_OFFICE_TOKEN: TOKEN }, ['CABINET_API_URL']],
    ];
    for (const [config, missing] of cases) {
      const { client, fetchSpy } = makeClient(async () => response(200, PAGE), config);
      expect(await client.listMembranes({})).toEqual({ kind: 'cabinet-not-configured', missing });
      expect(await client.setArchiveRetention(M1, 1, 'panel:owner')).toEqual({ kind: 'cabinet-not-configured', missing });
      expect(fetchSpy).toHaveBeenCalledTimes(0);
    }
  });

  it('resolveCabinetPair срезает хвостовые слэши адреса; в коде умолчаний адреса нет', () => {
    expect(resolveCabinetPair({ CABINET_API_URL: 'https://cabinet.test///', CABINET_OFFICE_TOKEN: TOKEN })).toEqual({ ok: true, baseUrl: 'https://cabinet.test', token: TOKEN });
    expect(resolveCabinetPair({})).toEqual({ ok: false, missing: ['CABINET_API_URL', 'CABINET_OFFICE_TOKEN'] });
    const source = readFileSync(join(HERE, 'cabinet-users.client.ts'), 'utf8');
    expect(source).not.toMatch(/membrana\.space|localhost:3020/);
  });
});

describe('CabinetUsersClient — вызовы двери и словарь исходов', () => {
  it('GET: путь двери b2, cursor/limit в строке запроса, заголовок X-Membrana-Token, таймаут 10 с', async () => {
    const { client, fetchSpy } = makeClient(async () => response(200, PAGE));
    expect(await client.listMembranes({ cursor: M1, limit: '2' })).toEqual({ kind: 'ok', data: PAGE });
    expect(await client.listMembranes({})).toEqual({ kind: 'ok', data: PAGE });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(`${BASE}${CABINET_MEMBRANES_PATH}?cursor=${M1}&limit=2`);
    expect(CABINET_MEMBRANES_PATH).toBe('/v1/internal/office/membranes');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Membrana-Token']).toBe(TOKEN);
    expect(init.body).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(CABINET_TIMEOUT_MS).toBe(10_000);
    expect(fetchSpy.mock.calls[1]![0]).toBe(`${BASE}${CABINET_MEMBRANES_PATH}`);
  });

  it('PUT: тело {days, actor}, JSON, путь с membraneId', async () => {
    const result = { membraneId: M1, retentionDays: 1, isDefault: false, updatedAt: '2026-10-05T16:00:00.000Z', updatedBy: 'panel:owner' };
    const { client, fetchSpy } = makeClient(async () => response(200, result));
    expect(await client.setArchiveRetention(M1, 1, 'panel:owner')).toEqual({ kind: 'ok', data: result });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(`${BASE}${CABINET_MEMBRANES_PATH}/${M1}/archive-retention`);
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body!)).toEqual({ days: 1, actor: 'panel:owner' });
  });

  it('4xx/5xx кабинета → cabinet-rejected со статусом и кодом из тела; тело без code → code null', async () => {
    const { client: c400 } = makeClient(async () => response(400, { code: 'invalid_retention_days', allowed: [1, 7, 14, 30, 90] }));
    expect(await c400.setArchiveRetention(M1, 2, 'panel:owner')).toEqual({ kind: 'cabinet-rejected', status: 400, code: 'invalid_retention_days' });
    const { client: c404 } = makeClient(async () => response(404, { code: 'membrane_not_found' }));
    expect(await c404.setArchiveRetention(M1, 1, 'panel:owner')).toEqual({ kind: 'cabinet-rejected', status: 404, code: 'membrane_not_found' });
    const { client: c503 } = makeClient(async () => response(503, 'office door is not configured (CABINET_OFFICE_TOKEN is not set)'));
    expect(await c503.listMembranes({})).toEqual({ kind: 'cabinet-rejected', status: 503, code: null });
    expect(refusalCodeFrom('{"code":"x"}')).toBe('x');
    expect(refusalCodeFrom('{"code":5}')).toBeNull();
    expect(refusalCodeFrom('not json')).toBeNull();
  });

  it('сеть/таймаут → cabinet-unreachable с классом ошибки; не-JSON 200 → cabinet-unreachable', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const timeout = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    const { client: cTimeout } = makeClient(async () => { throw timeout; });
    expect(await cTimeout.listMembranes({})).toEqual({ kind: 'cabinet-unreachable', detail: 'TimeoutError: The operation was aborted due to timeout' });
    const { client: cBad } = makeClient(async () => response(200, '<html>'));
    expect(await cBad.listMembranes({})).toEqual({ kind: 'cabinet-unreachable', detail: 'invalid JSON from cabinet' });
    expect([...CABINET_OUTCOME_KINDS]).toEqual(['ok', 'cabinet-not-configured', 'cabinet-unreachable', 'cabinet-rejected']);
  });
});

describe('P17 сторож секрета: токен уходит только заголовком', () => {
  it('ни один исход, лог и текст ошибки не содержит значения токена; заголовок его несёт', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const outcomes: CabinetOutcome<unknown>[] = [];
    const scenarios: CabinetFetch[] = [
      async () => response(200, PAGE),
      async () => response(401, { message: 'Invalid token' }),
      async () => response(503, 'office door is not configured (CABINET_OFFICE_TOKEN is not set)'),
      async () => { throw new Error('connect ECONNREFUSED'); },
      async () => response(200, 'garbage'),
    ];
    for (const scenario of scenarios) {
      const { client, fetchSpy } = makeClient(scenario);
      outcomes.push(await client.listMembranes({}), await client.setArchiveRetention(M1, 1, 'panel:owner'));
      for (const call of fetchSpy.mock.calls) expect(call[1].headers['X-Membrana-Token']).toBe(TOKEN);
    }
    const thrown = outcomes
      .filter((o) => o.kind !== 'ok')
      .map((o) => { try { unwrapCabinetOutcome(o); return ''; } catch (e) { return JSON.stringify((e as HttpException).getResponse()) + (e as Error).message; } });
    const everything = JSON.stringify(outcomes) + thrown.join('') + JSON.stringify(warn.mock.calls);
    expect(everything).not.toContain(TOKEN);
    expect(everything).not.toContain(BASE); // адрес кабинета тоже не нужен в исходах — путь достаточен
    expect(warn).toHaveBeenCalled();
  });

  it('P17b: сетевая ошибка с адресом кабинета из env → ни тело 502, ни текст исключения, ни Logger.warn хоста не несут', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const host = new URL(BASE).host; // 'cabinet.test'
    const errors = [
      Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { name: 'Error' }),
      Object.assign(new Error('connect ECONNREFUSED 203.0.113.7:3020'), { name: 'Error' }),
      Object.assign(new Error(`fetch failed: ${BASE}${CABINET_MEMBRANES_PATH} (${host}:443)`), { name: 'TypeError' }),
    ];
    for (const netError of errors) {
      const { client } = makeClient(async () => { throw netError; });
      const outcome = await client.listMembranes({});
      expect(outcome.kind).toBe('cabinet-unreachable');
      let thrown = '';
      try { unwrapCabinetOutcome(outcome); } catch (e) { thrown = JSON.stringify((e as HttpException).getResponse()) + (e as Error).message; }
      const everything = JSON.stringify(outcome) + thrown + JSON.stringify(warn.mock.calls);
      expect(everything, netError.message).not.toContain(host);
      expect(everything, netError.message).not.toContain('203.0.113.7');
      expect(everything, netError.message).not.toContain(BASE);
      expect(thrown).toContain('cabinet_unreachable');
      expect(thrown).not.toContain('detail');
    }
    expect(sanitizeNetworkDetail(errors[0])).toBe('Error: getaddrinfo ENOTFOUND <host>');
    expect(sanitizeNetworkDetail(errors[1])).toBe('Error: connect ECONNREFUSED <host>');
    expect(sanitizeNetworkDetail(errors[2])).toBe('TypeError: fetch failed: <url> (<host>)');
    expect(sanitizeNetworkDetail('not an error')).toBe('fetch failed');
  });
});

describe('CabinetUsersController — тонкий прокси, ошибки своим кодом', () => {
  function makeController(outcome: CabinetOutcome<unknown>) {
    const client = { listMembranes: vi.fn(async () => outcome), setArchiveRetention: vi.fn(async () => outcome) };
    return { controller: new CabinetUsersController(client as never), client };
  }
  const req = (sub: string | null) => ({ panelIdentity: { role: 'owner', sub } }) as never;

  it('GET отдаёт страницу кабинета как есть и передаёт cursor/limit', async () => {
    const { controller, client } = makeController({ kind: 'ok', data: PAGE });
    expect(await controller.list(M1, '2')).toEqual(PAGE);
    expect(client.listMembranes).toHaveBeenCalledWith({ cursor: M1, limit: '2' });
  });

  it('P16: PUT передаёт days как есть и актёра из panelIdentity.sub с префиксом panel:', async () => {
    const data = { membraneId: M1, retentionDays: 1, isDefault: false, updatedAt: 'x', updatedBy: 'panel:sub-42' };
    const { controller, client } = makeController({ kind: 'ok', data });
    expect(await controller.setArchiveRetention(M1, { days: 1 }, req('sub-42'))).toEqual(data);
    expect(client.setArchiveRetention).toHaveBeenCalledWith(M1, 1, 'panel:sub-42');
    await controller.setArchiveRetention(M1, { days: 7 }, req(null));
    expect(client.setArchiveRetention).toHaveBeenLastCalledWith(M1, 7, 'panel:owner');
  });

  it('P14: не настроено → 503 cabinet_not_configured с именами переменных', async () => {
    const { controller } = makeController({ kind: 'cabinet-not-configured', missing: ['CABINET_API_URL'] });
    const err = await controller.list(undefined, undefined).catch((e: unknown) => e as HttpException);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(503);
    expect((err as HttpException).getResponse()).toMatchObject({ code: 'cabinet_not_configured', missing: ['CABINET_API_URL'] });
  });

  it('недоступен → 502 cabinet_unreachable; отказ кабинета → его статус и его код (не 500)', async () => {
    const e502 = await makeController({ kind: 'cabinet-unreachable', detail: 'TimeoutError: x' }).controller.list(undefined, undefined).catch((e: unknown) => e as HttpException);
    expect(e502.getStatus()).toBe(502);
    // тело 502 — только код: detail сети в браузер не едет (ревью #2596 P1)
    expect(e502.getResponse()).toEqual({ code: 'cabinet_unreachable' });
    const e400 = await makeController({ kind: 'cabinet-rejected', status: 400, code: 'invalid_retention_days' }).controller.setArchiveRetention(M1, { days: 2 }, req('s')).catch((e: unknown) => e as HttpException);
    expect(e400.getStatus()).toBe(400);
    expect(e400.getResponse()).toEqual({ code: 'invalid_retention_days', status: 400 });
    const e404 = await makeController({ kind: 'cabinet-rejected', status: 404, code: 'membrane_not_found' }).controller.setArchiveRetention(M1, { days: 1 }, req('s')).catch((e: unknown) => e as HttpException);
    expect(e404.getStatus()).toBe(404);
    const e401 = await makeController({ kind: 'cabinet-rejected', status: 401, code: null }).controller.list(undefined, undefined).catch((e: unknown) => e as HttpException);
    expect(e401.getStatus()).toBe(401);
    expect(e401.getResponse()).toEqual({ code: 'cabinet_rejected', status: 401 });
  });
});

describe('инвентарь: ровно две ручки под v1/panel/admin/cabinet-users, обе @OwnerAdmin (P15), охрана PanelAuthGuard', () => {
  const proto = CabinetUsersController.prototype as Record<string, unknown>;
  const handlers = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== 'constructor' && typeof proto[name] === 'function' && Reflect.getMetadata(PATH_METADATA, proto[name] as object) !== undefined,
  );

  it('контракт маршрутов', () => {
    expect(Reflect.getMetadata(PATH_METADATA, CabinetUsersController)).toBe('v1/panel/admin/cabinet-users');
    expect(CABINET_USERS_ROUTE_PREFIX).toBe('v1/panel/admin/cabinet-users');
    const contract = handlers
      .map((name) => ({
        method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, proto[name] as object) as RequestMethod],
        path: String(Reflect.getMetadata(PATH_METADATA, proto[name] as object)),
        minRole: Reflect.getMetadata(PANEL_MIN_ROLE_KEY, proto[name] as object) as string,
        denyAs404: Reflect.getMetadata(PANEL_DENY_AS_404_KEY, proto[name] as object) === true,
      }))
      .sort((a, b) => (`${a.path} ${a.method}` < `${b.path} ${b.method}` ? -1 : 1));
    expect(contract).toEqual([
      { method: 'GET', path: '/', minRole: 'owner', denyAs404: true },
      { method: 'PUT', path: ':membraneId/archive-retention', minRole: 'owner', denyAs404: true },
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, CabinetUsersController)).toEqual([PanelAuthGuard]);
  });

  it('провод: CabinetUsersModule подключён из PanelUsersModule; env office знает пару кабинета', () => {
    const panelUsersModule = readFileSync(join(OFFICE_ROOT, 'src/modules/panel-users/panel-users.module.ts'), 'utf8');
    expect(panelUsersModule).toMatch(/import \{ CabinetUsersModule \} from '\.\.\/cabinet-users\/cabinet-users\.module'/);
    expect(panelUsersModule).toMatch(/imports: \[[^\]]*CabinetUsersModule[^\]]*\]/);
    const example = readFileSync(join(OFFICE_ROOT, '.env.docker.example'), 'utf8');
    expect(example).toMatch(/CABINET_API_URL/);
    expect(example).toMatch(/CABINET_OFFICE_TOKEN/);
  });
});

describe('env office: CABINET_API_URL / CABINET_OFFICE_TOKEN', () => {
  const base = {
    API_INTERNAL_TOKEN: 'internal',
    ANTHROPIC_API_KEY: 'a',
    GITHUB_TOKEN: 'g',
    GITHUB_OWNER: 'o',
    GITHUB_REPO: 'r',
  };

  it('не заданы или пустые → undefined, конфиг валиден', () => {
    for (const env of [base, { ...base, CABINET_API_URL: '', CABINET_OFFICE_TOKEN: ' ' }]) {
      const parsed = envSchema.safeParse(env);
      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.CABINET_API_URL).toBeUndefined();
      expect(parsed.success && parsed.data.CABINET_OFFICE_TOKEN).toBeUndefined();
    }
  });

  it('адрес обязан быть URL; пара принимается как есть', () => {
    expect(envSchema.safeParse({ ...base, CABINET_API_URL: 'not a url' }).success).toBe(false);
    const parsed = envSchema.safeParse({ ...base, CABINET_API_URL: 'https://cabinet.test', CABINET_OFFICE_TOKEN: TOKEN });
    expect(parsed.success && parsed.data.CABINET_API_URL).toBe('https://cabinet.test');
    expect(parsed.success && parsed.data.CABINET_OFFICE_TOKEN).toBe(TOKEN);
  });
});
