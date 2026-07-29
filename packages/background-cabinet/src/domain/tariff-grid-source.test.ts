/**
 * Зубы источника документа сетки (S3 плана интеграции).
 *
 * Сторожат две вещи, на которых легко соврать себе: битый документ не должен
 * работать «наполовину», а режим сетки не должен включаться сам собой — переход
 * на неё как на единственный источник истины это отдельный шаг плана (S9).
 */
import { describe, expect, it, beforeEach } from 'vitest';

import {
  isTariffGridMode,
  loadTariffGrid,
  resetTariffGridCache,
  resolveGridPath,
  TARIFF_GRID_PATH,
} from './tariff-grid-source';

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
});

describe('переключатель режима', () => {
  it('по умолчанию ВЫКЛЮЧЕН — переход на сетку это шаг S9, не побочный эффект', () => {
    expect(isTariffGridMode({})).toBe(false);
  });

  it('включается только точным значением — «почти включено» не считается', () => {
    expect(isTariffGridMode({ TARIFF_GRID_MODE: '1' })).toBe(true);
    expect(isTariffGridMode({ TARIFF_GRID_MODE: 'true' })).toBe(false);
    expect(isTariffGridMode({ TARIFF_GRID_MODE: '0' })).toBe(false);
    expect(isTariffGridMode({ TARIFF_GRID_MODE: '' })).toBe(false);
  });
});
