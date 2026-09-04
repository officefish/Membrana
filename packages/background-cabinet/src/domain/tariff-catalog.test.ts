/**
 * Зубы витрины тарифов (#2281).
 *
 * Несущее обещание одно: витрина показывает ТОЛЬКО выбираемое. Тариф, живущий в одном из двух
 * списков, выбором не является — он либо откажется доменом, либо сломает запись ссылочной
 * целостностью. Зубы держат обе половины пересечения по отдельности.
 */
import { describe, expect, it } from 'vitest';

import { buildTariffCatalog, type TariffRecord } from './tariff-catalog';
import type { TariffGridDocument } from './tariff-grid';

const grid: TariffGridDocument = {
  version: 1,
  registry: [],
  rows: [
    { sku: 'observatory-v1', productName: 'Обсерватория', rank: 30, cells: {} },
    { sku: 'free-v1', productName: 'Датчик', rank: 10, cells: {} },
    { sku: 'checkpoint-v1', productName: 'Блокпост', rank: 20, cells: {} },
    { sku: 'ghost-v1', productName: 'Призрак сетки', rank: 40, cells: {} },
  ],
};

const record = (id: string, over: Partial<TariffRecord> = {}): TariffRecord => ({
  id,
  userStorageQuotaBytes: 1n,
  bufferQuotaBytes: 2n,
  maxNodesPerMembrane: 1,
  maxUserWorkspaces: 3,
  ...over,
});

const records = [record('free-v1'), record('checkpoint-v1'), record('observatory-v1'), record('orphan-v1')];

describe('витрина тарифов', () => {
  it('показывает пересечение сетки и базы, по возрастанию ранга', () => {
    const items = buildTariffCatalog(grid, records, 'free-v1');
    expect(items.map((i) => i.id)).toEqual(['free-v1', 'checkpoint-v1', 'observatory-v1']);
  });

  it('тариф ЕСТЬ в сетке, НЕТ в базе — не показан: присвоить его нельзя', () => {
    const items = buildTariffCatalog(grid, records, 'free-v1');
    expect(items.map((i) => i.id)).not.toContain('ghost-v1');
  });

  it('тариф ЕСТЬ в базе, НЕТ в сетке — не показан: домен откажет unknown_target_tariff', () => {
    const items = buildTariffCatalog(grid, records, 'free-v1');
    expect(items.map((i) => i.id)).not.toContain('orphan-v1');
  });

  it('текущий тариф помечен и НЕ вычеркнут — витрина обязана показать, где владелец стоит', () => {
    const items = buildTariffCatalog(grid, records, 'checkpoint-v1');
    expect(items.filter((i) => i.current).map((i) => i.id)).toEqual(['checkpoint-v1']);
    expect(items).toHaveLength(3);
  });

  it('имя берётся из сетки — она автор продуктовых имён, база хранит машинный id', () => {
    const items = buildTariffCatalog(grid, records, 'free-v1');
    expect(items.find((i) => i.id === 'checkpoint-v1')?.name).toBe('Блокпост');
  });

  it('числа уезжают СТРОКАМИ: bigint не переживает JSON', () => {
    const big = 9_007_199_254_740_993n; // > Number.MAX_SAFE_INTEGER — через number потерялось бы
    const items = buildTariffCatalog(grid, [record('free-v1', { userStorageQuotaBytes: big })], 'free-v1');
    expect(items[0]!.userStorageQuotaBytes).toBe('9007199254740993');
  });

  it('база пуста — витрина пуста, а не «вся сетка»', () => {
    expect(buildTariffCatalog(grid, [], 'free-v1')).toEqual([]);
  });

  it('текущий тариф вне пересечения — витрина всё равно строится, current просто ни на ком', () => {
    // Мембрана на тарифе, выпавшем из сетки: это состояние ствола, а не повод падать.
    const items = buildTariffCatalog(grid, records, 'orphan-v1');
    expect(items).toHaveLength(3);
    expect(items.some((i) => i.current)).toBe(false);
  });
});
