import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  expandWildcard,
  fetchAdminUsers,
  formatAuditEntry,
  grantCellState,
  mintPromoCode,
  toggleGrant,
} from './adminApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOnce(status: number, body: unknown) {
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('матрица грантов (PU3): три состояния ячейки', () => {
  it('grantCellState: явный / wildcard / нет', () => {
    expect(grantCellState(['detector-compare'], 'detector-compare')).toBe('granted');
    expect(grantCellState(['*'], 'detector-compare')).toBe('wildcard');
    // Явный грант приоритетнее wildcard — ячейку можно снять кликом.
    expect(grantCellState(['*', 'detector-compare'], 'detector-compare')).toBe('granted');
    expect(grantCellState([], 'detector-compare')).toBe('none');
  });

  it('toggleGrant: добавляет и снимает явный грант, не трогая остальные', () => {
    expect(toggleGrant([], 'a')).toEqual(['a']);
    expect(toggleGrant(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleGrant(['*'], 'a')).toEqual(['*', 'a']);
  });

  it("expandWildcard: '*' разворачивается в явный список без дублей", () => {
    expect(expandWildcard(['*'], ['a', 'b'])).toEqual(['a', 'b']);
    expect(expandWildcard(['*', 'a'], ['a', 'b'])).toEqual(['a', 'b']);
    expect(expandWildcard(['a'], ['a', 'b'])).toEqual(['a']);
  });
});

describe('adminApi: контракт ручек PU1', () => {
  it('fetchAdminUsers: credentials include; 404 → человеческая ошибка про владельца', async () => {
    const fn = mockFetchOnce(200, { degraded: false, users: [], audit: [] });
    await fetchAdminUsers();
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/v1/panel/admin/users');
    expect(init.credentials).toBe('include');

    mockFetchOnce(404, {});
    await expect(fetchAdminUsers()).rejects.toThrow('только владельцу');
  });

  it('mintPromoCode: POST с телом; полный код приходит один раз', async () => {
    const fn = mockFetchOnce(201, { id: 'code-1', code: 'ABCD1234EFGH5678', label: 'x', grants: ['*'] });
    const minted = await mintPromoCode({ label: 'x', grants: ['*'], days: 7, maxUses: 3 });
    expect(minted.code).toBe('ABCD1234EFGH5678');
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/v1/panel/admin/promo-codes');
    expect(JSON.parse(String(init.body))).toEqual({ label: 'x', grants: ['*'], days: 7, maxUses: 3 });
  });
});

describe('formatAuditEntry', () => {
  it('аудит читается текстом, действие переведено', () => {
    const line = formatAuditEntry({
      at: '2026-07-14T18:02:00.000Z',
      actor: 'github:1:owner',
      action: 'grants',
      target: 'user-1',
      detail: 'name=Petrov grants=[detector-compare] (было [*])',
    });
    expect(line).toContain('изменение доступа');
    expect(line).toContain('Petrov');
    expect(line).toContain('github:1:owner');
  });
});
