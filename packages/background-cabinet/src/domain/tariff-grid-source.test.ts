/**
 * Зубы источника документа сетки (S3 плана интеграции).
 *
 * Сторожат две вещи, на которых легко соврать себе: битый документ не должен
 * работать «наполовину», а внешний режим сетки больше не должен существовать
 * как второй источник правды.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeEach } from 'vitest';

import { loadTariffGrid, resetTariffGridCache, resolveGridPath, TARIFF_GRID_PATH } from './tariff-grid-source';

describe('источник документа сетки', () => {
  beforeEach(() => resetTariffGridCache());

  it('живой документ читается и проходит проверку формы', () => {
    const grid = loadTariffGrid(TARIFF_GRID_PATH);
    expect(grid).toBeDefined();
    expect(grid!.rows).toHaveLength(3);
    expect(grid!.registry.length).toBeGreaterThan(0);
  });

  it('отсутствующий документ — undefined, а не падение сервиса', () => {
    expect(loadTariffGrid('docs/tariffs/no-such-file.json')).toBeUndefined();
  });

  it('битая форма отвергается целиком — половина матрицы прав хуже легаси', () => {
    // package.json — валидный JSON, но не документ сетки: registry и rows нет.
    expect(loadTariffGrid('package.json')).toBeUndefined();
  });

  it('документ находится и из корня, и из каталога пакета (поиск вверх)', () => {
    expect(resolveGridPath(TARIFF_GRID_PATH, process.cwd())).toBeDefined();
    expect(resolveGridPath('docs/tariffs/no-such.json', process.cwd())).toBeUndefined();
  });

  it('стартовый источник читает сетку один раз за процесс и не пишет Tariff', () => {
    const sourceText = readFileSync(new URL('./tariff-grid-source.ts', import.meta.url), 'utf8');
    expect(sourceText).not.toMatch(/\bprisma\b|tariff\.(?:create|createMany|upsert|update|updateMany|delete|deleteMany)/iu);

    const liveGridPath = resolveGridPath(TARIFF_GRID_PATH);
    expect(liveGridPath).toBeDefined();

    const scratch = mkdtempSync(join(tmpdir(), 'tariff-grid-source-'));
    try {
      const tempGridPath = join(scratch, 'tariff-grid.json');
      writeFileSync(tempGridPath, readFileSync(liveGridPath!, 'utf8'));

      const first = loadTariffGrid(tempGridPath);
      writeFileSync(tempGridPath, '{"rows":[]}');

      expect(loadTariffGrid(tempGridPath)).toBe(first);
      expect(first!.rows).toHaveLength(3);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

describe('снятый переключатель режима', () => {
  it('модуль не экспортирует внешний рубильник режима', async () => {
    const source = await import('./tariff-grid-source');
    expect('isTariffGridMode' in source).toBe(false);
  });
});
