/**
 * Компоновка страницы с плагинами — блок B коворка `cowork-server-plugin-pages`.
 *
 * ОБЩЕЕ СВОЙСТВО СТРАНИЦ, А НЕ НАДСТРОЙКА НАД ЖУРНАЛОМ (Т5). Компонент не знает, чья он
 * страница: принимает основной блок детьми и список жильцов пропом. Любая страница кабинета
 * оборачивается им и получает механизм целиком.
 *
 * ПОРЯДОК НА ЭКРАНЕ несущий, а не оформительский:
 *   [ основной блок страницы  ] [ правый сайдбар жильцов ]
 *   [ виджет активного жильца — ПОД основным блоком      ]
 * Виджет снизу, потому что он про то, что показано выше; сайдбар справа — обоснование стороны
 * в `SIDEBAR_SIDE.md`. Настройки жильца рисуются ТОЛЬКО в сайдбаре (канон §3), здесь их нет.
 *
 * СВОРАЧИВАНИЕ ОСНОВНОГО БЛОКА — ради работы с виджетом: когда оператор смотрит на результат
 * жильца, лента страницы мешает. Свернуть можно, только когда виджет есть, — иначе страница
 * пряталась бы под пустотой (проверено зубом ядра).
 */
import type { ReactNode } from 'react';

import { PagePluginsSidebar } from './PagePluginsSidebar';
import {
  activePlugin,
  isSupportedForm,
  type CabinetPagePlugin,
  type PagePluginsState,
} from './pagePlugins';

export interface PagePluginAreaProps {
  readonly plugins: readonly CabinetPagePlugin[];
  readonly state: PagePluginsState;
  readonly onToggle: (id: string, enabled: boolean) => void;
  readonly onActivate: (id: string | null) => void;
  readonly onCollapseMain: (collapsed: boolean) => void;
  /** Основной блок страницы — то, ради чего страница существует. */
  readonly children: ReactNode;
}

export function PagePluginArea({
  plugins,
  state,
  onToggle,
  onActivate,
  onCollapseMain,
  children,
}: PagePluginAreaProps) {
  const active = activePlugin(plugins, state);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {active ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs mb-2"
              aria-expanded={!state.mainCollapsed}
              onClick={() => onCollapseMain(!state.mainCollapsed)}
            >
              {state.mainCollapsed ? 'Развернуть основной блок' : 'Свернуть основной блок'}
            </button>
          ) : null}
          {state.mainCollapsed ? null : children}
        </div>

        <PagePluginsSidebar
          plugins={plugins}
          state={state}
          onToggle={onToggle}
          onActivate={onActivate}
        />
      </div>

      {active ? (
        <section className="rounded border border-base-300/60 p-3" aria-label={`Виджет ${active.name}`}>
          <h3 className="mb-2 text-sm font-semibold">{active.name}</h3>
          {isSupportedForm(active.form) ? (
            active.renderWidget()
          ) : (
            // Заглушка вместо пустоты: страница не умеет эту форму и говорит об этом словами.
            <p className="text-sm text-base-content/60" role="status">
              Форма «{active.form}» страницей не поддерживается — виджет не нарисован.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
