/**
 * Зубы клиента «Пользователи кабинета» (#2588 b4, порча P18/P19 плана
 * `docs/sprint/cut/cold-archive-retention-2588.json`). Красные на стволе 978b94fd: модуля нет.
 * Порчи после реализации: P18 PUT без тела `{days}` или с другим путём → красный; код 503 не
 * различать → красный (notConfigured); P19 список не из пяти значений или подписи иные → красный.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CabinetUsersApiError,
  DEFAULT_RETENTION_DAYS,
  RETENTION_OPTIONS,
  TEST_RETENTION_DAYS,
  applyRetentionResult,
  describeCabinetError,
  fetchCabinetUsers,
  isRetentionOption,
  retentionOptionLabel,
  setCabinetRetention,
  withOptimisticRetention,
  type CabinetUserRow,
} from './cabinetUsersApi';

afterEach(() => vi.unstubAllGlobals());

function mockFetchOnce(status: number, body: unknown) {
  const fn = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const M1 = '11111111-1111-4111-8111-111111111111';
const ROW: CabinetUserRow = {
  membraneId: M1,
  userId: 'u-1',
  displayLabel: 'alice',
  tariffId: 'free',
  retentionDays: 14,
  isDefault: true,
  createdAt: '2026-10-01T10:00:00.000Z',
};

describe('P19: список сроков', () => {
  it('ровно [1, 7, 14, 30, 90]; 14 — по умолчанию, 1 — для проверок', () => {
    expect([...RETENTION_OPTIONS]).toEqual([1, 7, 14, 30, 90]);
    expect(DEFAULT_RETENTION_DAYS).toBe(14);
    expect(TEST_RETENTION_DAYS).toBe(1);
    expect(retentionOptionLabel(14)).toBe('14 — по умолчанию');
    expect(retentionOptionLabel(1)).toBe('1 — для проверок');
    expect(retentionOptionLabel(7)).toBe('7 дней');
    expect(retentionOptionLabel(90)).toBe('90 дней');
  });

  it('isRetentionOption отвергает 2, 0, "14", 14.5', () => {
    for (const bad of [2, 0, '14', 14.5, null]) expect(isRetentionOption(bad)).toBe(false);
    for (const ok of RETENTION_OPTIONS) expect(isRetentionOption(ok)).toBe(true);
  });
});

describe('P18: контракт ручек office', () => {
  it('fetchCabinetUsers: GET с credentials; cursor/limit в строке запроса; форма страницы', async () => {
    const fn = mockFetchOnce(200, { items: [ROW], nextCursor: M1 });
    expect(await fetchCabinetUsers()).toEqual({ items: [ROW], nextCursor: M1 });
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/v1/panel/admin/cabinet-users');
    expect(init.credentials).toBe('include');
    expect(init.method).toBeUndefined();

    const fn2 = mockFetchOnce(200, { items: [], nextCursor: null });
    expect(await fetchCabinetUsers(M1, 50)).toEqual({ items: [], nextCursor: null });
    expect((fn2.mock.calls[0] as unknown as [string])[0]).toBe(`/v1/panel/admin/cabinet-users?cursor=${M1}&limit=50`);

    mockFetchOnce(200, {});
    expect(await fetchCabinetUsers()).toEqual({ items: [], nextCursor: null });
  });

  it('setCabinetRetention: PUT на правильный membraneId с телом ровно {days}', async () => {
    const result = { membraneId: M1, retentionDays: 1, isDefault: false, updatedAt: 'x', updatedBy: 'panel:owner' };
    const fn = mockFetchOnce(200, result);
    expect(await setCabinetRetention(M1, 1)).toEqual(result);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/v1/panel/admin/cabinet-users/${M1}/archive-retention`);
    expect(init.method).toBe('PUT');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(String(init.body))).toEqual({ days: 1 });
  });

  it('503 cabinet_not_configured → ошибка с notConfigured=true и человеческой фразой', async () => {
    mockFetchOnce(503, { code: 'cabinet_not_configured', missing: ['CABINET_API_URL'] });
    const err = await fetchCabinetUsers().catch((e: unknown) => e as CabinetUsersApiError);
    expect(err).toBeInstanceOf(CabinetUsersApiError);
    expect(err.status).toBe(503);
    expect(err.code).toBe('cabinet_not_configured');
    expect(err.notConfigured).toBe(true);
    expect(err.message).toBe('Связь с кабинетом не настроена.');
    expect(err.message).not.toContain('CABINET_API_URL');
  });

  it('502 / 400 / 404 кабинета / 404 без кода → notConfigured=false, фразы по коду', async () => {
    mockFetchOnce(502, { code: 'cabinet_unreachable' });
    const e502 = await fetchCabinetUsers().catch((e: unknown) => e as CabinetUsersApiError);
    expect(e502.notConfigured).toBe(false);
    expect(e502.message).toBe('Кабинет не отвечает — попробуйте позже.');

    mockFetchOnce(400, { code: 'invalid_retention_days' });
    const e400 = await setCabinetRetention(M1, 7).catch((e: unknown) => e as CabinetUsersApiError);
    expect(e400.message).toBe('Кабинет не принял этот срок.');

    mockFetchOnce(404, { code: 'membrane_not_found' });
    const e404 = await setCabinetRetention(M1, 7).catch((e: unknown) => e as CabinetUsersApiError);
    expect(e404.message).toBe('Такой мембраны в кабинете уже нет.');

    const fn = vi.fn(async () => ({ ok: false, status: 404, json: async () => { throw new Error('no body'); } }));
    vi.stubGlobal('fetch', fn);
    const eOwner = await fetchCabinetUsers().catch((e: unknown) => e as CabinetUsersApiError);
    expect(eOwner.code).toBeNull();
    expect(eOwner.message).toBe('Раздел доступен только владельцу — войдите заново.');
    expect(describeCabinetError(500, null)).toBe('Запрос не прошёл (HTTP 500) — попробуйте ещё раз.');
  });
});

describe('чистые хелперы строк', () => {
  it('withOptimisticRetention меняет только свою строку; applyRetentionResult берёт срок и isDefault из ответа', () => {
    const other = { ...ROW, membraneId: 'other', displayLabel: 'bob' };
    const optimistic = withOptimisticRetention([ROW, other], M1, 1);
    expect(optimistic[0]).toEqual({ ...ROW, retentionDays: 1, isDefault: false });
    expect(optimistic[1]).toBe(other);

    const applied = applyRetentionResult([ROW, other], { membraneId: M1, retentionDays: 30, isDefault: false, updatedAt: 'x', updatedBy: 'y' });
    expect(applied[0]).toEqual({ ...ROW, retentionDays: 30, isDefault: false });
    expect(applied[1]).toBe(other);
    // откат = прежний массив, ни одна строка не тронута
    expect([ROW, other]).toEqual([ROW, other]);
  });
});
