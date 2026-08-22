/**
 * Плагины страницы кабинета — ядро механизма. Блок B коворка `cowork-server-plugin-pages`.
 *
 * МЕХАНИЗМ, А НЕ ЧАСТНЫЙ СЛУЧАЙ. Т5/Т8 шторма 22.08: правый сайдбар — свойство ВСЕХ модулей
 * кабинета, а не надстройка над журналом. Поэтому здесь нет ни слова про журнал: страница
 * объявляет свой список жильцов, ядро ничего не знает о том, чья это страница.
 *
 * ЧИСТОЕ ЯДРО ОТДЕЛЬНО ОТ REACT. Оснастка кабинета тестирует логику (`*.test.ts`), а не рендер:
 * в пакете нет testing-library. Значит решения — «кто включён», «кто активен», «свёрнут ли
 * основной блок» — живут функциями, которые проверяются без DOM, а компоненты остаются тонкими.
 *
 * ВКЛЮЧЁННОСТЬ — ОПЕРАЦИЯ РЕЕСТРА, НЕ ПОЛЕ ОПИСАНИЯ (M5′). `CabinetPagePlugin` описывает
 * жильца и поля `enabled` не несёт; включённость живёт в состоянии страницы и меняется
 * операцией. Иначе описание плагина пришлось бы править, чтобы его выключить.
 */
import type { ReactNode } from 'react';

/** Форма показа виджета. Словарь взят из `DisplayForm` контрактов, включая лазейку `x-…`. */
export type PageWidgetForm =
  | 'row'
  | 'table'
  | 'zone-map'
  | 'histogram'
  | 'time-series'
  | `x-${string}`;

/**
 * Жилец страницы. Настройки и виджет — РАЗНЫЕ вещи и рисуются в разных местах:
 * настройки в сайдбаре (канон §3), виджет под основным блоком.
 */
export interface CabinetPagePlugin {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly form: PageWidgetForm;
  /** Панель настроек. Рисуется ТОЛЬКО в сайдбаре; дублировать её в теле страницы запрещено. */
  readonly renderSettings?: () => ReactNode;
  /** Виджет. Рисуется ПОД основным блоком страницы. */
  readonly renderWidget: () => ReactNode;
}

/** Состояние плагинов страницы. Одно на страницу; чужие страницы о нём не знают. */
export interface PagePluginsState {
  /** Кто включён. Отсутствие id — выключен: реестр говорит о включённых, а не о всех. */
  readonly enabled: readonly string[];
  /** Чей виджет показан. `null` — ничей, и основной блок тогда не сворачивают. */
  readonly activeId: string | null;
  /** Свёрнут ли основной блок страницы, чтобы не мешать работе с виджетом. */
  readonly mainCollapsed: boolean;
}

export const initialPagePluginsState: PagePluginsState = {
  enabled: [],
  activeId: null,
  mainCollapsed: false,
};

export const isEnabled = (state: PagePluginsState, id: string): boolean =>
  state.enabled.includes(id);

/**
 * Включить или выключить жильца.
 *
 * Выключение активного гасит и виджет, и сворачивание: оставить основной блок свёрнутым под
 * пустым местом значило бы спрятать страницу ради того, чего уже нет.
 */
export function setEnabled(state: PagePluginsState, id: string, enabled: boolean): PagePluginsState {
  const next = enabled
    ? state.enabled.includes(id)
      ? state.enabled
      : [...state.enabled, id]
    : state.enabled.filter((x) => x !== id);
  if (!enabled && state.activeId === id) {
    return { enabled: next, activeId: null, mainCollapsed: false };
  }
  return { ...state, enabled: next };
}

/**
 * Показать виджет жильца. Выключенный активным не становится: включение — отдельная операция,
 * и «показать выключенное» означало бы, что выключатель ничего не значит.
 */
export function setActive(state: PagePluginsState, id: string | null): PagePluginsState {
  if (id === null) return { ...state, activeId: null, mainCollapsed: false };
  if (!isEnabled(state, id)) return state;
  return { ...state, activeId: id };
}

/** Свернуть или развернуть основной блок. Сворачивать нечего, пока виджета нет. */
export function setMainCollapsed(state: PagePluginsState, collapsed: boolean): PagePluginsState {
  if (collapsed && state.activeId === null) return state;
  return { ...state, mainCollapsed: collapsed };
}

/** Жильцы, которых страница реально показывает в сайдбаре: все объявленные, в порядке объявления. */
export function visiblePlugins(
  plugins: readonly CabinetPagePlugin[],
): readonly CabinetPagePlugin[] {
  return plugins;
}

/** Активный жилец целиком — или `null`, если никто не показан либо активный исчез из списка. */
export function activePlugin(
  plugins: readonly CabinetPagePlugin[],
  state: PagePluginsState,
): CabinetPagePlugin | null {
  if (state.activeId === null) return null;
  return plugins.find((p) => p.id === state.activeId) ?? null;
}

/** Формы, которые страница умеет показать. Форма вне списка — не отказ, а честная заглушка. */
export const SUPPORTED_FORMS: readonly PageWidgetForm[] = ['row', 'table', 'histogram', 'time-series'];

export function isSupportedForm(form: PageWidgetForm): boolean {
  return SUPPORTED_FORMS.includes(form);
}
