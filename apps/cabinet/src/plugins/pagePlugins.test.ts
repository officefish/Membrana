/**
 * Зубы механизма плагинов страницы (блок B). Соседей нет: ядро чистое, жилец — заглушка.
 * Проверяется логика, а не рендер: оснастка кабинета тестирует `.test.ts` без DOM.
 */
import { describe, expect, it } from 'vitest';

import {
  activePlugin,
  initialPagePluginsState,
  isEnabled,
  isSupportedForm,
  setActive,
  setEnabled,
  setMainCollapsed,
  type CabinetPagePlugin,
} from './pagePlugins';

const plugin = (id: string, form: CabinetPagePlugin['form'] = 'row'): CabinetPagePlugin => ({
  id,
  name: `Жилец ${id}`,
  form,
  renderWidget: () => null,
});

const plugins = [plugin('one'), plugin('two')];

describe('включённость — операция реестра, не поле описания (M5′)', () => {
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

describe('виджет и основной блок', () => {
  it('выключенный активным не становится — иначе выключатель ничего не значит', () => {
    const s = setActive(initialPagePluginsState, 'one');
    expect(s.activeId).toBeNull();
  });

  it('включённый показывается, и тогда основной блок можно свернуть', () => {
    let s = setEnabled(initialPagePluginsState, 'one', true);
    s = setActive(s, 'one');
    expect(s.activeId).toBe('one');
    s = setMainCollapsed(s, true);
    expect(s.mainCollapsed).toBe(true);
    s = setMainCollapsed(s, false);
    expect(s.mainCollapsed).toBe(false);
  });

  it('сворачивать нечего, пока виджета нет', () => {
    const s = setMainCollapsed(initialPagePluginsState, true);
    expect(s.mainCollapsed).toBe(false);
  });

  it('выключение активного гасит и виджет, и сворачивание — не прячем страницу под пустотой', () => {
    let s = setEnabled(initialPagePluginsState, 'one', true);
    s = setActive(s, 'one');
    s = setMainCollapsed(s, true);
    s = setEnabled(s, 'one', false);
    expect(s.activeId).toBeNull();
    expect(s.mainCollapsed).toBe(false);
  });

  it('выключение НЕактивного соседа активного не трогает', () => {
    let s = setEnabled(initialPagePluginsState, 'one', true);
    s = setEnabled(s, 'two', true);
    s = setActive(s, 'one');
    s = setMainCollapsed(s, true);
    s = setEnabled(s, 'two', false);
    expect(s.activeId).toBe('one');
    expect(s.mainCollapsed).toBe(true);
  });

  it('активный жилец находится по состоянию; исчез из списка — null, а не падение', () => {
    let s = setEnabled(initialPagePluginsState, 'one', true);
    s = setActive(s, 'one');
    expect(activePlugin(plugins, s)?.id).toBe('one');
    expect(activePlugin([plugin('two')], s)).toBeNull();
  });
});

describe('формы показа', () => {
  it('страница знает свои формы; чужая форма — не отказ, а честная заглушка', () => {
    expect(isSupportedForm('row')).toBe(true);
    expect(isSupportedForm('time-series')).toBe(true);
    // Плагин вправе объявить форму, которой страница не умеет: он остаётся зарегистрированным.
    expect(isSupportedForm('zone-map')).toBe(false);
    expect(isSupportedForm('x-radar')).toBe(false);
  });
});
