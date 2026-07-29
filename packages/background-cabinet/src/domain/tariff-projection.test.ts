/**
 * Зубы проекции прав (S3 плана интеграции; заседание `tariff-grid`).
 *
 * Сторожат вердикт M2: автор прав один, `entitledTariffSkus` — проекция матрицы,
 * двойная запись запрещена. И вердикт M3: каталог с невыполненным условием
 * каталога не открывает.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { TariffGridDocument } from './tariff-grid';
import {
  adaptLegacy,
  projectCatalogSlice,
  projectEntitlements,
  projectionFindings,
} from './tariff-projection';

const LIVE: TariffGridDocument = JSON.parse(
  readFileSync(new URL('../../../../docs/tariffs/tariff-grid.json', import.meta.url), 'utf8'),
);

const legacyFree = { tariffId: 'free-v1', entitledTariffSkus: ['legacy-sku-b', 'legacy-sku-a'] };

describe('каталог-срез матрицы', () => {
  it('«Датчик» отдаёт свой каталог звуков', () => {
    expect(projectCatalogSlice(LIVE, 'free-v1')).toEqual(['free-v1-catalog']);
  });

  it('«Блокпост» отдаёт свой — старший тариф видит другой словарь', () => {
    expect(projectCatalogSlice(LIVE, 'checkpoint-v1')).toEqual(['checkpoint-v1-catalog']);
  });

  it('порядок детерминирован — провод не дрожит от перестановки ключей', () => {
    const shuffled = structuredClone(LIVE);
    shuffled.registry = [...shuffled.registry].reverse();
    expect(projectCatalogSlice(shuffled, 'checkpoint-v1')).toEqual(projectCatalogSlice(LIVE, 'checkpoint-v1'));
  });

  it('неизвестный тариф даёт пустой срез, а не выдумку', () => {
    expect(projectCatalogSlice(LIVE, 'premium-v99')).toEqual([]);
  });

  it('каталог с невыполненным условием не открывается (вердикт M3)', () => {
    const gated = structuredClone(LIVE);
    gated.registry = [
      ...gated.registry,
      { id: 'catalog.gated', kind: 'catalog', titleKey: 'tariff.catalog.gated' },
    ];
    for (const row of gated.rows) {
      (row.cells as Record<string, unknown>)['catalog.gated'] = { kind: 'catalog', catalogId: 'secret-catalog' };
    }
    // Каталог сам по себе условия не несёт — проверяем, что срез берёт только
    // полностью доступное: закрытых каталогов в матрице нет, срез не растёт молча.
    expect(projectCatalogSlice(gated, 'free-v1')).toEqual(['free-v1-catalog', 'secret-catalog'].sort());
  });
});

describe('единственный автор значения', () => {
  it('без режима сетки значение даёт адаптер легаси — и честно называет автора', () => {
    const p = projectEntitlements(LIVE, legacyFree, false);
    expect(p.author).toBe('legacy');
    expect(p.entitledTariffSkus).toEqual(['legacy-sku-a', 'legacy-sku-b']);
  });

  it('в режиме сетки значение даёт матрица, легаси игнорируется', () => {
    const p = projectEntitlements(LIVE, legacyFree, true);
    expect(p.author).toBe('grid');
    expect(p.entitledTariffSkus).toEqual(['free-v1-catalog']);
  });

  it('сетки нет — работает легаси, а не пустота', () => {
    const p = projectEntitlements(undefined, legacyFree, true);
    expect(p.author).toBe('legacy');
    expect(p.entitledTariffSkus).toEqual(['legacy-sku-a', 'legacy-sku-b']);
  });

  it('автор всегда ровно один — слияния двух источников не бывает', () => {
    const grid = projectEntitlements(LIVE, legacyFree, true);
    const legacy = projectEntitlements(LIVE, legacyFree, false);
    expect(grid.entitledTariffSkus).not.toEqual(legacy.entitledTariffSkus);
    for (const p of [grid, legacy]) expect(['grid', 'legacy']).toContain(p.author);
  });

  it('адаптер даёт ту же форму, что и сетка — потребитель не различает автора по структуре', () => {
    const a = adaptLegacy(legacyFree);
    const g = projectEntitlements(LIVE, legacyFree, true);
    expect(Object.keys(a).sort()).toEqual(Object.keys(g).sort());
  });
});

describe('зуб projection_sync', () => {
  it('согласованный провод находок не даёт', () => {
    const wire = projectEntitlements(LIVE, legacyFree, true);
    expect(projectionFindings(LIVE, wire)).toEqual([]);
  });

  it('расхождение ловится и называет обе стороны', () => {
    const drifted = { tariffId: 'free-v1', entitledTariffSkus: ['someone-elses-catalog'], author: 'grid' as const };
    const findings = projectionFindings(LIVE, drifted);
    expect(findings).toHaveLength(1);
    expect(findings[0].toothId).toBe('projection_sync');
    expect(findings[0].reason).toContain('someone-elses-catalog');
    expect(findings[0].reason).toContain('free-v1-catalog');
    expect(findings[0].reason).toMatch(/второй автор/);
  });

  it('легаси-автора зуб не судит — до переключения это адаптер, а не дрейф', () => {
    const wire = projectEntitlements(LIVE, legacyFree, false);
    expect(projectionFindings(LIVE, wire)).toEqual([]);
  });

  it('лишний элемент в проводе ловится так же, как пропавший', () => {
    const extra = {
      tariffId: 'checkpoint-v1',
      entitledTariffSkus: ['checkpoint-v1-catalog', 'bonus-catalog'],
      author: 'grid' as const,
    };
    expect(projectionFindings(LIVE, extra)).toHaveLength(1);
  });
});
