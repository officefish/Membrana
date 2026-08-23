/**
 * Зубы механизма плагинов страницы. Почва коворка, переработаны блоком l1 `cabinet-layout`.
 *
 * ЧАСТЬ ЗУБОВ ПЕРЕПИСАНА, А НЕ УДАЛЕНА. Два правила почвы сняты словом владельца 23.08:
 * «показ выбирается кликом» и «свернуть нельзя без виджета». Зуб, закреплявший отменённое
 * правило, обязан быть переписан вслух — молча удалённый зуб не отличить от потерянного.
 */
import { describe, expect, it } from 'vitest';

import {
  initialPagePluginsState,
  isEnabled,
  isSupportedForm,
  setEnabled,
  setMainCollapsed,
  shownPlugins,
  type CabinetPagePlugin,
} from './pagePlugins';

const plugin = (id: string, form: CabinetPagePlugin['form'] = 'row'): CabinetPagePlugin => ({
  id,
  name: `Жилец ${id}`,
  form,
  renderWidget: () => null,
});

const plugins = [plugin('one'), plugin('two'), plugin('three')];

describe('включённость — операция реестра, не поле описания (M5′ не отменён)', () => {
  it('описание жильца поля enabled не несёт', () => {
    expect('enabled' in plugin('one')).toBe(false);
  });

  it('включение и выключение меняют состояние, а не описание', () => {
    let s = initialPagePluginsState;
    expect(isEnabled(s, 'one')).toBe(false);
    s = setEnabled(s, 'one', true);
    expect(isEnabled(s, 'one')).toBe(true);
    s = setEnabled(s, 'one', false);
    expect(isEnabled(s, 'one')).toBe(false);
  });

  it('повторное включение не плодит дублей', () => {
    let s = setEnabled(initialPagePluginsState, 'one', true);
    s = setEnabled(s, 'one', true);
    expect(s.enabled).toEqual(['one']);
  });
});

describe('включённость И ЕСТЬ показ (правило почвы снято владельцем 23.08)', () => {
  it('включённый показывается сразу — отдельного действия показа больше НЕТ', () => {
    const s = setEnabled(initialPagePluginsState, 'one', true);
    expect(shownPlugins(plugins, s).map((p) => p.id)).toEqual(['one']);
  });

  it('включены двое — рисуются ОБА, стопкой', () => {
    let s = setEnabled(initialPagePluginsState, 'one', true);
    s = setEnabled(s, 'three', true);
    expect(shownPlugins(plugins, s).map((p) => p.id)).toEqual(['one', 'three']);
  });

  it('порядок — объявления страницей, а не включения: перещёлкивание не тасует список', () => {
    let s = setEnabled(initialPagePluginsState, 'three', true);
    s = setEnabled(s, 'one', true);
    // Включён сначала third, но порядок берётся у страницы.
    expect(shownPlugins(plugins, s).map((p) => p.id)).toEqual(['one', 'three']);
  });

  it('выключенный исчезает из показа, соседи остаются', () => {
    let s = setEnabled(initialPagePluginsState, 'one', true);
    s = setEnabled(s, 'two', true);
    s = setEnabled(s, 'one', false);
    expect(shownPlugins(plugins, s).map((p) => p.id)).toEqual(['two']);
  });

  it('состояние поля activeId НЕ несёт — понятия «активный жилец» больше нет', () => {
    expect('activeId' in initialPagePluginsState).toBe(false);
  });
});

describe('сворачивание самостоятельно (второе снятое правило)', () => {
  it('свернуть можно БЕЗ единого включённого жильца', () => {
    // Прежний зуб требовал обратного: «сворачивать нечего, пока виджета нет».
    const s = setMainCollapsed(initialPagePluginsState, true);
    expect(s.mainCollapsed).toBe(true);
  });

  it('выключение жильца свёрнутость НЕ отменяет — человек свернул для себя', () => {
    let s = setEnabled(initialPagePluginsState, 'one', true);
    s = setMainCollapsed(s, true);
    s = setEnabled(s, 'one', false);
    expect(s.mainCollapsed).toBe(true);
  });

  it('разворачивается тем же переключателем', () => {
    let s = setMainCollapsed(initialPagePluginsState, true);
    s = setMainCollapsed(s, false);
    expect(s.mainCollapsed).toBe(false);
  });
});

describe('формы показа', () => {
  it('страница знает свои формы; чужая форма — не отказ, а честная заглушка', () => {
    expect(isSupportedForm('row')).toBe(true);
    expect(isSupportedForm('time-series')).toBe(true);
    expect(isSupportedForm('zone-map')).toBe(false);
    expect(isSupportedForm('x-radar')).toBe(false);
  });
});
