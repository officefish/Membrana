/**
 * Компоновка страницы с плагинами — блок B коворка `cowork-server-plugin-pages`.
 *
 * ОБЩЕЕ СВОЙСТВО СТРАНИЦ, А НЕ НАДСТРОЙКА НАД ЖУРНАЛОМ (Т5). Компонент не знает, чья он
 * страница: принимает основной блок детьми и список жильцов пропом. Любая страница кабинета
 * оборачивается им и получает механизм целиком.
 *
 * ПОРЯДОК НА ЭКРАНЕ несущий, а не оформительский:
 *   [ полоса над блоком (не сворачивается) ] [ правый сайдбар жильцов ]
 *   [ основной блок страницы                ] [ прилипший, не уезжает  ]
 *   [ виджеты включённых жильцов — стопкой  ]
 *
 * Виджеты живут В ЛЕВОЙ КОЛОНКЕ, а не во всю ширину страницы. Сперва я понял «во всю ширину»
 * буквально и вынес их из ряда — они прошли ПОД сайдбаром, и владелец увидел, как треки
 * наезжают на панель плагинов. «Во всю ширину» значит во всю ширину СВОЕЙ колонки.
 * Виджеты снизу, потому что они про то, что показано выше; сайдбар справа — обоснование стороны
 * в `SIDEBAR_SIDE.md`. Настройки жильца рисуются ТОЛЬКО в сайдбаре (канон §3), здесь их нет.
 *
 * ДВА ПРАВИЛА ПОЧВЫ СНЯТЫ СЛОВОМ ВЛАДЕЛЬЦА 23.08 — не сломались, а отменены.
 *
 * Первое: «показ выбирается кликом по названию». Клик назван лишним действием; теперь включённость
 * И ЕСТЬ показ, а включённых рисуем стопкой. Гнездо перестало быть единственным.
 *
 * Второе: «свернуть основной блок нельзя, пока нет виджета». Держалось на том, что сворачивать
 * имеет смысл только ради виджета; владелец хочет сворачивать список сам по себе. Кнопка живёт в
 * `mainHeader` — вне сворачиваемого, иначе исчезла бы вместе с ним.
 */
import type { ReactNode } from 'react';

import { PagePluginsSidebar } from './PagePluginsSidebar';
import {
  isSupportedForm,
  shownPlugins,
  type CabinetPagePlugin,
  type PagePluginsState,
} from './pagePlugins';

export interface PagePluginAreaProps {
  readonly plugins: readonly CabinetPagePlugin[];
  readonly state: PagePluginsState;
  readonly onToggle: (id: string, enabled: boolean) => void;
  /**
   * Полоса над основным блоком, которая НЕ сворачивается вместе с ним.
   *
   * Здесь живёт кнопка сворачивания. Положить её внутрь `children` нельзя: свёрнутый блок не
   * рисуется, и вместе с ним исчезла бы кнопка — человек свернул бы журнал и не смог развернуть.
   * Поймано разбором до прогона, а не пользователем.
   */
  readonly mainHeader?: ReactNode;
  /** Основной блок страницы — то, ради чего страница существует. */
  readonly children: ReactNode;
}

export function PagePluginArea({ plugins, state, onToggle, mainHeader, children }: PagePluginAreaProps) {
  const shown = shownPlugins(plugins, state);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/*
          Кнопка сворачивания здесь БОЛЬШЕ НЕ ЖИВЁТ: она встаёт над списком силами страницы
          (блок l2), потому что сворачивают список, а не гнездо плагинов. Область отвечает за
          гнездо и сайдбар, страница — за свой заголовок и свои органы.
        */}
        <div className="min-w-0 flex-1 space-y-4">
          {mainHeader}
          {state.mainCollapsed ? null : children}

          {/*
            СТОПКА, А НЕ ОДНО ГНЕЗДО (l1). Включённые рисуются один под другим в порядке объявления
            страницей — порядок устойчив к включениям и выключениям, потому что назначает его страница.
          */}
          {shown.map((plugin) => (
            <section
              key={plugin.id}
              className="rounded border border-base-300/60 p-3"
              aria-label={`Виджет ${plugin.name}`}
            >
              <h3 className="mb-2 text-sm font-semibold">{plugin.name}</h3>
              {isSupportedForm(plugin.form) ? (
                plugin.renderWidget()
              ) : (
                // Заглушка вместо пустоты: страница не умеет эту форму и говорит словами.
                <p className="text-sm text-base-content/60" role="status">
                  Форма «{plugin.form}» страницей не поддерживается — виджет не нарисован.
                </p>
              )}
            </section>
          ))}
        </div>

        <PagePluginsSidebar plugins={plugins} state={state} onToggle={onToggle} />
      </div>
    </div>
  );
}
